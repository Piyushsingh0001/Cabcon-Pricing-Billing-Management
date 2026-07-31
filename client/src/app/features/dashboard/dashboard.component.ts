import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PricingService, Sku, Material, CustomerSummary } from '../../core/pricing.service';
import { QuotationPreviewDialogComponent } from './quotation-preview-dialog/quotation-preview-dialog.component';

interface CalculatorRow {
  skuId: number;
  categoryName: string;
  skuName: string;
  spec: string;
  unit: string;
  rmCost: number;
  mfgCost: number;
  rowMfgOverride?: number;
  rowPctOverride?: number;
  rowAmtOverride?: number;
  rowOfferOverride?: number;
  offerExGst: number;
  quantity: number;
}

@Component({
  selector: 'app-dashboard',
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
    MatDialogModule,
    MatAutocompleteModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public editId: number | null = null;

  public rows: CalculatorRow[] = [];
  public skus: Sku[] = [];
  public materials: Material[] = [];
  
  // Product Selection State
  public searchQuery = '';
  public groupedSkusList: { categoryName: string, products: { productName: string, items: Sku[] }[] }[] = [];
  public collapsedCategories = new Set<string>();
  public localSelections: { [key: number]: boolean } = {};

  // Global settings
  public loadingMode = signal<number>(0);
  public globalPct = signal<number>(0.05);
  public globalAmt = signal<number>(10);
  public globalOverheadPct = signal<number>(0.05);
  public globalMarginPct = signal<number>(0.05);
  public globalPacking = signal<number>(2);
  public globalFreight = signal<number>(3);

  // Footer inputs
  public partyName: string = '';
  public selectedCustomer: CustomerSummary | null = null;
  public validityDays: number = 7;

  public customers: CustomerSummary[] = [];
  public filteredCustomers: CustomerSummary[] = [];

  // Selected SKUs to hold overrides state
  public overridesMap = new Map<number, {
    rowMfgOverride?: number;
    rowPctOverride?: number;
    rowAmtOverride?: number;
    rowOfferOverride?: number;
    rowQuantity?: number;
  }>();

  public hasDraft = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.editId = +params['edit'];
        this.loadQuotationForEdit(this.editId);
      } else {
        const savedDraft = localStorage.getItem('cabcon_draft_quotation');
        if (savedDraft) {
          this.hasDraft = true;
        }
        this.loadCustomers();
        this.loadMaterials();
        this.loadSkusAndRecalculate();
      }
    });
  }

  private loadQuotationForEdit(id: number) {
    this.pricingService.getQuotation(id).subscribe({
      next: (quote) => {
        this.partyName = quote.partyName;
        this.validityDays = quote.validityDays;
        
        this.pricingService.selectedSkuIds.clear();
        this.overridesMap.clear();
        
        quote.lines.forEach(line => {
          this.pricingService.selectedSkuIds.add(line.skuId);
          this.overridesMap.set(line.skuId, {
            rowOfferOverride: line.offerExGst,
            rowQuantity: line.quantity
          });
        });

        this.loadCustomers();
        this.loadSkusAndRecalculate();
      },
      error: () => {
        this.snackBar.open('Failed to load quotation for edit.', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private loadMaterials() {
    this.pricingService.getMaterials(undefined, undefined, 'name', false, 1, 100).subscribe({
      next: (res) => this.materials = res.items
    });
  }

  private loadCustomers() {
    this.pricingService.getCustomers().subscribe({
      next: (res) => {
        this.customers = res || [];
        this.filteredCustomers = this.customers;
        if (this.partyName) {
          const match = this.customers.find(c => c.name.toLowerCase() === this.partyName.toLowerCase());
          if (match) {
            this.selectedCustomer = match;
          }
        }
      }
    });
  }

  public filterCustomers(event: Event) {
    const val = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredCustomers = this.customers.filter(c => c.name.toLowerCase().includes(val));
    
    // If they typed a name that exactly matches, select it, otherwise clear selectedCustomer
    const match = this.customers.find(c => c.name.toLowerCase() === val);
    this.selectedCustomer = match || null;
  }

  public onCustomerSelected(customer: CustomerSummary) {
    this.selectedCustomer = customer;
    this.partyName = customer.name;
  }

  public onSearchChange() {
    this.loadSkusAndRecalculate();
  }

  private loadSkusAndRecalculate() {
    this.pricingService.getSkus(this.searchQuery || undefined, undefined, 'categoryName', false, 1, 100).subscribe({
      next: (res) => {
        this.skus = res.items;

        this.groupSkus();

        // Initialize overridesMap with selected SKUs from PricingService
        const selectedIds = Array.from(this.pricingService.selectedSkuIds);
        
        // Sync local selections
        this.skus.forEach(s => {
          this.localSelections[s.id] = this.pricingService.selectedSkuIds.has(s.id);
        });

        if (selectedIds.length > 0) {
          const newMap = new Map<number, any>();
          selectedIds.forEach(id => {
            newMap.set(id, this.overridesMap.get(id) || {});
          });
          this.overridesMap = newMap;
        }

        this.recalculate();
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
      this.collapsedCategories.add(categoryName);
      return { categoryName, products };
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

  public toggleSelectAll(categoryName: string) {
    const categorySkus = this.skus.filter(s => s.categoryName === categoryName);
    const allSelected = categorySkus.every(s => this.localSelections[s.id]);
    categorySkus.forEach(s => {
      this.localSelections[s.id] = !allSelected;
      if (!allSelected) {
        this.pricingService.selectedSkuIds.add(s.id);
        if (!this.overridesMap.has(s.id)) {
          this.overridesMap.set(s.id, {});
        }
      } else {
        this.pricingService.selectedSkuIds.delete(s.id);
        this.overridesMap.delete(s.id);
      }
    });
    this.recalculate();
  }

  public onSelectionChange(skuId: number) {
    if (this.localSelections[skuId]) {
      this.pricingService.selectedSkuIds.add(skuId);
      if (!this.overridesMap.has(skuId)) {
        this.overridesMap.set(skuId, {});
      }
    } else {
      this.pricingService.selectedSkuIds.delete(skuId);
      this.overridesMap.delete(skuId);
    }
    this.recalculate();
  }

  public removeRow(skuId: number) {
    this.localSelections[skuId] = false;
    this.pricingService.selectedSkuIds.delete(skuId);
    this.overridesMap.delete(skuId);
    this.recalculate();
  }

  public getSkuConversionType(skuId: number): number {
    const sku = this.skus.find(s => s.id === skuId);
    return sku ? sku.conversionType : 0;
  }

  public getBomSummary(sku: Sku): string {
    if (!sku.bomLines || sku.bomLines.length === 0) return 'No BOM';
    return sku.bomLines.map(line => {
      const namePart = line.materialName ? line.materialName.split(' ')[0] : 'Material';
      return `${namePart} ${line.weightKg}`;
    }).join(' · ');
  }

  public get usedMaterials(): Material[] {
    if (!this.skus || this.skus.length === 0 || !this.materials || this.materials.length === 0) return [];
    const selectedIds = Array.from(this.pricingService.selectedSkuIds);
    const usedMatIds = new Set<number>();
    for (const sku of this.skus.filter(s => selectedIds.includes(s.id))) {
      if (sku.bomLines) {
        sku.bomLines.forEach(bom => usedMatIds.add(bom.materialId));
      }
    }
    return this.materials.filter(m => usedMatIds.has(m.id));
  }

  public getSkuConversionValue(skuId: number): number {
    const sku = this.skus.find(s => s.id === skuId);
    return sku ? sku.conversionValue : 0;
  }

  public loadDraft() {
    const savedDraft = localStorage.getItem('cabcon_draft_quotation');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        this.loadingMode.set(parsed.loadingMode || 0);
        this.globalPct.set(parsed.globalPct || 0.05);
        this.globalAmt.set(parsed.globalAmt || 10);
        this.globalOverheadPct.set(parsed.globalOverheadPct || 0.05);
        this.globalMarginPct.set(parsed.globalMarginPct || 0.05);
        this.globalPacking.set(parsed.globalPacking || 2);
        this.globalFreight.set(parsed.globalFreight || 3);
        
        if (parsed.overridesMap) {
          this.overridesMap = new Map<number, any>(parsed.overridesMap);
          
          // Sync service selectedSkuIds with draft overrides
          this.pricingService.selectedSkuIds.clear();
          this.overridesMap.forEach((_, id) => {
            this.pricingService.selectedSkuIds.add(id);
          });
        }
        this.hasDraft = false;
        this.recalculate();
      } catch (e) {
        // ignore
      }
    }
  }

  public deleteDraft() {
    localStorage.removeItem('cabcon_draft_quotation');
    this.hasDraft = false;
    this.overridesMap.clear();
    this.pricingService.selectedSkuIds.clear();
    this.recalculate();
  }

  public onModeChange(value: number) {
    this.loadingMode.set(value);
    this.recalculate();
  }

  public updateGlobalParam(type: string, value: number) {
    switch (type) {
      case 'pct': this.globalPct.set(value / 100); break;
      case 'amt': this.globalAmt.set(value); break;
      case 'overhead': this.globalOverheadPct.set(value / 100); break;
      case 'margin': this.globalMarginPct.set(value / 100); break;
      case 'packing': this.globalPacking.set(value); break;
      case 'freight': this.globalFreight.set(value); break;
    }
    this.recalculate();
  }

  public getMfgDisplayValue(skuId: number): number {
    const overrides = this.overridesMap.get(skuId);
    const val = (overrides && overrides.rowMfgOverride !== undefined) 
      ? overrides.rowMfgOverride 
      : this.getSkuConversionValue(skuId);
    return this.getSkuConversionType(skuId) === 0 ? val * 100 : val;
  }

  public onMfgOverrideChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    if (val === null || val === undefined || val === '') {
      override.rowMfgOverride = undefined;
    } else {
      const numVal = Number(val);
      override.rowMfgOverride = this.getSkuConversionType(skuId) === 0 ? numVal / 100 : numVal;
    }
    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public getRowLoadingDisplayValue(skuId: number): number {
    const overrides = this.overridesMap.get(skuId);
    if (this.loadingMode() === 0) {
      const val = (overrides && overrides.rowPctOverride !== undefined) 
        ? overrides.rowPctOverride 
        : this.globalPct();
      return Math.round(val * 100);
    } else {
      const val = (overrides && overrides.rowAmtOverride !== undefined) 
        ? overrides.rowAmtOverride 
        : this.globalAmt();
      return val;
    }
  }

  public onRowLoadingChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    if (val === null || val === undefined || val === '') {
      override.rowPctOverride = undefined;
      override.rowAmtOverride = undefined;
    } else {
      const numVal = Number(val);
      if (this.loadingMode() === 0) {
        override.rowPctOverride = numVal / 100;
      } else {
        override.rowAmtOverride = numVal;
      }
    }
    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public onRowOfferChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    if (val === null || val === undefined || val === '') {
      override.rowOfferOverride = undefined;
    } else {
      override.rowOfferOverride = Number(val);
    }
    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public clearAllOverrides() {
    this.overridesMap.forEach((val, key) => {
      this.overridesMap.set(key, {});
    });
    this.recalculate();
  }

  public recalculate() {
    if (this.overridesMap.size === 0) {
      this.rows = [];
      this.cdr.detectChanges();
      return;
    }

    const itemsPayload = Array.from(this.overridesMap.entries()).map(([skuId, value]) => ({
      skuId,
      rowMfgOverride: value.rowMfgOverride,
      rowPctOverride: value.rowPctOverride,
      rowAmtOverride: value.rowAmtOverride,
      rowOfferOverride: value.rowOfferOverride
    }));

    const payload = {
      mode: this.loadingMode(),
      globalPct: this.globalPct(),
      globalAmt: this.globalAmt(),
      globalOverheadPct: this.globalOverheadPct(),
      globalMarginPct: this.globalMarginPct(),
      globalPacking: this.globalPacking(),
      globalFreight: this.globalFreight(),
      items: itemsPayload
    };

    // Auto-save draft to localStorage
    localStorage.setItem('cabcon_draft_quotation', JSON.stringify({
      loadingMode: this.loadingMode(),
      globalPct: this.globalPct(),
      globalAmt: this.globalAmt(),
      globalOverheadPct: this.globalOverheadPct(),
      globalMarginPct: this.globalMarginPct(),
      globalPacking: this.globalPacking(),
      globalFreight: this.globalFreight(),
      overridesMap: Array.from(this.overridesMap.entries())
    }));

    this.pricingService.calculateQuotation(payload).subscribe({
      next: (res) => {
        this.rows = res.map(item => {
          const overrides = this.overridesMap.get(item.skuId);
          const quantity = overrides?.rowQuantity ?? 1;
          
          let offerExGst = item.offerExGst;
          if (overrides?.rowOfferOverride !== undefined) {
            offerExGst = overrides.rowOfferOverride;
          }

          return {
            skuId: item.skuId,
            categoryName: item.categoryName,
            skuName: item.skuName,
            spec: item.spec,
            unit: item.unit,
            rmCost: item.rmCost,
            mfgCost: item.mfgCost,
            rowMfgOverride: overrides?.rowMfgOverride,
            rowPctOverride: overrides?.rowPctOverride,
            rowAmtOverride: overrides?.rowAmtOverride,
            rowOfferOverride: overrides?.rowOfferOverride,
            offerExGst: offerExGst,
            quantity: quantity
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Calculation failed. Check overrides.', 'Close', { duration: 3000 });
      }
    });
  }

  public onRowQuantityChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    if (val === null || val === undefined || val === '') {
      override.rowQuantity = undefined;
    } else {
      override.rowQuantity = Number(val);
    }
    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public get totalOfferExGst(): number {
    return this.rows.reduce((sum, r) => sum + (r.offerExGst * r.quantity), 0);
  }

  public generateQuotation() {
    if (!this.partyName.trim()) {
      this.snackBar.open('Please enter Customer / Party Name.', 'Close', { duration: 3000 });
      return;
    }

    // Open preview dialog directly
    const previewRef = this.dialog.open(QuotationPreviewDialogComponent, {
      width: '95vw', maxWidth: '750px',
      data: {
        partyName: this.partyName,
        customerDetails: this.selectedCustomer,
        validityDays: this.validityDays,
        totalExGst: this.totalOfferExGst,
        lines: this.rows.map(r => ({
          description: `${r.categoryName} - ${r.skuName} ${r.spec}`,
          unit: r.unit,
          quantity: r.quantity,
          offerExGst: r.offerExGst
        }))
      }
    });

    previewRef.afterClosed().subscribe(result => {
      if (result) {
        const isDraft = result.action === 'draft';
        const payload = {
          id: this.editId || 0,
          partyName: this.partyName,
          validityDays: this.validityDays,
          isDraft: isDraft,
          lines: this.rows.map(r => ({
            skuId: r.skuId,
            rmCostSnapshot: r.rmCost,
            mfgCostSnapshot: r.mfgCost,
            offerExGst: r.offerExGst,
            quantity: r.quantity
          }))
        };

        const saveObs = this.editId 
          ? this.pricingService.updateQuotation(this.editId, payload)
          : this.pricingService.saveQuotation(payload);

        saveObs.subscribe({
          next: (res) => {
            this.snackBar.open(`Quotation ${isDraft ? 'draft saved' : 'generated'}: ${res.quotationNumber}`, 'Close', { duration: 5000 });

            // Clear state and draft
            this.overridesMap.clear();
            this.pricingService.selectedSkuIds.clear();
            this.rows = [];
            this.partyName = '';
            this.validityDays = 7;
            localStorage.removeItem('cabcon_draft_quotation');
            this.editId = null;
            this.router.navigate(['/dashboard'], { replaceUrl: true });
            this.cdr.detectChanges();
          },
          error: () => {
            this.snackBar.open('Failed to save quotation.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public cancel() {
    this.overridesMap.clear();
    this.pricingService.selectedSkuIds.clear();
    this.rows = [];
    this.partyName = '';
    this.validityDays = 7;
    localStorage.removeItem('cabcon_draft_quotation');
    this.hasDraft = false;
    
    if (this.editId) {
      this.editId = null;
      this.router.navigate(['/history'], { replaceUrl: true });
    } else {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
    
    this.recalculate();
  }
}

