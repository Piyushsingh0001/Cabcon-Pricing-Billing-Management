import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  PricingService,
  ItemConfigMatrix,
  ItemConfigMaterial,
  ItemConfigRow,
  SaveItemConfigPayload
} from '../../../core/pricing.service';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';

export interface MaterialCategoryGroup {
  categoryName: string;
  materials: ItemConfigMaterial[];
  headerColorClass: string;
}

export interface DbMaterialItem {
  id: number;
  name: string;
  materialTypeId?: number;
  materialTypeName?: string;
  categoryName?: string;
  density?: number;
}

@Component({
  selector: 'app-item-configuration-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './item-configuration-dialog.component.html',
  styleUrls: ['./item-configuration-dialog.component.scss']
})
export class ItemConfigurationDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ItemConfigurationDialogComponent>);
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public loading = signal(false);
  public saving = signal(false);
  public searchQuery = '';
  public showAddCategoryModal = false;
  public showAddMaterialModal = false;
  public showAddRowModal = false;
  public newCategoryName = '';

  public standardCategories: string[] = [];
  public allDbMaterials: DbMaterialItem[] = [];
  public categoryAvailableMaterials: DbMaterialItem[] = [];
  public filteredCategoryMaterials: DbMaterialItem[] = [];
  public materialSearchInput = '';
  public materials: ItemConfigMaterial[] = [];
  public rows: ItemConfigRow[] = [];
  public groupedCategories: MaterialCategoryGroup[] = [];
  public availableVariants: string[] = [];

  // Temporary model for new material
  public newMaterial = {
    name: '',
    customName: '',
    categoryName: '',
    density: 0,
    isCustom: false
  };

  // Temporary model for new row
  public newRow = {
    spec: '',
    variant: '',
    categoryName: ''
  };

  ngOnInit(): void {
    this.loadMatrix();
    this.loadAllDbMaterials();
  }

  public loadAllDbMaterials(): void {
    this.pricingService.getMaterials(undefined, undefined, undefined, undefined, 1, 500).subscribe({
      next: (res) => {
        if (res && res.items) {
          const map = new Map<string, DbMaterialItem>();
          res.items.forEach(m => {
            const rawCat = (m.materialTypeName || m.categoryName || '').trim();
            if (m.name && !map.has(m.name.trim().toLowerCase())) {
              map.set(m.name.trim().toLowerCase(), {
                id: m.id,
                name: m.name.trim(),
                materialTypeId: m.materialTypeId,
                materialTypeName: rawCat,
                categoryName: rawCat,
                density: m.density || 0
              });
            }
          });
          this.allDbMaterials = Array.from(map.values());
          this.updateGroupedCategories();
        }
      }
    });
  }

  public updateGroupedCategories(): void {
    const groups: { [cat: string]: ItemConfigMaterial[] } = {};
    const catOrder: string[] = [];

    this.materials.forEach(m => {
      const cat = (m.materialTypeName || m.categoryName || '').trim();
      if (cat) {
        if (!groups[cat]) {
          groups[cat] = [];
          catOrder.push(cat);
        }
        groups[cat].push(m);
      }
    });

    this.groupedCategories = catOrder.map(catName => ({
      categoryName: catName,
      materials: groups[catName] || [],
      headerColorClass: this.getCategoryColorClass(catName)
    }));

    this.updateAvailableVariants();
  }

  public updateAvailableVariants(): void {
    const vSet = new Set<string>();
    this.rows.forEach(r => {
      if (r.variant && r.variant.trim()) {
        vSet.add(r.variant.trim());
      }
    });
    this.availableVariants = Array.from(vSet);
  }

  public loadMatrix(): void {
    this.loading.set(true);
    this.pricingService.getItemConfigMatrix().subscribe({
      next: (res: ItemConfigMatrix) => {
        this.loading.set(false);
        if (res) {
          if (res.standardCategories && res.standardCategories.length > 0) {
            this.standardCategories = res.standardCategories;
          }
          this.materials = (res.materials || []).map(m => ({
            ...m,
            categoryName: m.materialTypeName || m.categoryName
          }));
          this.rows = (res.rows || []).map(r => ({
            ...r,
            weights: r.weights || {}
          }));
        }

        this.updateGroupedCategories();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.updateGroupedCategories();
        this.cdr.detectChanges();
      }
    });
  }

  public getCategoryColorClass(catName: string): string {
    const norm = (catName || '').toLowerCase();
    if (norm.includes('conductor') || norm.includes('core')) return 'cat-core';
    if (norm.includes('insulat')) return 'cat-insulation';
    if (norm.includes('inner')) return 'cat-innersheath';
    if (norm.includes('armour') || norm.includes('armor')) return 'cat-armour';
    if (norm.includes('outer') || norm.includes('sheath') || norm.includes('shell') || norm.includes('pvc')) return 'cat-outershell';
    return 'cat-default';
  }

  public get totalColumns(): number {
    return this.materials.length + 3; // spec, variant, actions
  }

  public get filteredRows(): ItemConfigRow[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.rows;
    }
    const q = this.searchQuery.toLowerCase().trim();
    return this.rows.filter(r =>
      (r.spec && r.spec.toLowerCase().includes(q)) ||
      (r.variant && r.variant.toLowerCase().includes(q)) ||
      (r.categoryName && r.categoryName.toLowerCase().includes(q))
    );
  }

  public getWeight(row: ItemConfigRow, materialId: number): number {
    if (!row || !row.weights) return 0;
    return row.weights[materialId] || 0;
  }

  public setWeight(row: ItemConfigRow, materialId: number, value: any): void {
    if (!row) return;
    if (!row.weights) row.weights = {};
    const num = parseFloat(value);
    row.weights[materialId] = isNaN(num) || num < 0 ? 0 : num;
  }

  public getRowTotalWeight(row: ItemConfigRow): number {
    if (!row || !row.weights) return 0;
    let sum = 0;
    for (const matId of Object.keys(row.weights)) {
      sum += Number(row.weights[Number(matId)] || 0);
    }
    return sum;
  }

  // --- ADD CATEGORY ---
  public openAddCategoryModal(): void {
    this.newCategoryName = '';
    this.showAddCategoryModal = true;
  }

  public closeAddCategoryModal(): void {
    this.showAddCategoryModal = false;
  }

  public confirmAddCategory(): void {
    const cat = (this.newCategoryName || '').trim();
    if (!cat) {
      this.snackBar.open('Please enter a material type/category name.', 'Close', { duration: 2500 });
      return;
    }

    this.closeAddCategoryModal();
    this.openAddMaterialModal(cat);
  }

  // --- ADD MATERIAL (SEARCHABLE DROPDOWN PER CATEGORY) ---
  public openAddMaterialModal(categoryName?: string): void {
    const targetCategory = (categoryName || '').trim();
    
    // Filter DB materials that aren't already added to the matrix
    if (targetCategory) {
      this.categoryAvailableMaterials = this.allDbMaterials.filter(m =>
        ((m.materialTypeName || m.categoryName || '').trim().toLowerCase() === targetCategory.toLowerCase()) &&
        !this.materials.some(cur => cur.name.trim().toLowerCase() === m.name.trim().toLowerCase())
      );
    } else {
      this.categoryAvailableMaterials = this.allDbMaterials.filter(m =>
        !this.materials.some(cur => cur.name.trim().toLowerCase() === m.name.trim().toLowerCase())
      );
    }

    this.filteredCategoryMaterials = [...this.categoryAvailableMaterials];
    this.materialSearchInput = '';

    const initialDensity = this.categoryAvailableMaterials.length > 0 && this.categoryAvailableMaterials[0].density
      ? this.categoryAvailableMaterials[0].density
      : 0;

    this.newMaterial = {
      name: '',
      customName: '',
      categoryName: targetCategory,
      density: initialDensity,
      isCustom: false
    };
    this.showAddMaterialModal = true;
  }

  public filterMaterials(term: string): void {
    if (!term || !term.trim()) {
      this.filteredCategoryMaterials = [...this.categoryAvailableMaterials];
      return;
    }
    const clean = term.toLowerCase().trim();
    this.filteredCategoryMaterials = this.categoryAvailableMaterials.filter(m =>
      m.name.toLowerCase().includes(clean) ||
      ((m.materialTypeName || m.categoryName || '').toLowerCase().includes(clean))
    );
  }

  public onMaterialOptionSelected(selectedName: string): void {
    this.materialSearchInput = selectedName;
    const matched = this.categoryAvailableMaterials.find(m => m.name.toLowerCase() === selectedName.toLowerCase());
    if (matched) {
      if (matched.density) {
        this.newMaterial.density = matched.density;
      }
      if ((matched.materialTypeName || matched.categoryName) && !this.newMaterial.categoryName) {
        this.newMaterial.categoryName = matched.materialTypeName || matched.categoryName || '';
      }
    }
  }

  public closeAddMaterialModal(): void {
    this.showAddMaterialModal = false;
  }

  public confirmAddMaterial(): void {
    const finalName = (this.materialSearchInput || '').trim();

    if (!finalName) {
      this.snackBar.open('Please search and select or enter a material name.', 'Close', { duration: 2500 });
      return;
    }

    const exists = this.materials.some(m => m.name.toLowerCase() === finalName.toLowerCase());
    if (exists) {
      this.snackBar.open(`Material "${finalName}" already exists in matrix.`, 'Close', { duration: 3000 });
      return;
    }

    const matchedDbMat = this.allDbMaterials.find(m => m.name.toLowerCase() === finalName.toLowerCase());
    const finalCategory = (this.newMaterial.categoryName || matchedDbMat?.materialTypeName || matchedDbMat?.categoryName || 'Material').trim();
    const density = matchedDbMat?.density && matchedDbMat.density > 0
      ? matchedDbMat.density
      : (this.newMaterial.density || 0);

    // Assign temporary negative ID if new
    const minId = this.materials.reduce((min, m) => Math.min(min, m.id), 0);
    const tempId = matchedDbMat?.id && matchedDbMat.id > 0 ? matchedDbMat.id : (minId <= 0 ? minId - 1 : -1);

    this.materials.push({
      id: tempId,
      name: finalName,
      materialTypeId: matchedDbMat?.materialTypeId,
      materialTypeName: finalCategory,
      categoryName: finalCategory,
      density: density
    });

    this.updateGroupedCategories();
    this.closeAddMaterialModal();
    this.snackBar.open(`Added "${finalName}" under ${finalCategory}.`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  public removeMaterial(mat: ItemConfigMaterial, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.confirmDialog.open({
      title: 'Remove Material',
      message: `Remove "${mat.name}" from ${mat.materialTypeName || mat.categoryName || 'matrix'}? Correlation weights for this material will be cleared.`,
      type: 'confirm',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.materials = this.materials.filter(m => m.id !== mat.id && m.name.toLowerCase() !== mat.name.toLowerCase());
        this.rows.forEach(r => {
          if (r.weights && r.weights[mat.id] !== undefined) {
            delete r.weights[mat.id];
          }
        });
        this.updateGroupedCategories();
        this.snackBar.open(`Removed "${mat.name}". Click "Save Configuration" to persist changes.`, 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  // --- ADD SPECIFICATION / ROW ---
  public openAddRowModal(): void {
    this.updateAvailableVariants();
    this.newRow = {
      spec: '',
      variant: this.availableVariants.length > 0 ? this.availableVariants[0] : '',
      categoryName: ''
    };
    this.showAddRowModal = true;
  }

  public closeAddRowModal(): void {
    this.showAddRowModal = false;
  }

  public confirmAddRow(): void {
    if (!this.newRow.spec.trim()) {
      this.snackBar.open('Please enter specification name.', 'Close', { duration: 2500 });
      return;
    }

    const trimmedSpec = this.newRow.spec.trim();
    const trimmedVariant = this.newRow.variant.trim();

    const newRowObj: ItemConfigRow = {
      skuId: null,
      spec: trimmedSpec,
      variant: trimmedVariant,
      categoryId: 3,
      categoryName: this.newRow.categoryName || '',
      weights: {}
    };

    this.rows.push(newRowObj);
    this.updateAvailableVariants();

    this.closeAddRowModal();
    this.snackBar.open(`Added specification "${trimmedSpec}" (${trimmedVariant}).`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  public deleteRow(index: number): void {
    const target = this.rows[index];
    if (!target) return;

    this.confirmDialog.open({
      title: 'Delete Row',
      message: `Remove "${target.spec}" (${target.variant}) from matrix?`,
      type: 'confirm',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.rows.splice(index, 1);
        this.updateAvailableVariants();
        this.snackBar.open('Row removed.', 'Close', { duration: 2000 });
        this.cdr.detectChanges();
      }
    });
  }

  // --- SAVE CONFIGURATION TO DATABASE ---
  public saveConfiguration(): void {
    if (this.rows.length === 0) {
      this.snackBar.open('Cannot save empty matrix.', 'Close', { duration: 2500 });
      return;
    }

    this.saving.set(true);

    const payload: SaveItemConfigPayload = {
      materials: this.materials.map(m => ({
        id: m.id > 0 ? m.id : null,
        name: m.name,
        materialTypeId: m.materialTypeId,
        materialTypeName: m.materialTypeName || m.categoryName,
        categoryName: m.materialTypeName || m.categoryName,
        density: Number(m.density) || 0
      })),
      rows: this.rows.map(r => ({
        skuId: r.skuId,
        spec: r.spec,
        variant: r.variant,
        categoryId: r.categoryId || 3,
        weights: r.weights || {}
      }))
    };

    this.pricingService.saveItemConfigMatrix(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Specification and Variant Weight Matrix saved successfully to database!', 'Close', { duration: 3500 });
        this.pricingService.refreshSkus.next();
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.snackBar.open(`Failed to save configuration: ${err.error?.message || 'Database error.'}`, 'Close', { duration: 5000 });
        this.cdr.detectChanges();
      }
    });
  }

  public close(): void {
    this.dialogRef.close();
  }
}
