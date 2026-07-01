import { ChangeDetectorRef, Component, Inject, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, QuotationSummary, QuotationDetails, QuotationLine } from '../../core/pricing.service';
import { QuotationsListComponent } from './quotations-list.component';



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
    templateUrl: './quotation-detail-dialog.component.html',
    styleUrls: ['./quotation-detail-dialog.component.scss']
})
export class QuotationDetailDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public quote: QuotationDetails
  ) {}

  public printQuote() {
    window.print();
  }
}
