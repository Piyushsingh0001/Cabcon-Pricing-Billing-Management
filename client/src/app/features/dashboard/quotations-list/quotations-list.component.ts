import { ChangeDetectorRef, Component, Inject, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PricingService, QuotationSummary, QuotationDetails, QuotationLine } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { QuotationDetailDialogComponent } from '../quotation-detail-dialog/quotation-detail-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [DatePipe],
    templateUrl: './quotations-list.component.html',
    styleUrls: ['./quotations-list.component.scss']
})
export class QuotationsListComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public displayedColumns = ['quoteNumber', 'partyName', 'date', 'totalExGst', 'createdBy', 'actions'];
  public dataSource = new MatTableDataSource<QuotationSummary>([]);
  public canApprove = this.authService.hasRole('Super Admin');
  public canDelete = this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  public canModify = this.authService.hasPermission('Quotation.Modify');
  public pendingOnly = false;

  ngOnInit() {
    this.pendingOnly = this.route.snapshot.data['pendingOnly'] === true;
    // Custom filter predicate to match formatted date and selected columns
    this.dataSource.filterPredicate = (data: QuotationSummary, filter: string) => {
      const searchStr = filter.toLowerCase();
      const dateStr = this.datePipe.transform(data.quotationDate, 'mediumDate')?.toLowerCase() || '';
      return (data.quotationNumber?.toLowerCase() || '').includes(searchStr) ||
             (data.partyName?.toLowerCase() || '').includes(searchStr) ||
             (data.createdBy?.toLowerCase() || '').includes(searchStr) ||
             dateStr.includes(searchStr);
    };
    this.loadQuotations();
  }

  public applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

private loadQuotations() {
  this.pricingService.getQuotations().subscribe({
    next: (res) => {

      let data = res ?? [];
      if (this.pendingOnly) {
        data = data.filter(q => q.approvalStatus === 0);
      } else {
        data = data.filter(q => q.approvalStatus !== 0);
      }
      this.dataSource.data = data;

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
        const dialogRef = this.dialog.open(QuotationDetailDialogComponent, {
          width: '750px',
          data: details
        });

        dialogRef.afterClosed().subscribe((newStatus: number | undefined | string) => {
          if (typeof newStatus === 'number') {
            quote.approvalStatus = newStatus;
            if (this.pendingOnly && newStatus !== 0) {
              this.dataSource.data = this.dataSource.data.filter(q => q.id !== quote.id);
            } else {
              this.dataSource.data = [...this.dataSource.data];
            }
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to fetch quotation details.', 'Close', { duration: 3000 });
      }
    });
  }

  public approve(quote: QuotationSummary, status: number) {
    this.pricingService.approveQuotation(quote.id, status).subscribe({
      next: () => {
        quote.approvalStatus = status;
        if (this.pendingOnly && status !== 0) {
          this.dataSource.data = this.dataSource.data.filter(q => q.id !== quote.id);
        } else {
          this.dataSource.data = [...this.dataSource.data];
        }
        this.pricingService.pendingApprovalUpdated.next();
        this.snackBar.open(status === 1 ? 'Quotation Approved' : 'Quotation Rejected', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to update approval status.', 'Close', { duration: 3000 });
      }
    });
  }


  public editQuotation(quote: QuotationSummary) {
    this.router.navigate(['/dashboard'], { queryParams: { edit: quote.id } });
  }
}
