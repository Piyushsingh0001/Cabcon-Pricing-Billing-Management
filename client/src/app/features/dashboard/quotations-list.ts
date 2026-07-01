import { ChangeDetectorRef, Component, Inject, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, QuotationSummary, QuotationDetails, QuotationLine } from '../../core/pricing.service';

// --- MAIN LIST COMPONENT ---
@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="quotations-container animated-view">
      <div class="header-section">
        <div>
          <h1>Saved Quotations History</h1>
          <p class="subtitle">View and audit previously generated quotation snapshots</p>
        </div>
      </div>
     <div class="table-container glass-card"  *ngIf="dataSource.length > 0; else noQuotations">
        <table mat-table [dataSource]="dataSource" *ngIf="dataSource.length > 0">
          <!-- Quote Number Column -->
          <ng-container matColumnDef="quoteNumber">
            <th mat-header-cell *matHeaderCellDef>Quotation Number</th>
            <td mat-cell *matCellDef="let element" class="number-cell">{{element.quotationNumber}}</td>
          </ng-container>

          <!-- Customer Column -->
          <ng-container matColumnDef="partyName">
            <th mat-header-cell *matHeaderCellDef>Customer / Party Name</th>
            <td mat-cell *matCellDef="let element" class="party-cell">{{element.partyName}}</td>
          </ng-container>

          <!-- Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Generation Date</th>
            <td mat-cell *matCellDef="let element">{{element.quotationDate | date:'mediumDate'}}</td>
          </ng-container>

          <!-- Total ex-GST Column -->
          <ng-container matColumnDef="totalExGst">
            <th mat-header-cell *matHeaderCellDef>Total ex-GST</th>
            <td mat-cell *matCellDef="let element">₹{{element.totalExGst | number:'1.2-2'}}</td>
          </ng-container>

          <!-- Total Gross Column -->
          <ng-container matColumnDef="totalGross">
            <th mat-header-cell *matHeaderCellDef>Total Gross</th>
            <td mat-cell *matCellDef="let element" class="gross-cell">₹{{element.totalGross | number:'1.2-2'}}</td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let element">
              <button mat-flat-button class="btn-primary" (click)="viewDetails(element)" title="View Details Sheet">
                <mat-icon>receipt</mat-icon>
                View
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <ng-template #noQuotations>
        <div class="no-quotes-placeholder glass-card animated-view">
          <mat-icon>description</mat-icon>
          <h3>No Saved Quotations Found</h3>
          <p>Go to the Calculator Dashboard, select products, compute rates, and save a quotation.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .quotations-container {
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
    .table-container {
      padding: 8px;
      overflow-x: auto;
    }
    .number-cell {
      font-weight: 600;
      color: var(--text-primary);
    }
    .party-cell {
      font-weight: 500;
    }
    .gross-cell {
      font-weight: 700;
      color: #34d399;
    }
    .no-quotes-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 32px;
      text-align: center;
    }
    .no-quotes-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .no-quotes-placeholder h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }
    .no-quotes-placeholder p {
      color: var(--text-secondary);
      margin-bottom: 24px;
      max-width: 400px;
    }
  `]
})
export class QuotationsListComponent implements OnInit {
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public displayedColumns = ['quoteNumber', 'partyName', 'date', 'totalExGst', 'totalGross', 'actions'];
  public dataSource: QuotationSummary[] = [];
 

  ngOnInit() {
    this.loadQuotations();
  }

private loadQuotations() {
  this.pricingService.getQuotations().subscribe({
    next: (res) => {

      this.dataSource = res ?? [];

      this.cdr.detectChanges();

    },
    error: () => {
      this.snackBar.open(
        'Failed to load quotations history.',
        'Close',
        { duration: 3000 }
      );
    }
  });
}
  public viewDetails(quote: QuotationSummary) {
    this.pricingService.getQuotation(quote.id).subscribe({
      next: (details) => {
        this.dialog.open(QuotationDetailDialogComponent, {
          width: '750px',
          data: details
        });
      },
      error: () => {
        this.snackBar.open('Failed to fetch quotation details.', 'Close', { duration: 3000 });
      }
    });
  }
}

// --- DIALOG FOR VIEWING DETAILED QUOTATION PRINT SHEET ---
@Component({
  selector: 'app-quotation-detail-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="print-header-actions" mat-dialog-title>
      <h2>Quotation Details: {{quote.quotationNumber}}</h2>
      <button mat-stroked-button color="primary" (click)="printQuote()">
        <mat-icon>print</mat-icon> Print Sheet
      </button>
    </div>
    
    <mat-dialog-content class="print-sheet-content">
      <div id="print-area" class="quotation-print-sheet">
        <div class="quote-header">
          <div class="company-logo-section">
            <img src="/Images/Logo.jpg" alt="CABCON INDIA LTD" class="company-logo">
          </div>
          <div class="meta-section">
            <div><strong>Quote Ref:</strong> {{quote.quotationNumber}}</div>
            <div><strong>Date:</strong> {{quote.quotationDate | date:'mediumDate'}}</div>
            <div><strong>Validity:</strong> {{quote.validityDays}} Days</div>
          </div>
        </div>

        <hr class="divider">

        <div class="client-details">
          <h3>Customer Details</h3>
          <div class="party-name"><strong>Party Name:</strong> {{quote.partyName}}</div>
        </div>

        <div class="lines-table-container">
          <table class="quote-lines-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item Description</th>
                <th>Unit</th>
                <th class="num">RM Cost (₹)</th>
                <th class="num">Mfg Cost (₹)</th>
                <th class="num">Rate ex-GST (₹)</th>
                <th class="num">GST (%)</th>
                <th class="num">Net Rate (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of quote.lines; let idx = index">
                <td>{{idx + 1}}</td>
                <td>{{line.descriptionSnapshot}}</td>
                <td>{{line.unit}}</td>
                <td class="num">{{line.rmCostSnapshot | number:'1.2-2'}}</td>
                <td class="num">{{line.mfgCostSnapshot | number:'1.2-2'}}</td>
                <td class="num highlight">{{line.offerExGst | number:'1.2-2'}}</td>
                <td class="num">{{line.gstPercent * 100 | number}}%</td>
                <td class="num highlight gross">{{line.grossRate | number:'1.2-2'}}</td>
              </tr>
              <!-- Summary Rows -->
              <tr class="summary-row separator">
                <td colspan="5" class="label">Total (Excluding GST):</td>
                <td colspan="3" class="num val">₹{{quote.totalExGst | number:'1.2-2'}}</td>
              </tr>
              <tr class="summary-row">
                <td colspan="5" class="label">Total GST Amount:</td>
                <td colspan="3" class="num val">₹{{quote.totalGst | number:'1.2-2'}}</td>
              </tr>
              <tr class="summary-row grand-total">
                <td colspan="5" class="label">Grand Total (Inclusive of GST):</td>
                <td colspan="3" class="num val highlight-green">₹{{quote.totalGross | number:'1.2-2'}}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="price-basis-disclaimer font-small">
          <p><strong>Price Basis Notes:</strong> {{quote.priceBasisNote}}</p>
          <p class="disclaimer-text">
            * This is a frozen quotation snapshot. Raw material prices (LME/Premium/Fx) and markups are captured at the time of quotation generation. Terms of delivery as agreed.
          </p>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .print-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-glass);
      padding-bottom: 12px;
    }
    .print-sheet-content {
      max-height: 70vh;
    }
    .quotation-print-sheet {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
      color: var(--text-primary);
    }
    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-logo-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .company-logo {
      height: 48px;
      object-fit: contain;
    }
    .meta-section {
      text-align: right;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .divider {
      border: 0;
      height: 1px;
      background: var(--border-glass);
      margin: 16px 0;
    }
    .client-details {
      margin-bottom: 24px;
    }
    .client-details h3 {
      font-size: 14px;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      color: var(--text-secondary);
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 16px;
    }
    .quote-lines-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .quote-lines-table th {
      text-align: left;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      border-bottom: 2px solid var(--border-glass);
      font-weight: 600;
      font-size: 13px;
    }
    .quote-lines-table td {
      padding: 8px;
      border-bottom: 1px solid var(--border-glass);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .quote-lines-table td.num, .quote-lines-table th.num {
      text-align: right;
    }
    .quote-lines-table td.highlight {
      color: var(--text-primary);
      font-weight: 500;
    }
    .quote-lines-table td.gross {
      color: #34d399;
      font-weight: 600;
    }
    .summary-row td {
      border-bottom: none;
      padding: 6px 8px;
    }
    .summary-row.separator td {
      border-top: 2px solid var(--border-glass);
      padding-top: 12px;
    }
    .summary-row .label {
      text-align: right;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .summary-row .val {
      font-weight: 600;
      color: var(--text-primary);
    }
    .summary-row.grand-total {
      font-size: 16px;
    }
    .summary-row.grand-total td {
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .summary-row.grand-total .label {
      color: var(--text-primary);
    }
    .highlight-green {
      color: #34d399 !important;
      font-weight: 700 !important;
    }
    .price-basis-disclaimer {
      margin-top: 32px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed var(--border-glass);
      border-radius: 6px;
    }
    .price-basis-disclaimer p {
      margin: 0 0 8px 0;
      font-size: 12px;
    }
    .disclaimer-text {
      color: var(--text-muted);
      margin: 0 !important;
      font-style: italic;
    }
    
    @media print {
      app-root, .print-header-actions, .cdk-overlay-backdrop, mat-dialog-actions {
        display: none !important;
      }
      
      .cdk-overlay-container, .cdk-global-overlay-wrapper, .cdk-overlay-pane, .mat-mdc-dialog-container, .mat-mdc-dialog-surface, .mat-mdc-dialog-panel {
        position: static !important;
        display: block !important;
        height: auto !important;
        max-height: none !important;
        width: 100% !important;
        max-width: 100% !important;
        transform: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .print-sheet-content {
        max-height: none !important;
        overflow: visible !important;
        padding: 0 !important;
      }

      #print-area {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        color: black !important;
      }

      .quote-header {
        display: flex !important;
        justify-content: space-between !important;
        width: 100% !important;
      }

      .meta-section {
        text-align: right !important;
        white-space: nowrap !important;
      }

      .quote-lines-table th {
        background: #f3f4f6 !important;
        color: black !important;
        border-bottom: 2px solid #d1d5db !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .quote-lines-table td {
        border-bottom: 1px solid #e5e7eb !important;
        color: #000 !important;
      }
      .gross, .highlight, .highlight-green, .val, .label {
        color: black !important;
      }
    }
  `]
})
export class QuotationDetailDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public quote: QuotationDetails
  ) {}

  public printQuote() {
    window.print();
  }
}
