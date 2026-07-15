import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { PricingService, Sku, Category, Material } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';
import { SkuEditDialogComponent } from './sku-edit-dialog/sku-edit-dialog.component';
import { CategoryManageDialogComponent } from './category-manage-dialog/category-manage-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-skus',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './skus.component.html',
  styleUrls: ['./skus.component.scss']
})
export class SkusComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public skus: Sku[] = [];
  public categories = signal<Category[]>([]);
  public materials: Material[] = [];
  public totalCount = 0;
  public loading = signal(false);
  public searchQuery = '';

  // Inline editing state
  public editingSkuId: number | null = null;
  public editingSku: any = null; // SkuDetails formatted for inline inputs
  public localSelections: { [key: number]: boolean } = {};
  public groupedSkusList: { categoryName: string, products: { productName: string, items: Sku[] }[] }[] = [];
  public collapsedCategories = new Set<string>();

  public get totalSelections(): number {
    return Object.values(this.localSelections).filter(Boolean).length;
  }

  ngOnInit() {
    this.loadCategories();
    this.loadMaterials();
    this.loadSkus();
    this.pricingService.refreshSkus.subscribe(() => {
      this.loadSkus();
    });
  }

  public toggleCategoryCollapse(categoryName: string) {
    if (this.collapsedCategories.has(categoryName)) {
      this.collapsedCategories.delete(categoryName);
    } else {
      this.collapsedCategories.add(categoryName);
    }
  }

  public isCategoryCollapsed(categoryName: string): boolean {
    return this.collapsedCategories.has(categoryName);
  }

  public deleteCategoryByName(categoryName: string) {
    const cat = this.categories().find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (cat) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '450px',
        data: {
          title: 'Delete Category',
          message: `Are you sure you want to delete category "${cat.name}" and all its products? This action cannot be undone.`,
          type: 'confirm',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.loading.set(true);
          this.pricingService.deleteCategory(cat.id).subscribe({
            next: () => {
              this.loading.set(false);
              this.snackBar.open('Category deleted successfully.', 'Close', { duration: 3000 });
              this.loadSkus();
            },
            error: (err: any) => {
              this.loading.set(false);
              this.snackBar.open(`Failed to delete category: ${err.error?.message || 'Error occurred.'}`, 'Close', { duration: 5000 });
            }
          });
        }
      });
    }
  }

  public canCreate(): boolean {
    return this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  }

  public canUpdate(): boolean {
    return this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  }

  public canDelete(): boolean {
    return this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  }

  private loadCategories() {
    this.pricingService.getCategories().subscribe({
      next: (res) => this.categories.set(res)
    });
  }

  private loadMaterials() {
    this.pricingService.getMaterials(undefined, undefined, 'name', false, 1, 100).subscribe({
      next: (res) => this.materials = res.items
    });
  }

  public loadSkus() {
    this.loadCategories();
    this.loading.set(true);
    this.pricingService.getSkus(
      this.searchQuery || undefined,
      undefined,
      'categoryName',
      false,
      1,
      100
    ).subscribe({
      next: (res) => {
        this.skus = res.items;
        this.totalCount = res.totalCount;
        this.groupSkus();
        
        // Sync selections from service
        this.skus.forEach(s => {
          if (this.pricingService.selectedSkuIds.has(s.id)) {
            this.localSelections[s.id] = true;
          }
        });

        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to load SKUs.', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  private groupSkus() {
    const groups: { [key: string]: { [name: string]: Sku[] } } = {};
    this.skus.forEach(sku => {
      const cat = sku.categoryName || 'Uncategorized';
      const name = sku.name || 'Unnamed Product';
      
      if (!groups[cat]) {
        groups[cat] = {};
      }
      if (!groups[cat][name]) {
        groups[cat][name] = [];
      }
      groups[cat][name].push(sku);
    });
    
    this.groupedSkusList = Object.keys(groups).map(categoryName => {
      const productNames = Object.keys(groups[categoryName]);
      const products = productNames.map(productName => ({
        productName,
        items: groups[categoryName][productName]
      }));
      return { categoryName, products };
    });
  }

  public addSku(categoryName?: string, productName?: string) {
    const defaultData = {
      categoryName: categoryName || 'New category',
      name: productName || 'Item',
      spec: 'spec',
      unit: 'km',
      conversionType: 0, // % of RM
      conversionValue: 0.08, // 8%
      gstRate: 0.18, // 18%
      isAddSpec: !!productName,
      isGlobalAdd: !categoryName
    };

    const dialogRef = this.dialog.open(SkuEditDialogComponent, {
      width: '950px',
      data: defaultData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSkus();
      }
    });
  }

  public manageCategories() {
    const dialogRef = this.dialog.open(CategoryManageDialogComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadCategories();
    });
  }

  public editSkuInline(sku: Sku) {
    this.loading.set(true);
    this.pricingService.getSku(sku.id).subscribe({
      next: (fullSku) => {
        this.loading.set(false);
        const dialogRef = this.dialog.open(SkuEditDialogComponent, {
          width: '950px',
          data: fullSku
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadSkus();
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to fetch SKU details.', 'Close', { duration: 3000 });
      }
    });
  }

  public deleteSku(skuId: number, name: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Product Spec',
        message: `Are you sure you want to delete product "${name}"? This action cannot be undone.`,
        type: 'confirm',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.pricingService.deleteSku(skuId).subscribe({
          next: () => {
            this.snackBar.open('Product deleted successfully.', 'Close', { duration: 3000 });
            this.editingSkuId = null;
            this.editingSku = null;
            this.loadSkus();
          },
          error: () => {
            this.snackBar.open('Failed to delete SKU.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public getBomSummary(sku: Sku): string {
    if (!sku.bomLines || sku.bomLines.length === 0) return 'No BOM';
    return sku.bomLines.map(line => {
      const namePart = line.materialName ? line.materialName.split(' ')[0] : 'Material';
      return `${namePart} ${line.weightKg}`;
    }).join(' · ');
  }

  public getLandedCost(materialId: number): number {
    const mat = this.materials.find(m => m.id === materialId);
    if (!mat) return 0;
    if (mat.type === 0) {
      const lme = Number(mat.lmeUsdPerMt || 0);
      const premium = Number(mat.premiumUsdPerMt || 0);
      const fx = Number(mat.fxRate || 0);
      const freight = Number(mat.freightInrPerMt || 0);
      return ((lme + premium) * fx + freight) / 1000;
    } else {
      return Number(mat.directRateInrPerKg || 0);
    }
  }

  public onSelectionChange(skuId: number) {
    if (this.localSelections[skuId]) {
      this.pricingService.selectedSkuIds.add(skuId);
    } else {
      this.pricingService.selectedSkuIds.delete(skuId);
    }
  }

  public toggleSelectAll(categoryName: string) {
    const categorySkus = this.skus.filter(s => s.categoryName === categoryName);
    const allSelected = categorySkus.every(s => this.localSelections[s.id]);
    categorySkus.forEach(s => {
      this.localSelections[s.id] = !allSelected;
      if (!allSelected) {
        this.pricingService.selectedSkuIds.add(s.id);
      } else {
        this.pricingService.selectedSkuIds.delete(s.id);
      }
    });
  }

  public onSearchChange() {
    this.loadSkus();
  }
}

