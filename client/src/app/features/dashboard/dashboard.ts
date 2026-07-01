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
  template: `
    <div class="dashboard-container animated-view">
      <div class="header-section">
        <div>
          <h1>Pricing Calculation Sheet</h1>
          <p class="subtitle">Stateless interactive cost estimator & quotation generator</p>
        </div>
        <div class="action-buttons">
          <button mat-stroked-button color="primary" (click)="selectProducts()">
            <mat-icon>add_shopping_cart</mat-icon>
            Add/Remove SKUs ({{rows.length}})
          </button>
          <button mat-flat-button class="btn-secondary" (click)="saveQuotation()" [disabled]="rows.length === 0">
            <mat-icon>save</mat-icon>
            Save Quotation
          </button>
        </div>
      </div>

      <!-- Global Parameters Card -->
      <div class="glass-card parameters-card">
        <h3>Global Loadings & Markups</h3>
        <div class="row">
          <mat-form-field appearance="outline" class="loading-mode-select">
            <mat-label>Loading Mode</mat-label>
            <mat-select [value]="loadingMode()" (selectionChange)="onModeChange($event.value)">
              <mat-option [value]="0">Simple Percentage (%)</mat-option>
              <mat-option [value]="1">Simple Amount (₹/kg)</mat-option>
              <mat-option [value]="2">Itemised Loadings</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row parameters-grid">
          <!-- Simple Percentage Inputs -->
          <ng-container *ngIf="loadingMode() === 0">
            <mat-form-field appearance="outline">
              <mat-label>Global Percentage Markup (e.g. 0.05 for 5%)</mat-label>
              <input matInput type="number" step="0.01" [value]="globalPct()" (change)="updateGlobalParam('pct', $event)">
            </mat-form-field>
          </ng-container>

          <!-- Simple Amount Inputs -->
          <ng-container *ngIf="loadingMode() === 1">
            <mat-form-field appearance="outline">
              <mat-label>Global Fixed Markup (₹/kg)</mat-label>
              <input matInput type="number" step="1" [value]="globalAmt()" (change)="updateGlobalParam('amt', $event)">
            </mat-form-field>
          </ng-container>

          <!-- Itemised Inputs -->
          <ng-container *ngIf="loadingMode() === 2">
            <mat-form-field appearance="outline">
              <mat-label>Overhead (%)</mat-label>
              <input matInput type="number" step="0.01" [value]="globalOverheadPct()" (change)="updateGlobalParam('overhead', $event)">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Margin (%)</mat-label>
              <input matInput type="number" step="0.01" [value]="globalMarginPct()" (change)="updateGlobalParam('margin', $event)">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Packing (₹/kg)</mat-label>
              <input matInput type="number" step="0.5" [value]="globalPacking()" (change)="updateGlobalParam('packing', $event)">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Freight (₹/kg)</mat-label>
              <input matInput type="number" step="0.5" [value]="globalFreight()" (change)="updateGlobalParam('freight', $event)">
            </mat-form-field>
          </ng-container>
        </div>
      </div>

      <!-- Spreadsheet Table Card -->
      <div class="table-container glass-card" *ngIf="rows.length > 0; else noProducts">
        <table mat-table [dataSource]="rows">
          <!-- Description -->
          <ng-container matColumnDef="product">
            <th mat-header-cell *matHeaderCellDef>Product Spec</th>
            <td mat-cell *matCellDef="let element">
              <div class="desc-cell">
                <span class="cat">{{element.categoryName}}</span>
                <span class="name">{{element.skuName}}</span>
                <span class="spec">{{element.spec}} ({{element.unit}})</span>
              </div>
            </td>
          </ng-container>

          <!-- RM Cost -->
          <ng-container matColumnDef="rmCost">
            <th mat-header-cell *matHeaderCellDef>RM Cost</th>
            <td mat-cell *matCellDef="let element">₹{{element.rmCost | number:'1.2-2'}}</td>
          </ng-container>

          <!-- Mfg Override -->
          <ng-container matColumnDef="mfgOverride">
            <th mat-header-cell *matHeaderCellDef>Mfg Cost (Override)</th>
            <td mat-cell *matCellDef="let element">
              <div class="override-cell">
                <span class="base-val">₹{{element.mfgCost | number:'1.2-2'}}</span>
                <input class="table-input" type="number" step="0.01" placeholder="Override ₹"
                       [value]="element.rowMfgOverride ?? ''"
                       (change)="updateRowOverride(element.skuId, 'mfg', $event)">
              </div>
            </td>
          </ng-container>

          <!-- Markup Override -->
          <ng-container matColumnDef="markupOverride">
            <th mat-header-cell *matHeaderCellDef>Markup Override</th>
            <td mat-cell *matCellDef="let element">
              <!-- Percentage loading mode -->
              <input *ngIf="loadingMode() === 0" class="table-input" type="number" step="0.01" placeholder="Override %"
                     [value]="element.rowPctOverride !== undefined ? element.rowPctOverride : ''"
                     (change)="updateRowOverride(element.skuId, 'pct', $event)">
              
              <!-- Fixed amount loading mode -->
              <input *ngIf="loadingMode() === 1" class="table-input" type="number" step="1" placeholder="Override ₹/kg"
                     [value]="element.rowAmtOverride !== undefined ? element.rowAmtOverride : ''"
                     (change)="updateRowOverride(element.skuId, 'amt', $event)">
              
              <span *ngIf="loadingMode() === 2" class="muted-text">Itemised</span>
            </td>
          </ng-container>

          <!-- Final Offer Override -->
          <ng-container matColumnDef="offerOverride">
            <th mat-header-cell *matHeaderCellDef>Offer Override (ex-GST)</th>
            <td mat-cell *matCellDef="let element">
              <input class="table-input" type="number" step="1" placeholder="Final ex-GST ₹"
                     [value]="element.rowOfferOverride ?? ''"
                     (change)="updateRowOverride(element.skuId, 'offer', $event)">
            </td>
          </ng-container>

          <!-- Effective Rate -->
          <ng-container matColumnDef="effectiveRate">
            <th mat-header-cell *matHeaderCellDef>Offer Ex-GST</th>
            <td mat-cell *matCellDef="let element" class="ex-gst-cell">₹{{element.offerExGst | number:'1.2-2'}}</td>
          </ng-container>

          <!-- GST details -->
          <ng-container matColumnDef="gst">
            <th mat-header-cell *matHeaderCellDef>GST</th>
            <td mat-cell *matCellDef="let element">
              <div class="gst-cell">
                <span class="pct">{{element.gstPercent * 100 | number}}%</span>
                <span class="amt">₹{{element.gstAmount | number:'1.2-2'}}</span>
              </div>
            </td>
          </ng-container>

          <!-- Net Offer -->
          <ng-container matColumnDef="netOffer">
            <th mat-header-cell *matHeaderCellDef>Net Rate (incl-GST)</th>
            <td mat-cell *matCellDef="let element" class="gross-cell">₹{{element.grossRate | number:'1.2-2'}}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </div>

      <ng-template #noProducts>
        <div class="no-products-placeholder glass-card animated-view">
          <mat-icon>shopping_basket</mat-icon>
          <h3>Your Pricing Sheet is Empty</h3>
          <p>Click "Add/Remove SKUs" above to select products and start estimating rates.</p>
          <button mat-flat-button class="btn-primary" (click)="selectProducts()">Select Products</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }
    .subtitle {
      color: var(--text-secondary);
      margin: 0;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
    }
    .parameters-card {
      padding: 24px;
    }
    .parameters-card h3 {
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    .row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .loading-mode-select {
      width: 250px;
    }
    .parameters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      width: 100%;
    }
    .table-container {
      padding: 8px;
      overflow-x: auto;
    }
    .desc-cell {
      display: flex;
      flex-direction: column;
      padding: 8px 0;
    }
    .desc-cell .cat {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 600;
    }
    .desc-cell .name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .desc-cell .spec {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .override-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .base-val {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .table-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      border-radius: 4px;
      padding: 4px 8px;
      width: 100px;
      font-size: 13px;
    }
    .table-input:focus {
      outline: none;
      border-color: #6366f1;
    }
    .ex-gst-cell {
      font-weight: 600;
      color: var(--text-primary);
    }
    .gst-cell {
      display: flex;
      flex-direction: column;
    }
    .gst-cell .pct {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .gst-cell .amt {
      font-weight: 500;
    }
    .gross-cell {
      font-weight: 700;
      color: #34d399;
    }
    .no-products-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;
    }
    .no-products-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .no-products-placeholder h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .no-products-placeholder p {
      color: var(--text-secondary);
      margin-bottom: 24px;
      max-width: 400px;
    }
  `]
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

// --- DIALOG FOR SELECTING SKUS ---
@Component({
  selector: 'app-product-select',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Select Products for Estimator</h2>
    <mat-dialog-content class="dialog-content">
      <div class="product-selection-list">
        <div *ngFor="let sku of skus" class="product-selection-row">
          <mat-checkbox [checked]="isSelected(sku.id)" (change)="toggleSelection(sku.id)">
            <div class="sku-info">
              <span class="name">{{sku.name}}</span>
              <span class="spec">{{sku.spec}} - {{sku.categoryName}}</span>
            </div>
          </mat-checkbox>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button class="btn-primary" (click)="onSave()">Apply Selection ({{selectedIds.size}})</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      max-height: 400px;
      overflow-y: auto;
    }
    .product-selection-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .product-selection-row {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-glass);
    }
    .sku-info {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }
    .sku-info .name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .sku-info .spec {
      font-size: 12px;
      color: var(--text-secondary);
    }
  `]
})
export class ProductSelectDialogComponent {
  public skus: Sku[] = [];
  public selectedIds = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<ProductSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { skus: Sku[], selectedIds: number[] }
  ) {
    this.skus = data.skus;
    this.selectedIds = new Set<number>(data.selectedIds);
  }

  public isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  public toggleSelection(id: number) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  public onCancel() {
    this.dialogRef.close(null);
  }

  public onSave() {
    this.dialogRef.close(Array.from(this.selectedIds));
  }
}

// --- DIALOG FOR SAVING QUOTATION ---
@Component({
  selector: 'app-quotation-save',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Save Quotation Snapshot</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="save-form">
        <mat-form-field appearance="outline">
          <mat-label>Customer / Party Name</mat-label>
          <input matInput formControlName="partyName" placeholder="e.g. Tata Power Ltd">
          <mat-error *ngIf="form.get('partyName')?.hasError('required')">Party Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Validity Period (Days)</mat-label>
          <input matInput formControlName="validityDays" type="number">
          <mat-error *ngIf="form.get('validityDays')?.hasError('required')">Validity period is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Price Basis / Notes</mat-label>
          <textarea matInput formControlName="priceBasisNote" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="form.invalid" (click)="onSubmit()">Generate Quotation</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .save-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }
  `]
})
export class QuotationSaveDialogComponent {
  private fb = inject(FormBuilder);
  public form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<QuotationSaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { priceBasisNote: string }
  ) {
    this.form = this.fb.group({
      partyName: ['', Validators.required],
      validityDays: [30, [Validators.required, Validators.min(1)]],
      priceBasisNote: [data.priceBasisNote, Validators.required]
    });
  }

  public onSubmit() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }
}
