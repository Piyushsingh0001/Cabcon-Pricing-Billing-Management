import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, Sku, Category, Material } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { SkusComponent } from '../skus.component';
import { CategoryManageDialogComponent } from '../category-manage-dialog/category-manage-dialog.component';



import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-sku-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './sku-edit-dialog.component.html',
  styleUrls: ['./sku-edit-dialog.component.scss']
})
export class SkuEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  public loading = signal(false);

  public form: FormGroup;
  public categories: Category[] = [];
  public materials: Material[] = [];

  constructor(
    public dialogRef: MatDialogRef<SkuEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public sku: any // SkuDetails
  ) {
    const isGstPct = sku ? Math.round(sku.gstRate * 100) : 18;
    const isMfgDisplay = sku
      ? (sku.conversionType === 0 ? sku.conversionValue * 100 : sku.conversionValue)
      : 8;

    this.form = this.fb.group({
      categoryName: [{value: sku?.categoryName || 'New category', disabled: !sku?.isGlobalAdd}, Validators.required],
      name: [{value: sku?.name || '', disabled: sku?.isAddSpec}, Validators.required],
      spec: [sku?.spec || '', Validators.required],
      unit: [sku?.unit || 'coil', Validators.required],
      conversionType: [sku?.conversionType || 0, Validators.required],
      conversionValue: [isMfgDisplay, [Validators.required, Validators.min(0)]],
      gstPercent: [isGstPct, [Validators.required, Validators.min(0)]],
      bomLines: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.loadDropdowns();
  }

  public get bomLines() {
    return this.form.get('bomLines') as FormArray;
  }

  public existingSkus: Sku[] = [];
  public errorMessage = signal<string | null>(null);
  public nameExistsError = false;

  private loadDropdowns() {
    this.pricingService.getCategories().subscribe(res => this.categories = res);
    this.pricingService.getSkus(undefined, undefined, undefined, false, 1, 1000).subscribe(res => {
      this.existingSkus = res.items;
      if (this.sku) {
        this.checkUniqueness();
      }
    });
    this.pricingService.getMaterials(undefined, undefined, undefined, false, 1, 100).subscribe(res => {
      this.materials = res.items;

      // Populate form lines if editing
      if (this.sku && this.sku.bomLines) {
        this.sku.bomLines.forEach((line: any) => {
          const mat = this.materials.find(m => m.id === line.materialId);
          this.bomLines.push(this.fb.group({
            materialName: [mat ? mat.name : '', Validators.required],
            vendorName: [{value: mat ? (mat.vendorName || 'Default') : '', disabled: !mat}, Validators.required],
            materialId: [line.materialId, Validators.required],
            weightKg: [line.weightKg ?? 1, [Validators.required, Validators.min(0.0001)]],
            priceType: [line.priceType ?? (mat ? mat.type : 0), Validators.required],
            pricingMethod: [line.pricingMethod ?? 1, Validators.required],
            pricingMonth: [line.pricingMonth ?? 0],
            manualPrice: [line.manualPrice ?? 0]
          }));
        });
      } else {
        this.addBomLine();
      }
      this.cdr.detectChanges();
    });
  }

  public get uniqueMaterialNames(): string[] {
    return Array.from(new Set(this.materials.map(m => m.name)));
  }

  public addBomLine() {
    this.bomLines.push(this.fb.group({
      materialName: ['', Validators.required],
      vendorName: [{value: '', disabled: true}, Validators.required],
      materialId: [null, Validators.required],
      weightKg: [1, [Validators.required, Validators.min(0.0001)]],
      priceType: [0, Validators.required],
      pricingMethod: [1, Validators.required],
      pricingMonth: [0],
      manualPrice: [0]
    }));
    this.cdr.detectChanges();
  }

  public removeBomLine(idx: number) {
    this.bomLines.removeAt(idx);
    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public getLandedCost(materialId: any, priceType?: any): number {
    if (!materialId) return 0;
    const mat = this.materials.find(m => m.id === Number(materialId));
    if (!mat) return 0;
    
    const typeToUse = priceType !== undefined && priceType !== null && priceType !== '' ? Number(priceType) : mat.type;

    if (typeToUse === 0) {
      const lme = Number(mat.lmeUsdPerMt || 0);
      const premium = Number(mat.premiumUsdPerMt || 0);
      const fx = Number(mat.fxRate || 0);
      const freight = Number(mat.freightInrPerMt || 0);
      return ((lme + premium) * fx + freight) / 1000;
    } else {
      return Number(mat.directRateInrPerKg || 0);
    }
  }

  public getCalculatedBomLineCost(idx: number): number {
    const line = this.bomLines.at(idx);
    if (!line) return 0;
    const matId = line.get('materialId')?.value;
    if (!matId) return 0;
    
    const weightKg = Number(line.get('weightKg')?.value || 0);

    const method = Number(line.get('pricingMethod')?.value);
    const pType = Number(line.get('priceType')?.value);
    let unitPrice = 0;

    if (method === 1) { // Actual
      unitPrice = this.getLandedCost(matId, pType);
    } else {
      // For Manual or Average, use the manualPrice field
      unitPrice = Number(line.get('manualPrice')?.value || 0);
    }

    return unitPrice * weightKg;
  }

  public onPricingMethodChange(idx: number) {
    const line = this.bomLines.at(idx);
    const method = Number(line.get('pricingMethod')?.value);
    
    if (method === 0) { // Average
      this.calculateAveragePrice(idx);
    }
    this.cdr.detectChanges();
  }

  public calculateAveragePrice(idx: number) {
    const line = this.bomLines.at(idx);
    const matId = line.get('materialId')?.value;
    const pType = Number(line.get('priceType')?.value || 0);
    const pMonth = Number(line.get('pricingMonth')?.value || 0);
    
    if (!matId) return;

    // Call service to get history/missing dates
    // For now, we will fetch average from the pricing service or calculate it
    // Wait, we need to get average from backend.
    this.pricingService.getMissingDates(matId, pType).subscribe(res => {
      this.pricingService.getMaterials(undefined, pType, undefined, false, 1, 1000).subscribe(mats => {
        const mat = mats.items.find(m => m.id === matId);
        if (mat) {
          let avg = 0;
          if (pType === 0) {
            avg = pMonth === 0 ? (mat.thisMonthAvgLme || 0) : (mat.prevMonthAvgLme || 0);
          } else {
            avg = pMonth === 0 ? (mat.thisMonthAvgDirect || 0) : (mat.prevMonthAvgDirect || 0);
          }
          line.patchValue({ manualPrice: avg });
          this.cdr.detectChanges();
        }
      });
    });
  }

  public getAvailableVendors(idx: number): string[] {
    const line = this.bomLines.at(idx);
    const matName = line.get('materialName')?.value;
    if (!matName) return [];
    const vendors = this.materials
      .filter(m => m.name === matName)
      .map(m => m.vendorName || 'Default');
    return Array.from(new Set(vendors));
  }

  public onMaterialNameChange(idx: number) {
    const line = this.bomLines.at(idx);
    const vendorCtrl = line.get('vendorName');
    
    line.patchValue({ vendorName: '', materialId: null });
    
    if (line.get('materialName')?.value) {
      vendorCtrl?.enable();
    } else {
      vendorCtrl?.disable();
    }
    
    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public onVendorNameChange(idx: number) {
    const line = this.bomLines.at(idx);
    const matName = line.get('materialName')?.value;
    const vendName = line.get('vendorName')?.value;
    if (matName && vendName) {
      const mat = this.materials.find(m => m.name === matName && (m.vendorName || 'Default') === vendName);
      if (mat) {
        line.patchValue({ materialId: mat.id });
        this.onPricingMethodChange(idx);
      } else {
        line.patchValue({ materialId: null });
      }
    }
    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public checkUniqueness() {
    const formVal = this.form.value;
    const catName = (formVal.categoryName || '').trim().toLowerCase();
    const prodName = (formVal.name || '').trim().toLowerCase();
    const spec = (formVal.spec || '').trim().toLowerCase();
    const unit = (formVal.unit || '').trim().toLowerCase();

    // 1. (Removed categoryDuplicateError because using an existing category is perfectly valid)

    // 2. Check if Product Name + Spec + Unit combination already exists in that category
    if (!catName || !prodName || !spec) {
      this.nameExistsError = false;
      return;
    }

    const match = this.existingSkus.find(s =>
      s.categoryName?.trim().toLowerCase() === catName &&
      s.name?.trim().toLowerCase() === prodName &&
      s.spec?.trim().toLowerCase() === spec &&
      s.unit?.trim().toLowerCase() === unit &&
      (!this.sku || !this.sku.id || s.id !== this.sku.id)
    );

    this.nameExistsError = !!match;
  }

  public deleteProduct() {
    if (!this.sku) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '95vw', maxWidth: '450px',
      data: {
        title: 'Delete Product',
        message: `Are you sure you want to delete product "${this.sku.name}"? This action cannot be undone.`,
        type: 'confirm',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.loading.set(true);
        this.errorMessage.set(null);
        this.pricingService.deleteSku(this.sku.id).subscribe({
          next: () => {
            this.loading.set(false);
            this.snackBar.open('Product removed successfully.', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            this.loading.set(false);
            const msg = `Failed to delete product: ${err.error?.message || 'Error occurred.'}`;
            this.errorMessage.set(msg);
            this.snackBar.open(msg, 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public onCancel() {
    this.dialogRef.close(false);
  }

  public onSubmit() {
    if (this.form.invalid || this.nameExistsError) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    const formVal = this.form.getRawValue();
    const categoryNameInput = formVal.categoryName?.trim() || '';

    if (!categoryNameInput) {
      this.errorMessage.set('Category name is required.');
      this.loading.set(false);
      return;
    }

    const existingCat = this.categories.find(c => c.name.toLowerCase() === categoryNameInput.toLowerCase());

    const saveSkuWithCategoryId = (categoryId: number) => {
      const body = {
        id: this.sku?.id,
        categoryId: categoryId,
        name: formVal.name,
        spec: formVal.spec,
        unit: formVal.unit,
        conversionType: Number(formVal.conversionType),
        conversionValue: Number(formVal.conversionType) === 0
          ? Number(formVal.conversionValue) / 100
          : Number(formVal.conversionValue),
        gstRate: Number(formVal.gstPercent) / 100,
        bomLines: formVal.bomLines.map((line: any, index: number) => ({
          materialId: Number(line.materialId),
          weightKg: Number(line.weightKg || 0),
          priceType: Number(line.priceType || 0),
          pricingMethod: Number(line.pricingMethod || 1),
          pricingMonth: line.pricingMethod === 0 ? Number(line.pricingMonth || 0) : null,
          manualPrice: line.pricingMethod === 2 || line.pricingMethod === 0 ? Number(line.manualPrice || 0) : null,
          lineOrder: index + 1
        }))
      };

      const action$ = this.sku && this.sku.id && !this.sku.isAddSpec
        ? this.pricingService.updateSku(this.sku.id, body)
        : this.pricingService.createSku(body);

      (action$ as any).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open(this.sku && this.sku.id ? 'Product updated successfully.' : 'Product created successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.loading.set(false);
          const errDetails = err.error?.errors ? Object.values(err.error.errors).flat().join(' ') : '';
          const msg = `Error: ${err.error?.message || 'Failed to save product.'} ${errDetails}`;
          this.errorMessage.set(msg);
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
    };

    if (existingCat) {
      saveSkuWithCategoryId(existingCat.id);
    } else {
      this.pricingService.createCategory(categoryNameInput).subscribe({
        next: (newCategoryId) => {
          saveSkuWithCategoryId(newCategoryId);
        },
        error: (err: any) => {
          this.loading.set(false);
          const msg = `Failed to create new category: ${err.error?.message || 'Error occurred.'}`;
          this.errorMessage.set(msg);
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
    }
  }
}
