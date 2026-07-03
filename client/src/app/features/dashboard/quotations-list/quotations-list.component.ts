import { ChangeDetectorRef, Component, Inject, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, QuotationSummary, QuotationDetails, QuotationLine } from '../../../core/pricing.service';
import { QuotationDetailDialogComponent } from '../quotation-detail-dialog/quotation-detail-dialog.component';



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
    templateUrl: './quotations-list.component.html',
    styleUrls: ['./quotations-list.component.scss']
})
export class QuotationsListComponent implements OnInit {
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  public displayedColumns = ['quoteNumber', 'partyName', 'date', 'totalExGst', 'totalGross', 'createdBy', 'actions'];
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
