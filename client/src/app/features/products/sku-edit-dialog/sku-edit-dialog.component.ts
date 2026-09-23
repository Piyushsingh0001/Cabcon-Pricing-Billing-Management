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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, Sku, Category, Material, ItemConfigRow, ItemConfigMaterial } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { SkusComponent } from '../skus.component';
import { CategoryManageDialogComponent } from '../category-manage-dialog/category-manage-dialog.component';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';

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
    MatSelectModule,
    MatAutocompleteModule
  ],
  templateUrl: './sku-edit-dialog.component.html',
  styleUrls: ['./sku-edit-dialog.component.scss']
})
export class SkuEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private confirmDialog = inject(ConfirmDialogService);
  private cdr = inject(ChangeDetectorRef);
  public loading = signal(false);

  public form: FormGroup;
  public categories: Category[] = [];
  public materials: Material[] = [];

  // Matrix Master configuration
  public matrixRows: ItemConfigRow[] = [];
  public matrixMaterials: ItemConfigMaterial[] = [];
  public matrixVariants: string[] = [];
  public matrixSpecs: string[] = [];
  public filteredVariants: string[] = [];
  public filteredSpecs: string[] = [];
  public filteredCategories: Category[] = [];
  public isAutoPopulatedFromMatrix = false;
  public matchedMatrixRow: ItemConfigRow | null = null;

  constructor(
    public dialogRef: MatDialogRef<SkuEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public sku: any // SkuDetails
  ) {
    const isGstPct = sku?.gstRate != null ? Math.round(sku.gstRate * 100) : (sku?.gstPercent != null ? sku.gstPercent : null);

    this.form = this.fb.group({
      categoryName: [{value: sku?.categoryName || '', disabled: !sku?.isGlobalAdd}, Validators.required],
      name: [{value: sku?.name || '', disabled: sku?.isAddSpec}, Validators.required],
      spec: [sku?.spec || '', Validators.required],
      unit: [sku?.unit || '', Validators.required],
      quantity: [sku?.quantity ?? 1, [Validators.required, Validators.min(0.0001)]],
      conversionType: [sku?.conversionType ?? 0],
      conversionValue: [0],
      gstPercent: [isGstPct, Validators.required],
      bomLines: this.fb.array([], Validators.required)
    });

    // Automatically trigger BOM population / recalculation whenever name, spec, quantity, or unit changes
    this.form.get('name')?.valueChanges.subscribe(() => {
      this.onVariantOrSpecChange();
    });

    this.form.get('spec')?.valueChanges.subscribe(() => {
      this.onVariantOrSpecChange();
    });

    this.form.get('quantity')?.valueChanges.subscribe(() => {
      this.recalculateMatrixBomWeights();
    });

    this.form.get('unit')?.valueChanges.subscribe(() => {
      this.recalculateMatrixBomWeights();
    });
  }

  ngOnInit() {
    this.loadDropdowns();
    this.loadMatrixData();
  }

  public get bomLines() {
    return this.form.get('bomLines') as FormArray;
  }

  public existingSkus: Sku[] = [];
  public errorMessage = signal<string | null>(null);
  public nameExistsError = false;

  public dbVendors: string[] = [];
  public dbVendorMappings: { [matName: string]: string[] } = {};

  private loadMatrixData() {
    this.pricingService.getItemConfigMatrix().subscribe({
      next: (res) => {
        if (res) {
          this.matrixMaterials = res.materials || [];
          this.matrixRows = res.rows || [];

          const vSet = new Set<string>();
          const sSet = new Set<string>();

          this.matrixRows.forEach(r => {
            if (r.variant && r.variant.trim()) vSet.add(r.variant.trim());
            if (r.spec && r.spec.trim()) sSet.add(r.spec.trim());
          });

          this.matrixVariants = Array.from(vSet);
          this.matrixSpecs = Array.from(sSet);
          this.filteredVariants = [...this.matrixVariants];
          this.filteredSpecs = [...this.matrixSpecs];

          if (this.sku) {
            const currentVariant = (this.sku.name || '').trim();
            const currentSpec = (this.sku.spec || '').trim();
            this.matchedMatrixRow = this.matrixRows.find(r =>
              r.variant?.trim().toLowerCase() === currentVariant.toLowerCase() &&
              r.spec?.trim().toLowerCase() === currentSpec.toLowerCase()
            ) || null;
          }

          // Only trigger BOM auto-population for new products/specs, NOT when editing an existing product
          if (!this.sku || !this.sku.id || this.sku.isAddSpec) {
            this.onVariantOrSpecChange();
          }
        }
      }
    });
  }

  public filterVariants(term: any) {
    const val = typeof term === 'string' ? term : (term?.target?.value || '');
    if (!val || !val.trim()) {
      this.filteredVariants = [...this.matrixVariants];
      return;
    }
    const q = val.toLowerCase().trim();
    this.filteredVariants = this.matrixVariants.filter(v => v.toLowerCase().includes(q));
  }

  public filterSpecs(term: any) {
    const val = typeof term === 'string' ? term : (term?.target?.value || '');
    if (!val || !val.trim()) {
      this.filteredSpecs = [...this.matrixSpecs];
      return;
    }
    const q = val.toLowerCase().trim();
    this.filteredSpecs = this.matrixSpecs.filter(s => s.toLowerCase().includes(q));
  }

  public filterCategories(term: any) {
    const val = typeof term === 'string' ? term : (term?.target?.value || '');
    if (!val || !val.trim()) {
      this.filteredCategories = [...this.categories];
      return;
    }
    const q = val.toLowerCase().trim();
    this.filteredCategories = this.categories.filter(c => c.name.toLowerCase().includes(q));
  }

  public onVariantSelected(variant: string) {
    this.form.patchValue({ name: variant });
    this.onVariantOrSpecChange();
  }

  public onSpecSelected(spec: string) {
    this.form.patchValue({ spec: spec });
    this.onVariantOrSpecChange();
  }

  public onVariantOrSpecChange() {
    this.checkUniqueness();
    const variant = (this.form.get('name')?.value || '').trim();
    const spec = (this.form.get('spec')?.value || '').trim();

    if (!variant || !spec) return;

    let matched = this.matrixRows.find(r =>
      r.variant?.trim().toLowerCase() === variant.toLowerCase() &&
      r.spec?.trim().toLowerCase() === spec.toLowerCase()
    );

    this.matchedMatrixRow = matched || null;

    // If editing an existing product and variant & spec have not changed, do NOT overwrite saved BOM lines
    if (this.sku && this.sku.id && !this.sku.isAddSpec && !this.isAutoPopulatedFromMatrix) {
      const origV = (this.sku.name || '').trim().toLowerCase();
      const origS = (this.sku.spec || '').trim().toLowerCase();
      if (variant.toLowerCase() === origV && spec.toLowerCase() === origS) {
        return;
      }
    }

    if (matched && matched.weights && Object.keys(matched.weights).length > 0) {
      this.populateBomFromMatrixRow(matched);
    }
  }

  public getMatrixWeightForMaterial(matId?: number | null, matName?: string): number | null {
    const variant = (this.form.get('name')?.value || '').trim();
    const spec = (this.form.get('spec')?.value || '').trim();
    if (!variant || !spec) return null;

    let matched = this.matchedMatrixRow;
    if (!matched || !matched.weights || Object.keys(matched.weights).length === 0) {
      matched = this.matrixRows.find(r =>
        r.variant?.trim().toLowerCase() === variant.toLowerCase() &&
        r.spec?.trim().toLowerCase() === spec.toLowerCase()
      ) || null;
    }

    if (!matched || !matched.weights) return null;

    // 1. Direct ID match
    if (matId && matched.weights[matId] !== undefined && Number(matched.weights[matId]) > 0) {
      return Number(matched.weights[matId]);
    }

    // 2. Name matches
    if (matName && matName.trim()) {
      const normName = matName.trim().toLowerCase();

      // Check in matrixMaterials
      const mm = this.matrixMaterials.find(m => m.name?.trim().toLowerCase() === normName);
      if (mm && matched.weights[mm.id] !== undefined && Number(matched.weights[mm.id]) > 0) {
        return Number(matched.weights[mm.id]);
      }

      // Check in materials
      const dm = this.materials.find(m => m.name?.trim().toLowerCase() === normName);
      if (dm && matched.weights[dm.id] !== undefined && Number(matched.weights[dm.id]) > 0) {
        return Number(matched.weights[dm.id]);
      }

      // Check all keys in weights and compare material names
      for (const [key, wt] of Object.entries(matched.weights)) {
        const id = Number(key);
        const mObj = this.matrixMaterials.find(m => m.id === id) || this.materials.find(m => m.id === id);
        if (mObj && mObj.name?.trim().toLowerCase() === normName && Number(wt) > 0) {
          return Number(wt);
        }
      }
    }

    return null;
  }

  public populateBomFromMatrixRow(row: ItemConfigRow) {
    this.matchedMatrixRow = row;
    this.isAutoPopulatedFromMatrix = true;

    // Clear existing BOM lines
    while (this.bomLines.length !== 0) {
      this.bomLines.removeAt(0);
    }

    const qty = Number(this.form.get('quantity')?.value || 1);
    const unit = (this.form.get('unit')?.value || 'km').toLowerCase();
    const multiplier = (unit === '100m' || unit === 'coil') ? (qty * 0.1) : qty;

    const populatedMatIds = Object.keys(row.weights)
      .map(k => Number(k))
      .filter(k => Number(row.weights[k]) > 0);

    populatedMatIds.forEach(matId => {
      const weightPerKm = Number(row.weights[matId]);
      const mat = this.materials.find(m => m.id === matId)
        || this.matrixMaterials.find(m => m.id === matId);

      const matName = mat?.name || `Material #${matId}`;
      const calculatedWeight = Math.round(weightPerKm * multiplier * 1000) / 1000;
      const priceType = (mat as any)?.type ?? 0;
      const defaultVendor = (mat as any)?.vendorName || '';

      const group = this.fb.group({
        materialName: [matName, Validators.required],
        vendorName: [{value: defaultVendor, disabled: (priceType === 0)}, Validators.required],
        materialId: [matId, Validators.required],
        weightKg: [calculatedWeight, [Validators.required, Validators.min(0.0001)]],
        priceType: [priceType, Validators.required],
        pricingMethod: [1, Validators.required], // Actual
        pricingMonth: [0],
        manualPrice: [0]
      });

      this.bomLines.push(group);
      const idx = this.bomLines.length - 1;

      if (priceType === 1) {
        const availVendors = this.getAvailableVendors(idx);
        if (availVendors.length > 0 && !defaultVendor) {
          group.patchValue({ vendorName: availVendors[0] });
        }
      }
    });

    if (this.bomLines.length === 0) {
      this.addBomLine();
    }

    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public recalculateMatrixBomWeights() {
    const qty = Number(this.form.get('quantity')?.value || 1);
    const unit = (this.form.get('unit')?.value || 'km').toLowerCase();
    const multiplier = (unit === '100m' || unit === 'coil') ? (qty * 0.1) : qty;

    for (let i = 0; i < this.bomLines.length; i++) {
      const line = this.bomLines.at(i);
      const matId = line.get('materialId')?.value ? Number(line.get('materialId')?.value) : null;
      const matName = line.get('materialName')?.value;
      const weightPerKm = this.getMatrixWeightForMaterial(matId, matName);
      if (weightPerKm !== null && weightPerKm > 0) {
        const calculatedWeight = Math.round(weightPerKm * multiplier * 1000) / 1000;
        line.patchValue({ weightKg: calculatedWeight }, { emitEvent: false });
      }
    }
    this.cdr.detectChanges();
  }

  private loadDropdowns() {
    this.pricingService.getCategories().subscribe(res => {
      this.categories = res;
      this.filteredCategories = [...res];
    });
    this.pricingService.getSkus(undefined, undefined, undefined, false, 1, 1000).subscribe(res => {
      this.existingSkus = res.items;
      if (this.sku) {
        this.checkUniqueness();
      }
    });

    this.pricingService.getVendorsApi().subscribe({
      next: (vendorsRes) => {
        this.dbVendors = (vendorsRes || []).map(v => v.name);

        this.pricingService.getVendorMaterialMappingsApi().subscribe({
          next: (mappingsRes) => {
            (mappingsRes || []).forEach(m => {
              this.dbVendorMappings[m.materialName] = m.vendorNames || [];
            });
            this.fetchMaterials();
          },
          error: () => this.fetchMaterials()
        });
      },
      error: () => this.fetchMaterials()
    });
  }

  private fetchMaterials() {
    this.pricingService.getMaterials(undefined, undefined, undefined, false, 1, 100).subscribe(res => {
      this.materials = res.items;

      // Populate form lines if editing
      if (this.sku && this.sku.bomLines && this.sku.bomLines.length > 0 && !this.isAutoPopulatedFromMatrix) {
        while (this.bomLines.length !== 0) {
          this.bomLines.removeAt(0);
        }

        this.sku.bomLines.forEach((line: any) => {
          const mat = this.materials.find(m => m.id === line.materialId)
                   || this.matrixMaterials.find(m => m.id === line.materialId);
          const matName = mat ? mat.name : (line.materialName || '');
          let vendName = line.vendorName || (mat as any)?.vendorName || '';

          const group = this.fb.group({
            materialName: [matName, Validators.required],
            vendorName: [{value: vendName, disabled: (!matName || line.priceType === 0 || (mat as any)?.type === 0)}, Validators.required],
            materialId: [line.materialId, Validators.required],
            weightKg: [line.weightKg ?? 1, [Validators.required, Validators.min(0.0001)]],
            priceType: [line.priceType ?? (mat ? (mat as any).type : 0), Validators.required],
            pricingMethod: [line.pricingMethod ?? 1, Validators.required],
            pricingMonth: [line.pricingMonth ?? 0],
            manualPrice: [line.manualPrice ?? 0]
          });

          this.bomLines.push(group);
          const idx = this.bomLines.length - 1;

          if (matName && (!vendName || vendName === 'Default')) {
            const avail = this.getAvailableVendors(idx);
            if (avail.length > 0) {
              group.patchValue({ vendorName: avail[0] });
            }
          }
        });
      } else if (this.bomLines.length === 0) {
        this.addBomLine();
      }
      this.cdr.detectChanges();
    });
  }

  public get uniqueMaterialNames(): string[] {
    const list = this.materials.map(m => m.name);
    this.matrixMaterials.forEach(m => {
      if (m.name) list.push(m.name);
    });
    return Array.from(new Set(list)).filter(n => !!n);
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

  public getUnitPriceForLine(idx: number): number {
    const line = this.bomLines.at(idx);
    if (!line) return 0;
    const matId = line.get('materialId')?.value;
    const matName = line.get('materialName')?.value;
    const vendName = line.get('vendorName')?.value;
    const method = Number(line.get('pricingMethod')?.value ?? 1);
    const pType = Number(line.get('priceType')?.value ?? 0);
    const pMonth = Number(line.get('pricingMonth')?.value ?? 0);
    const manualPrice = Number(line.get('manualPrice')?.value || 0);

    let mat: Material | undefined;
    if (matName) {
      if (pType === 1) {
        if (vendName) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.vendorName?.toLowerCase() === vendName.toLowerCase() && m.type === 1 && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
             || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.vendorName?.toLowerCase() === vendName.toLowerCase() && m.type === 1);
        }
        if (!mat) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 1 && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
             || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 1);
        }
        if (!mat) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
             || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase());
        }
      } else {
        mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 0 && (m.landedCost > 0 || (m.lmeUsdPerMt && m.lmeUsdPerMt > 0)))
           || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 0)
           || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase());
      }
    }

    if (!mat && matId) {
      mat = this.materials.find(m => m.id === matId && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
         || this.materials.find(m => m.id === matId);
    }

    if (method === 1) { // Actual
      if (pType === 0) { // LME-linked
        const lme = mat ? Number(mat.lmeUsdPerMt || 0) : 0;
        const premium = mat ? Number(mat.premiumUsdPerMt || 0) : 0;
        const fx = mat ? Number(mat.fxRate || 0) : 0;
        const freight = mat ? Number(mat.freightInrPerMt || 0) : 0;
        if (lme > 0 && fx > 0) {
          return ((lme + premium) * fx + freight) / 1000;
        }
        return mat ? Number(mat.landedCost || 0) : 0;
      } else { // Direct
        return mat ? Number(mat.directRateInrPerKg ?? mat.landedCost ?? 0) : 0;
      }
    } else if (method === 0) { // Average
      if (pType === 0) {
        return mat ? (pMonth === 0 ? Number(mat.thisMonthAvgLme || manualPrice || 0) : Number(mat.prevMonthAvgLme || manualPrice || 0)) : manualPrice;
      } else {
        return mat ? (pMonth === 0 ? Number(mat.thisMonthAvgDirect || manualPrice || 0) : Number(mat.prevMonthAvgDirect || manualPrice || 0)) : manualPrice;
      }
    } else { // Manual
      return manualPrice;
    }
  }

  public getLandedCost(materialId: any, priceType?: any, vendorName?: string, matName?: string): number {
    const pType = priceType !== undefined ? Number(priceType) : 0;
    let mat: Material | undefined;

    if (matName) {
      if (pType === 1) {
        if (vendorName) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.vendorName?.toLowerCase() === vendorName.toLowerCase() && m.type === 1 && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
             || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.vendorName?.toLowerCase() === vendorName.toLowerCase() && m.type === 1);
        }
        if (!mat) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 1 && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
             || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 1);
        }
        if (!mat) {
          mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase());
        }
      } else {
        mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 0 && (m.landedCost > 0 || (m.lmeUsdPerMt && m.lmeUsdPerMt > 0)))
           || this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 0);
      }
    }

    if (!mat && materialId) {
      mat = this.materials.find(m => m.id === materialId && (m.landedCost > 0 || (m.directRateInrPerKg && m.directRateInrPerKg > 0)))
         || this.materials.find(m => m.id === materialId);
    }

    if (!mat) return 0;

    if (pType === 0) {
      const lme = Number(mat.lmeUsdPerMt || 0);
      const premium = Number(mat.premiumUsdPerMt || 0);
      const fx = Number(mat.fxRate || 0);
      const freight = Number(mat.freightInrPerMt || 0);
      if (lme > 0 && fx > 0) {
        const landed = ((lme + premium) * fx + freight) / 1000;
        return landed > 0 ? landed : Number(mat.landedCost || 0);
      }
      return Number(mat.landedCost || 0);
    } else {
      return Number(mat.directRateInrPerKg ?? mat.landedCost ?? 0);
    }
  }

  public getCalculatedBomLineCost(idx: number): number {
    const line = this.bomLines.at(idx);
    if (!line) return 0;
    const weightKg = Number(line.get('weightKg')?.value || 0);
    const unitPrice = this.getUnitPriceForLine(idx);
    return unitPrice * weightKg;
  }

  public getTotalBomCost(): number {
    let total = 0;
    for (let i = 0; i < this.bomLines.length; i++) {
      total += this.getCalculatedBomLineCost(i);
    }
    return total;
  }

  public getTotalPrice(): number {
    const qty = Number(this.form.get('quantity')?.value || 1);
    return this.getTotalBomCost() * (qty > 0 ? qty : 1);
  }

  public onPriceTypeChange(idx: number) {
    const line = this.bomLines.at(idx);
    if (!line) return;
    const pType = Number(line.get('priceType')?.value || 0);
    line.patchValue({ priceType: pType }, { emitEvent: false });
    const vendorCtrl = line.get('vendorName');
    const matName = line.get('materialName')?.value;

    if (pType === 0) { // LME-linked
      vendorCtrl?.disable();
      line.patchValue({ vendorName: '' });
      const mat = this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase() && m.type === 0)
               || this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase());
      if (mat) {
        line.patchValue({ materialId: mat.id });
      }
    } else { // Direct Rate
      vendorCtrl?.enable();
      const available = this.getAvailableVendors(idx);
      if (available.length > 0) {
        const currentVend = line.get('vendorName')?.value;
        const selectedVend = (currentVend && available.includes(currentVend)) ? currentVend : available[0];
        line.patchValue({ vendorName: selectedVend });
        const mat = this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase() && m.vendorName?.toLowerCase() === selectedVend.toLowerCase())
                 || this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase());
        if (mat) {
          line.patchValue({ materialId: mat.id });
        }
      } else {
        const mat = this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase() && m.type === 1)
                 || this.materials.find(m => m.name.toLowerCase() === matName?.toLowerCase());
        if (mat) {
          line.patchValue({ materialId: mat.id });
        }
      }
    }

    const method = Number(line.get('pricingMethod')?.value);
    if (method === 0) {
      this.calculateAveragePrice(idx);
    }
    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public onPricingMonthChange(idx: number) {
    this.calculateAveragePrice(idx);
  }

  public onPricingMethodChange(idx: number) {
    const line = this.bomLines.at(idx);
    if (!line) return;
    const method = Number(line.get('pricingMethod')?.value);
    
    if (method === 0) { // Average
      this.calculateAveragePrice(idx);
    } else if (method === 2) { // Manual
      const currentManual = Number(line.get('manualPrice')?.value || 0);
      if (currentManual === 0) {
        const matId = line.get('materialId')?.value;
        const pType = Number(line.get('priceType')?.value);
        const vendName = line.get('vendorName')?.value;
        const matName = line.get('materialName')?.value;
        const actualCost = this.getLandedCost(matId, pType, vendName, matName);
        line.patchValue({ manualPrice: actualCost });
      }
    }
    this.cdr.detectChanges();
  }

  public calculateAveragePrice(idx: number) {
    const line = this.bomLines.at(idx);
    if (!line) return;
    const matName = line.get('materialName')?.value;
    const vendName = line.get('vendorName')?.value;
    let matId = line.get('materialId')?.value;
    const pType = Number(line.get('priceType')?.value || 0);
    const pMonth = Number(line.get('pricingMonth')?.value || 0);

    let mat: Material | undefined;
    if (matName) {
      if (pType === 1 && vendName) {
        mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.vendorName?.toLowerCase() === vendName.toLowerCase() && m.type === 1);
      } else if (pType === 1) {
        mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 1);
      } else {
        mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase() && m.type === 0);
      }
    }

    if (!mat && matId) {
      mat = this.materials.find(m => m.id === matId);
    }

    if (mat) {
      matId = mat.id;
      line.patchValue({ materialId: mat.id }, { emitEvent: false });
      let avg = 0;
      if (pType === 0) {
        avg = pMonth === 0 ? (mat.thisMonthAvgLme || 0) : (mat.prevMonthAvgLme || 0);
      } else {
        avg = pMonth === 0 ? (mat.thisMonthAvgDirect || 0) : (mat.prevMonthAvgDirect || 0);
      }
      line.patchValue({ manualPrice: avg });
      this.cdr.detectChanges();
    }

    if (!matId || matId === 0) return;

    this.pricingService.getMissingDates(matId, pType).subscribe(() => {
      this.pricingService.getMaterials(undefined, pType, undefined, false, 1, 1000).subscribe(mats => {
        const updatedMat = mats.items.find(m => m.id === matId)
                        || mats.items.find(m => m.name?.toLowerCase() === matName?.toLowerCase() && m.type === pType);
        if (updatedMat) {
          let avg = 0;
          if (pType === 0) {
            avg = pMonth === 0 ? (updatedMat.thisMonthAvgLme || 0) : (updatedMat.prevMonthAvgLme || 0);
          } else {
            avg = pMonth === 0 ? (updatedMat.thisMonthAvgDirect || 0) : (updatedMat.prevMonthAvgDirect || 0);
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

    const mappedVendors = this.dbVendorMappings[matName];
    if (mappedVendors && Array.isArray(mappedVendors) && mappedVendors.length > 0) {
      return mappedVendors;
    }

    const existingVendors = this.materials
      .filter(m => m.name === matName && m.vendorName)
      .map(m => m.vendorName!);
    
    if (existingVendors.length > 0) {
      return Array.from(new Set(existingVendors));
    }

    return this.dbVendors;
  }

  public onMaterialNameChange(idx: number) {
    const line = this.bomLines.at(idx);
    const vendorCtrl = line.get('vendorName');
    const matName = line.get('materialName')?.value;
    
    line.patchValue({ vendorName: '', materialId: null });
    
    if (matName) {
      const mat = this.materials.find(m => m.name === matName)
               || this.matrixMaterials.find(m => m.name === matName);
      if (mat) {
        const matType = (mat as any).type ?? 0;
        line.patchValue({ materialId: mat.id, priceType: matType });
        if (matType === 0) { // LME-linked
          vendorCtrl?.disable();
          line.patchValue({ vendorName: '' });
          this.onPricingMethodChange(idx);
        } else { // Direct Rate
          vendorCtrl?.enable();
          const available = this.getAvailableVendors(idx);
          if (available.length > 0) {
            line.patchValue({ vendorName: available[0] });
            this.onVendorNameChange(idx);
          }
        }

        // Auto-render configured weight from Weight Matrix into QTY (weightKg) column
        let configuredWeight = this.getMatrixWeightForMaterial(mat.id, matName);
        
          configuredWeight = configuredWeight ?? 0;
          const qty = Number(this.form.get('quantity')?.value || 1);
          const unit = (this.form.get('unit')?.value || 'km').toLowerCase();
          const multiplier = (unit === '100m' || unit === 'coil') ? (qty * 0.1) : qty;
          const calculatedWeight = Math.round(configuredWeight * multiplier * 1000) / 1000;
          line.patchValue({ weightKg: calculatedWeight });

      }
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
      const mat = this.materials.find(m => m.name === matName && m.vendorName === vendName)
                || this.materials.find(m => m.name === matName);
      if (mat) {
        line.patchValue({ materialId: mat.id });
        this.onPricingMethodChange(idx);
      }
    }
    this.checkUniqueness();
    this.cdr.detectChanges();
  }

  public getMaterialCategoryName(matId?: number, matName?: string): string {
    if (matId) {
      const mat = this.materials.find(m => m.id === matId) || this.matrixMaterials.find(m => m.id === matId);
      if (mat?.materialTypeName) return mat.materialTypeName;
      if (mat?.categoryName) return mat.categoryName;
    }
    if (matName) {
      const mat = this.materials.find(m => m.name?.toLowerCase() === matName.toLowerCase()) || 
                  this.matrixMaterials.find(m => m.name?.toLowerCase() === matName.toLowerCase());
      if (mat?.materialTypeName) return mat.materialTypeName;
      if (mat?.categoryName) return mat.categoryName;
    }
    return '';
  }

  public getCategoryThemeClass(matId?: number, matName?: string): string {
    const cat = this.getMaterialCategoryName(matId, matName);
    if (!cat) return 'theme-default';
    const themes = ['theme-core', 'theme-insulation', 'theme-inner-sheath', 'theme-armour', 'theme-outer-shell'];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) {
      hash = (hash * 31 + cat.charCodeAt(i)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % themes.length;
    return themes[idx];
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
    this.confirmDialog.open({
      title: 'Delete Product',
      message: `Are you sure you want to delete product "${this.sku.name}"? This action cannot be undone.`,
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).subscribe(confirmed => {
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
        conversionType: Number(formVal.conversionType ?? 0),
        conversionValue: 0,
        gstRate: (Number(formVal.gstPercent) || 0) / 100,
        quantity: Number(formVal.quantity || 1),
        bomLines: formVal.bomLines.map((line: any, index: number) => ({
          materialId: Number(line.materialId),
          weightKg: Number(line.weightKg || 0),
          priceType: Number(line.priceType ?? 0),
          pricingMethod: Number(line.pricingMethod ?? 1),
          pricingMonth: Number(line.pricingMethod ?? 1) === 0 ? Number(line.pricingMonth ?? 0) : null,
          manualPrice: (Number(line.pricingMethod ?? 1) === 2 || Number(line.pricingMethod ?? 1) === 0) ? Number(line.manualPrice || 0) : null,
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
          this.dialogRef.close(categoryNameInput);
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
