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
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

export interface MaterialCategoryGroup {
  categoryName: string;
  materials: ItemConfigMaterial[];
  headerColorClass: string;
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
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public loading = signal(false);
  public saving = signal(false);
  public searchQuery = '';
  public showAddMaterialModal = false;
  public showAddRowModal = false;

  // Standard material categories (dynamic base)
  public standardCategories: string[] = [
    'Core Material',
    'Insulation Material',
    'Inner Sheath',
    'Armour Wire',
    'PVC Outer Sheath'
  ];

  public allDbMaterials: { id: number; name: string; categoryName?: string; density?: number }[] = [];
  public categoryAvailableMaterials: { id: number; name: string; categoryName?: string; density?: number }[] = [];
  public filteredCategoryMaterials: { id: number; name: string; categoryName?: string; density?: number }[] = [];
  public materialSearchInput = '';
  public materials: ItemConfigMaterial[] = [];
  public rows: ItemConfigRow[] = [];
  public groupedCategories: MaterialCategoryGroup[] = [];
  public availableVariants: string[] = ['2XWY', '2XFY', 'A2XFY'];

  // Temporary model for new material
  public newMaterial = {
    name: '',
    customName: '',
    categoryName: 'Core Material',
    density: 1.0,
    isCustom: false
  };

  // Temporary model for new row
  public newRow = {
    spec: '',
    variant: '2XWY',
    categoryName: 'LT Cable'
  };

  ngOnInit(): void {
    this.initDefaultMaterials();
    this.initDefaultRows();
    this.updateGroupedCategories();
    this.loadMatrix();
    this.loadAllDbMaterials();
  }

  public loadAllDbMaterials(): void {
    this.pricingService.getMaterials(undefined, undefined, undefined, undefined, 1, 500).subscribe({
      next: (res) => {
        if (res && res.items) {
          const map = new Map<string, { id: number; name: string; categoryName?: string; density?: number }>();
          res.items.forEach(m => {
            const rawCat = (m.categoryName || '').trim();
            const normalizedCat = rawCat.toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : (rawCat || 'Core Material');
            if (m.name && !map.has(m.name.trim().toLowerCase())) {
              map.set(m.name.trim().toLowerCase(), {
                id: m.id,
                name: m.name.trim(),
                categoryName: normalizedCat,
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
    // Collect all dynamic categories
    const catSet = new Set<string>();

    this.standardCategories.forEach(c => {
      if (c && c.trim()) {
        const norm = c.trim().toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : c.trim();
        catSet.add(norm);
      }
    });

    this.materials.forEach(m => {
      if (m.categoryName && m.categoryName.trim()) {
        const norm = m.categoryName.trim().toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : m.categoryName.trim();
        m.categoryName = norm;
        catSet.add(norm);
      }
    });

    this.allDbMaterials.forEach(m => {
      if (m.categoryName && m.categoryName.trim()) {
        const norm = m.categoryName.trim().toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : m.categoryName.trim();
        catSet.add(norm);
      }
    });

    const orderMap: { [cat: string]: number } = {
      'core material': 1,
      'insulation material': 2,
      'inner sheath': 3,
      'armour wire': 4,
      'pvc outer sheath': 5
    };

    const dynamicCategories = Array.from(catSet);
    dynamicCategories.sort((a, b) => {
      const rankA = orderMap[a.toLowerCase()] ?? 99;
      const rankB = orderMap[b.toLowerCase()] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    });

    this.standardCategories = dynamicCategories;

    const groups: { [cat: string]: ItemConfigMaterial[] } = {};
    dynamicCategories.forEach(cat => {
      groups[cat] = [];
    });

    this.materials.forEach(m => {
      const cat = m.categoryName?.trim() || 'Core Material';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(m);
    });

    this.groupedCategories = dynamicCategories.map(catName => ({
      categoryName: catName,
      materials: groups[catName] || [],
      headerColorClass: this.getCategoryColorClass(catName)
    }));
  }

  public loadMatrix(): void {
    this.loading.set(true);
    this.pricingService.getItemConfigMatrix().subscribe({
      next: (res: ItemConfigMatrix) => {
        this.loading.set(false);
        if (res && res.materials && res.materials.length > 0) {
          if (res.standardCategories && res.standardCategories.length > 0) {
            this.standardCategories = res.standardCategories;
          }
          this.materials = res.materials;
          if (res.rows && res.rows.length > 0) {
            this.rows = res.rows.map(r => ({
              ...r,
              weights: r.weights || {}
            }));
          }
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

  private initDefaultRows(): void {
    const sampleData = [
      { spec: '2 C X 4 sq.mm.', variant: '2XWY', cu: 68, xlpe: 24, ish: 51, gs: 253, osh: 96 },
      { spec: '2 C X 2.5 sq.mm.', variant: '2XWY', cu: 44, xlpe: 15, ish: 44, gs: 210, osh: 83 },
      { spec: '3 C X 2.5 sq.mm.', variant: '2XWY', cu: 65, xlpe: 23, ish: 21, gs: 226, osh: 86 },
      { spec: '4 C X 2.5 sq.mm.', variant: '2XWY', cu: 87, xlpe: 30, ish: 23, gs: 251, osh: 92 },
      { spec: '4 C X 6 sq.mm.', variant: '2XWY', cu: 202, xlpe: 54, ish: 32, gs: 332, osh: 133 },
      { spec: '7 C X 2.5 sq.mm.', variant: '2XWY', cu: 152, xlpe: 53, ish: 29, gs: 304, osh: 104 },
      { spec: '12 C X 2.5 sq.mm.', variant: '2XFY', cu: 261, xlpe: 90, ish: 38, gs: 236, osh: 142 },
      { spec: '19 C X 2.5 sq.mm.', variant: '2XFY', cu: 414, xlpe: 143, ish: 44, gs: 281, osh: 166 },
      { spec: '4 C X 16 sq.mm.', variant: '2XFY', cu: 533, xlpe: 76, ish: 42, gs: 317, osh: 157 },
      { spec: '3.5 C X 70 sq.mm.', variant: 'A2XFY', al: 623, xlpe: 145, ish: 78, gs: 491, osh: 271 },
      { spec: '3.5 C X 300 sq.mm.', variant: 'A2XFY', al: 2670, xlpe: 447, ish: 195, gs: 907, osh: 693 }
    ];

    if (this.materials.length === 0) {
      this.initDefaultMaterials();
    }

    const matMap: { [name: string]: number } = {};
    this.materials.forEach(m => {
      matMap[m.name] = m.id;
    });

    this.rows = sampleData.map(s => {
      const weights: { [key: number]: number } = {};
      if (s.al && matMap['AL'] !== undefined) weights[matMap['AL']] = s.al;
      if (s.cu && matMap['CU'] !== undefined) weights[matMap['CU']] = s.cu;
      if (s.xlpe && matMap['LT XLPE'] !== undefined) weights[matMap['LT XLPE']] = s.xlpe;
      if (s.ish && matMap['PVC-ST-2 (I/SH)'] !== undefined) weights[matMap['PVC-ST-2 (I/SH)']] = s.ish;
      if (s.gs && matMap['G.S. ARMOUR'] !== undefined) weights[matMap['G.S. ARMOUR']] = s.gs;
      if (s.osh && matMap['PVC-ST-2 FRLSH (O/SH)'] !== undefined) weights[matMap['PVC-ST-2 FRLSH (O/SH)']] = s.osh;

      return {
        skuId: null,
        spec: s.spec,
        variant: s.variant,
        categoryId: 3,
        categoryName: 'LT Cable',
        weights
      };
    });
  }

  public getCategoryColorClass(catName: string): string {
    const norm = (catName || '').toLowerCase();
    if (norm.includes('core')) return 'cat-core';
    if (norm.includes('insulation')) return 'cat-insulation';
    if (norm.includes('inner')) return 'cat-innersheath';
    if (norm.includes('armour') || norm.includes('armor')) return 'cat-armour';
    if (norm.includes('outer') || norm.includes('sheath') || norm.includes('shell') || norm.includes('pvc')) return 'cat-outershell';
    return 'cat-default';
  }

  private initDefaultMaterials(): void {
    const defaultList = [
      { id: -1, name: 'AL', categoryName: 'Core Material', density: 2.703 },
      { id: -2, name: 'CU', categoryName: 'Core Material', density: 8.89 },
      { id: -3, name: 'LT XLPE', categoryName: 'Insulation Material', density: 0.92 },
      { id: -4, name: 'PVC-A(INS)', categoryName: 'Insulation Material', density: 1.40 },
      { id: -5, name: 'PVC-C(INS)', categoryName: 'Insulation Material', density: 1.42 },
      { id: -6, name: 'PVC-ST-2 (I/SH)', categoryName: 'Inner Sheath', density: 1.45 },
      { id: -7, name: 'PVC-FRLSH(I/SH)', categoryName: 'Inner Sheath', density: 1.48 },
      { id: -8, name: 'AL ARMOUR', categoryName: 'Armour Wire', density: 2.703 },
      { id: -9, name: 'G.S. ARMOUR', categoryName: 'Armour Wire', density: 7.85 },
      { id: -10, name: 'PVC-ST-2 FRLSH (O/SH)', categoryName: 'PVC Outer Sheath', density: 1.45 }
    ];
    this.materials = defaultList;
  }

  public get totalColumns(): number {
    const matCols = this.groupedCategories.reduce((acc, g) => acc + (g.materials.length > 0 ? g.materials.length : 1), 0);
    return matCols + 3; // spec, variant, actions (total column removed)
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

  // --- ADD MATERIAL (SEARCHABLE DROPDOWN PER CATEGORY) ---
  public openAddMaterialModal(categoryName: string): void {
    const targetCategory = categoryName || 'Core Material';
    
    // Filter DB materials matching this specific category that aren't already added to the matrix
    this.categoryAvailableMaterials = this.allDbMaterials.filter(m =>
      (m.categoryName || '').trim().toLowerCase() === targetCategory.trim().toLowerCase() &&
      !this.materials.some(cur => cur.name.trim().toLowerCase() === m.name.trim().toLowerCase())
    );

    this.filteredCategoryMaterials = [...this.categoryAvailableMaterials];
    this.materialSearchInput = '';

    const initialDensity = this.categoryAvailableMaterials.length > 0 && this.categoryAvailableMaterials[0].density
      ? this.categoryAvailableMaterials[0].density
      : this.getDefaultDensityForCategory(targetCategory);

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
      m.name.toLowerCase().includes(clean)
    );
  }

  public onMaterialOptionSelected(selectedName: string): void {
    this.materialSearchInput = selectedName;
    const matched = this.categoryAvailableMaterials.find(m => m.name.toLowerCase() === selectedName.toLowerCase());
    if (matched && matched.density) {
      this.newMaterial.density = matched.density;
    }
  }

  public getDefaultDensityForCategory(categoryName: string): number {
    const norm = (categoryName || '').toLowerCase();
    if (norm.includes('core')) return 8.89;
    if (norm.includes('insulation')) return 0.92;
    if (norm.includes('inner')) return 1.45;
    if (norm.includes('armour') || norm.includes('armor')) return 7.85;
    if (norm.includes('outer') || norm.includes('sheath') || norm.includes('shell') || norm.includes('pvc')) return 1.45;
    return 1.0;
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
    const density = matchedDbMat?.density && matchedDbMat.density > 0
      ? matchedDbMat.density
      : this.getDefaultDensityForCategory(this.newMaterial.categoryName);

    // Assign temporary negative ID if new
    const minId = this.materials.reduce((min, m) => Math.min(min, m.id), 0);
    const tempId = matchedDbMat?.id && matchedDbMat.id > 0 ? matchedDbMat.id : (minId <= 0 ? minId - 1 : -1);

    this.materials.push({
      id: tempId,
      name: finalName,
      categoryName: this.newMaterial.categoryName,
      density: density
    });

    this.updateGroupedCategories();
    this.closeAddMaterialModal();
    this.snackBar.open(`Added "${finalName}" to ${this.newMaterial.categoryName}.`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  // --- ADD SPECIFICATION / ROW ---
  public openAddRowModal(): void {
    this.newRow = {
      spec: '',
      variant: this.availableVariants[0] || '2XWY',
      categoryName: 'LT Cable'
    };
    this.showAddRowModal = true;
  }

  public closeAddRowModal(): void {
    this.showAddRowModal = false;
  }

  public confirmAddRow(): void {
    if (!this.newRow.spec.trim()) {
      this.snackBar.open('Please enter specification name (e.g. "3 C X 4 sq.mm.").', 'Close', { duration: 2500 });
      return;
    }

    const trimmedSpec = this.newRow.spec.trim();
    const trimmedVariant = this.newRow.variant.trim();

    const newRowObj: ItemConfigRow = {
      skuId: null,
      spec: trimmedSpec,
      variant: trimmedVariant,
      categoryId: 3,
      categoryName: this.newRow.categoryName || 'LT Cable',
      weights: {}
    };

    // Auto calculate initial weights for this row
    this.autoCalculateRowWeight(newRowObj);

    this.rows.push(newRowObj);

    this.closeAddRowModal();
    this.snackBar.open(`Added specification "${trimmedSpec}" (${trimmedVariant}).`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  public deleteRow(index: number): void {
    const target = this.rows[index];
    if (!target) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '95vw', maxWidth: '420px',
      data: {
        title: 'Delete Row',
        message: `Remove "${target.spec}" (${target.variant}) from matrix?`,
        type: 'confirm',
        confirmText: 'Remove',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.rows.splice(index, 1);
        this.snackBar.open('Row removed.', 'Close', { duration: 2000 });
        this.cdr.detectChanges();
      }
    });
  }

  // --- AREA & DENSITY AUTO-CALCULATION CONCEPT ---
  public parseSpecification(specStr: string): { cores: number; areaPerCore: number; totalConductorArea: number } | null {
    if (!specStr) return null;
    const clean = specStr.toLowerCase().replace(/,/g, '.');
    const regex = /([0-9]+(?:\.[0-9]+)?)\s*(?:c|core|cores)?\s*[xX*]\s*([0-9]+(?:\.[0-9]+)?)/;
    const match = clean.match(regex);
    if (match) {
      const cores = parseFloat(match[1]);
      const areaPerCore = parseFloat(match[2]);
      if (!isNaN(cores) && !isNaN(areaPerCore)) {
        return {
          cores,
          areaPerCore,
          totalConductorArea: cores * areaPerCore
        };
      }
    }

    const singleRegex = /([0-9]+(?:\.[0-9]+)?)\s*(?:sq\.?mm|sqmm)/;
    const singleMatch = clean.match(singleRegex);
    if (singleMatch) {
      const area = parseFloat(singleMatch[1]);
      if (!isNaN(area)) {
        return { cores: 1, areaPerCore: area, totalConductorArea: area };
      }
    }

    return null;
  }

  public autoCalculateRowWeight(row: ItemConfigRow): void {
    if (!row || !row.spec) return;
    if (!row.weights) row.weights = {};

    const parsed = this.parseSpecification(row.spec);
    if (!parsed) return;

    const totalArea = parsed.totalConductorArea;
    const isAluminium = (row.variant && row.variant.toUpperCase().startsWith('A')) || row.spec.toUpperCase().includes('AL');

    const cuMat = this.materials.find(m => m.name.toUpperCase() === 'CU');
    const alMat = this.materials.find(m => m.name.toUpperCase() === 'AL');
    const xlpeMat = this.materials.find(m => m.name.toUpperCase().includes('XLPE'));
    const ishMat = this.materials.find(m => m.categoryName === 'Inner Sheath');
    const armourMat = this.materials.find(m => m.categoryName === 'Armour Wire' && (isAluminium ? m.name.includes('AL') || m.name.includes('G.S.') : m.name.includes('G.S.') || m.name.includes('ARMOUR')));
    const oshMat = this.materials.find(m => m.categoryName === 'PVC Outer Sheath' || m.categoryName === 'PVC Outer Shell' || (m.categoryName || '').toLowerCase().includes('outer'));

    // 1. Core Conductor Weight = TotalArea (mm²) * Density (g/cm³) * 1.02
    if (isAluminium && alMat) {
      const density = alMat.density || 2.703;
      row.weights[alMat.id] = Math.round(totalArea * density * 1.02);
      if (cuMat) row.weights[cuMat.id] = 0;
    } else if (cuMat) {
      const density = cuMat.density || 8.89;
      row.weights[cuMat.id] = Math.round(totalArea * density * 1.02);
      if (alMat) row.weights[alMat.id] = 0;
    }

    // 2. Insulation Weight
    if (xlpeMat) {
      const density = xlpeMat.density || 0.92;
      const insWeight = Math.round(totalArea * density * 0.42 + (parsed.cores * 3.5));
      row.weights[xlpeMat.id] = Math.max(12, insWeight);
    }

    // 3. Inner Sheath Weight
    if (ishMat) {
      const density = ishMat.density || 1.45;
      const ishWeight = Math.round(Math.sqrt(totalArea) * 6.5 * density);
      row.weights[ishMat.id] = Math.max(20, ishWeight);
    }

    // 4. Armour Weight
    if (armourMat) {
      const density = armourMat.density || 7.85;
      const armWeight = Math.round(Math.sqrt(totalArea) * 28.5 * (density / 7.85));
      row.weights[armourMat.id] = Math.max(80, armWeight);
    }

    // 5. Outer Shell Weight
    if (oshMat) {
      const density = oshMat.density || 1.45;
      const oshWeight = Math.round(Math.sqrt(totalArea) * 16.5 * density);
      row.weights[oshMat.id] = Math.max(45, oshWeight);
    }
  }

  public autoCalculateAll(): void {
    this.rows.forEach(r => this.autoCalculateRowWeight(r));
    this.snackBar.open('Auto-calculated weights for all rows based on Area & Density.', 'Close', { duration: 2500 });
    this.cdr.detectChanges();
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
        categoryName: m.categoryName,
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
        this.snackBar.open('Item configuration saved successfully to database!', 'Close', { duration: 3500 });
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
