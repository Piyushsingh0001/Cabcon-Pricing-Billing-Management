import { Component, Inject, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, CalculatedQuotationItem, Sku, Material } from '../../core/pricing.service';
import { ProductSelectDialogComponent } from './product-select-dialog/product-select-dialog.component';
import { QuotationSaveDialogComponent } from './quotation-save-dialog/quotation-save-dialog.component';

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
  gstPercent: number;
  gstAmount: number;
  grossRate: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule
  ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public columns = ['product', 'rmCost', 'mfgOverride', 'markupOverride', 'offerOverride', 'effectiveRate', 'gst', 'netOffer'];
  public rows: CalculatorRow[] = [];

  // Global settings
  public loadingMode = signal<number>(0);
  public globalPct = signal<number>(0.05);
  public globalAmt = signal<number>(10);
  public globalOverheadPct = signal<number>(0.05);
  public globalMarginPct = signal<number>(0.05);
  public globalPacking = signal<number>(2);
  public globalFreight = signal<number>(3);

  // Selected SKUs to hold overrides state
  private overridesMap = new Map<number, {
    rowMfgOverride?: number;
    rowPctOverride?: number;
    rowAmtOverride?: number;
    rowOfferOverride?: number;
  }>();

  ngOnInit() {
    this.recalculate();
  }

  public onModeChange(value: number) {
    this.loadingMode.set(value);
    this.recalculate();
  }

  public updateGlobalParam(type: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    switch (type) {
      case 'pct': this.globalPct.set(val); break;
      case 'amt': this.globalAmt.set(val); break;
      case 'overhead': this.globalOverheadPct.set(val); break;
      case 'margin': this.globalMarginPct.set(val); break;
      case 'packing': this.globalPacking.set(val); break;
      case 'freight': this.globalFreight.set(val); break;
    }
    this.recalculate();
  }

  public updateRowOverride(skuId: number, type: 'mfg' | 'pct' | 'amt' | 'offer', event: Event) {
    const valStr = (event.target as HTMLInputElement).value;
    const val = valStr === '' ? undefined : parseFloat(valStr);

    const override = this.overridesMap.get(skuId) || {};
    if (type === 'mfg') override.rowMfgOverride = val;
    else if (type === 'pct') override.rowPctOverride = val;
    else if (type === 'amt') override.rowAmtOverride = val;
    else if (type === 'offer') override.rowOfferOverride = val;

    this.overridesMap.set(skuId, override);
    this.recalculate();
  }

  public recalculate() {
    if (this.overridesMap.size === 0) {
      this.rows = [];
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

    this.pricingService.calculateQuotation(payload).subscribe({
      next: (res) => {
        this.rows = res.map(item => {
          const overrides = this.overridesMap.get(item.skuId);
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
            offerExGst: item.offerExGst,
            gstPercent: item.gstPercent,
            gstAmount: item.gstAmount,
            grossRate: item.grossRate
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Calculation failed. Check overrides.', 'Close', { duration: 3000 });
      }
    });
  }

  public selectProducts() {
    this.pricingService.getSkus(undefined, undefined, undefined, false, 1, 100).subscribe({
      next: (res) => {
        const dialogRef = this.dialog.open(ProductSelectDialogComponent, {
          width: '550px',
          data: {
            skus: res.items,
            selectedIds: Array.from(this.overridesMap.keys())
          }
        });

        dialogRef.afterClosed().subscribe((selectedIds: number[] | null) => {
          if (selectedIds !== null) {
            // Rebuild map preserving existing overrides
            const newMap = new Map<number, any>();
            selectedIds.forEach(id => {
              newMap.set(id, this.overridesMap.get(id) || {});
            });
            this.overridesMap = newMap;
            this.recalculate();
          }
        });
      }
    });
  }

  public saveQuotation() {
    // Generate description basis basis details
    const priceBasis = this.rows.map(r => `${r.skuName} (${r.spec}) ex-GST: ₹${r.offerExGst}/unit`).slice(0, 3).join(', ') + (this.rows.length > 3 ? '...' : '');
    
    const dialogRef = this.dialog.open(QuotationSaveDialogComponent, {
      width: '500px',
      data: {
        priceBasisNote: `Pricing Mode: ${this.loadingMode() === 0 ? 'Percentage' : this.loadingMode() === 1 ? 'Amount' : 'Itemised'} Basis: ${priceBasis}`
      }
    });

    dialogRef.afterClosed().subscribe(formValue => {
      if (formValue) {
        const payload = {
          partyName: formValue.partyName,
          validityDays: parseInt(formValue.validityDays),
          priceBasisNote: formValue.priceBasisNote,
          lines: this.rows.map(r => ({
            skuId: r.skuId,
            rmCostSnapshot: r.rmCost,
            mfgCostSnapshot: r.mfgCost,
            offerExGst: r.offerExGst,
            gstPercent: r.gstPercent,
            gstAmount: r.gstAmount,
            grossRate: r.grossRate
          }))
        };

        this.pricingService.saveQuotation(payload).subscribe({
          next: (res) => {
            this.snackBar.open(`Quotation saved successfully: ${res.quotationNumber}`, 'Close', { duration: 5000 });
            
            // Download PDF
            this.pricingService.downloadQuotationPdf(res.id).subscribe({
              next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Quotation_${res.quotationNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              },
              error: () => this.snackBar.open('Failed to download PDF.', 'Close', { duration: 3000 })
            });

            // Clear sheet
            this.overridesMap.clear();
            this.rows = [];
          },
          error: () => {
            this.snackBar.open('Failed to save quotation.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
