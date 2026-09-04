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
import { BomBreakupDialogComponent } from './bom-breakup-dialog/bom-breakup-dialog.component';

interface CalculatorRow {
  skuId: number;
  categoryName: string;
  skuName: string;
  spec: string;
  unit: string;
  rmCost: number;
  mfgCost: number;
  totalBomWeight: number;
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
  public partyAddress: string = '';
  public selectedCustomer: CustomerSummary | null = null;
  public validityDays: number = 7;

  public customerAddresses: string[] = [];
  public customerDefaultAddressIndex: number = 0;
  public customers: CustomerSummary[] = [];
  public filteredCustomers: CustomerSummary[] = [];

  // Selected SKUs to hold overrides state
  public overridesMap = new Map<number, {
    rowMfgOverride?: number;
    rowConversionTypeOverride?: number;
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
        this.partyAddress = quote.partyAddress || '';
        this.validityDays = quote.validityDays;
        
        this.pricingService.clearSelectedSkus();
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
    if (match) {
      this.onCustomerSelected(match);
    } else {
      this.selectedCustomer = null;
      this.customerAddresses = [];
      this.customerDefaultAddressIndex = 0;
      this.partyAddress = '';
    }
  }

  public onCustomerSelected(customer: CustomerSummary) {
    this.selectedCustomer = customer;
    this.partyName = customer.name;
    
    this.customerAddresses = [];
    let defaultIndex = 0;
    if (customer.address) {
      try {
        const parsed = JSON.parse(customer.address);
        if (Array.isArray(parsed)) {
          this.customerAddresses = parsed;
        } else if (parsed && Array.isArray(parsed.addresses)) {
          this.customerAddresses = parsed.addresses;
          defaultIndex = parsed.defaultIndex || 0;
        } else {
          this.customerAddresses = [customer.address];
        }
      } catch {
        this.customerAddresses = [customer.address];
      }
    }
    
    if (this.customerAddresses.length > 0) {
      if (defaultIndex >= this.customerAddresses.length) {
        defaultIndex = 0;
      }
      this.customerDefaultAddressIndex = defaultIndex;
      this.partyAddress = this.customerAddresses[defaultIndex];
    } else {
      this.customerDefaultAddressIndex = 0;
    }
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
    
    const isSearching = !!(this.searchQuery && this.searchQuery.trim().length > 0);

    this.groupedSkusList = Object.keys(groups).map(categoryName => {
      const productNames = Object.keys(groups[categoryName]);
      const products = productNames.map(productName => ({
        productName,
        items: groups[categoryName][productName]
      }));
      if (isSearching) {
        this.collapsedCategories.delete(categoryName);
      } else {
        this.collapsedCategories.add(categoryName);
      }
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
    const overrides = this.overridesMap.get(skuId);
    if (overrides && overrides.rowConversionTypeOverride !== undefined) {
      return overrides.rowConversionTypeOverride;
    }
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
          this.pricingService.clearSelectedSkus();
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
    this.pricingService.clearSelectedSkus();
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
    const convType = this.getSkuConversionType(skuId);
    if (overrides && overrides.rowMfgOverride !== undefined) {
      const val = overrides.rowMfgOverride;
      if (convType === 0) {
        return Math.min(100, Math.round(val * 100 * 100) / 100);
      }
      return val;
    }
    return 0;
  }

  public onMfgOverrideChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    if (val === null || val === undefined || val === '') {
      override.rowMfgOverride = undefined;
    } else {
      let numVal = Number(val);
      if (isNaN(numVal)) numVal = 0;
      if (this.getSkuConversionType(skuId) === 0) {
        if (numVal > 100) numVal = 100;
        if (numVal < 0) numVal = 0;
        override.rowMfgOverride = numVal / 100;
      } else {
        override.rowMfgOverride = numVal;
      }
    }
    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public onMfgTypeChange(skuId: number, val: any) {
    const override = this.overridesMap.get(skuId) || {};
    const newType = Number(val);
    override.rowConversionTypeOverride = newType;
    const currentDisplay = this.getMfgDisplayValue(skuId);
    if (newType === 0) {
      let pct = currentDisplay > 100 ? 100 : currentDisplay;
      override.rowMfgOverride = pct / 100;
    } else {
      override.rowMfgOverride = currentDisplay;
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

  public getCalculatedLoadingCost(element: CalculatorRow): number {
    const overrides = this.overridesMap.get(element.skuId);
    const mode = this.loadingMode();
    if (mode === 0) {
      const pct = overrides?.rowPctOverride ?? this.globalPct();
      return element.rmCost * pct;
    } else if (mode === 1) {
      const amt = overrides?.rowAmtOverride ?? this.globalAmt();
      return amt;
    } else if (mode === 2) {
      const overhead = this.globalOverheadPct();
      const margin = this.globalMarginPct();
      const packing = this.globalPacking();
      const freight = this.globalFreight();
      return element.rmCost * (overhead + margin) + packing + freight;
    }
    return 0;
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
      rowOfferOverride: value.rowOfferOverride,
      rowConversionTypeOverride: value.rowConversionTypeOverride
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
          const sku = this.skus.find(s => s.id === item.skuId);
          const skuQty = sku?.quantity && sku.quantity > 0 ? sku.quantity : 1;
          const userQty = overrides?.rowQuantity ?? 1;
          const convType = this.getSkuConversionType(item.skuId);
          
          let convVal = overrides?.rowMfgOverride ?? 0;
          if (convType === 0 && convVal > 1) {
            convVal = 1; // Cap at 100% max
          }

          const totalRmCost = item.rmCost * skuQty;
          const totalBomWeight = sku && sku.bomLines ? sku.bomLines.reduce((acc, b) => acc + (b.weightKg || 0), 0) : 0;

          let rowMfgCost = 0;
          if (convType === 0) {
            rowMfgCost = (totalRmCost * convVal);
          } else {
            rowMfgCost = totalBomWeight * convVal;
          }

          let offerExGst = 0;
          const mode = this.loadingMode();
          if (overrides?.rowOfferOverride !== undefined) {
            offerExGst = overrides.rowOfferOverride;
          } else if (mode === 0) {
            const pct = overrides?.rowPctOverride ?? this.globalPct();
            // Loading cost calculated on RM Total
            offerExGst = totalRmCost + rowMfgCost + (totalRmCost * pct);
          } else if (mode === 1) {
            const amt = overrides?.rowAmtOverride ?? this.globalAmt();
            offerExGst = totalRmCost + rowMfgCost + amt;
          } else if (mode === 2) {
            const overhead = this.globalOverheadPct();
            const margin = this.globalMarginPct();
            const packing = this.globalPacking();
            const freight = this.globalFreight();
            offerExGst = totalRmCost + rowMfgCost + (totalRmCost * (overhead + margin)) + packing + freight;
          } else {
            offerExGst = totalRmCost + rowMfgCost;
          }

          return {
            skuId: item.skuId,
            categoryName: item.categoryName,
            skuName: item.skuName,
            spec: item.spec,
            unit: `${skuQty} ${sku?.unit || item.unit}`,
            rmCost: totalRmCost,
            mfgCost: rowMfgCost,
            totalBomWeight: totalBomWeight,
            rowMfgOverride: overrides?.rowMfgOverride,
            rowPctOverride: overrides?.rowPctOverride,
            rowAmtOverride: overrides?.rowAmtOverride,
            rowOfferOverride: overrides?.rowOfferOverride,
            offerExGst: offerExGst,
            quantity: userQty
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

  public viewBomBreakup(skuId: number) {
    const sku = this.skus.find(s => s.id === skuId);
    if (!sku) return;
    const row = this.rows.find(r => r.skuId === skuId);
    const overrides = this.overridesMap.get(skuId);

    const openModal = (targetSku: Sku) => {
      const quantityToUse = row?.quantity ?? overrides?.rowQuantity ?? (targetSku.quantity && targetSku.quantity > 0 ? targetSku.quantity : 1);
      const rmCostToUse = row?.rmCost ?? (targetSku.rawMaterialCost ? (targetSku.rawMaterialCost * quantityToUse) : undefined);

      this.dialog.open(BomBreakupDialogComponent, {
        panelClass: 'dialog-tier-lg',
        data: {
          sku: targetSku,
          materials: this.materials,
          rowMfgOverride: overrides?.rowMfgOverride,
          rowConversionTypeOverride: overrides?.rowConversionTypeOverride,
          rowPctOverride: overrides?.rowPctOverride,
          rowAmtOverride: overrides?.rowAmtOverride,
          rowOfferOverride: overrides?.rowOfferOverride,
          loadingMode: this.loadingMode(),
          globalPct: this.globalPct(),
          globalAmt: this.globalAmt(),
          globalOverheadPct: this.globalOverheadPct(),
          globalMarginPct: this.globalMarginPct(),
          globalPacking: this.globalPacking(),
          globalFreight: this.globalFreight(),
          quantity: quantityToUse,
          rmCost: rmCostToUse,
          mfgCost: row?.mfgCost,
          offerExGst: row?.offerExGst
        }
      });
    };

    this.pricingService.getSku(skuId).subscribe({
      next: (fullSku) => openModal(fullSku),
      error: () => openModal(sku)
    });
  }

  public generateQuotation() {
    if (!this.partyName.trim()) {
      this.snackBar.open('Please enter Customer / Party Name.', 'Close', { duration: 3000 });
      return;
    }

    // Open preview dialog directly
    const previewRef = this.dialog.open(QuotationPreviewDialogComponent, {
      panelClass: 'dialog-tier-lg',
      data: {
        partyName: this.partyName,
        partyAddress: this.partyAddress,
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
          partyAddress: this.partyAddress,
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
            this.pricingService.clearSelectedSkus();
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
    this.pricingService.clearSelectedSkus();
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

