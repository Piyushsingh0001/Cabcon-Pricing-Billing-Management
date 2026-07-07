import { ChangeDetectorRef, Component, Inject, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, QuotationSummary, QuotationDetails, QuotationLine } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { QuotationsListComponent } from '../quotations-list/quotations-list.component';



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
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<QuotationDetailDialogComponent>);

  public canApprove = this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');

  constructor(
    @Inject(MAT_DIALOG_DATA) public quote: QuotationDetails
  ) {}

  public printQuote() {
    window.print();
  }

  public approve(status: number) {
    this.pricingService.approveQuotation(this.quote.id, status).subscribe({
      next: () => {
        this.quote.approvalStatus = status;
        this.pricingService.pendingApprovalUpdated.next();
        this.snackBar.open(status === 1 ? 'Quotation Approved' : 'Quotation Rejected', 'Close', { duration: 3000 });
        this.dialogRef.close(status);
      },
      error: () => {
        this.snackBar.open('Failed to update approval status.', 'Close', { duration: 3000 });
      }
    });
  }
}
