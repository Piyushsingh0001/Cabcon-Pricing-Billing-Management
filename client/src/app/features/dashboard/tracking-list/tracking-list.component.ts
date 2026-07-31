import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PricingService, TrackingSummaryDto, QuotationState } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { TrackingDetailDialogComponent } from './tracking-detail-dialog/tracking-detail-dialog.component';

@Component({
  selector: 'app-tracking-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './tracking-list.component.html',
  styleUrls: ['./tracking-list.component.scss']
})
export class TrackingListComponent implements OnInit, OnDestroy {
  public displayedColumns: string[] = [
    'quotationNumber', 
    'partyName', 
    'createdBy', 
    'sentForApprovalBy', 
    'approvedBy', 
    'status', 
    'quotationState',
    'createdDate', 
    'actions'
  ];

  public trackingSummaries: TrackingSummaryDto[] = [];
  public filteredSummaries = new MatTableDataSource<TrackingSummaryDto>();
  public isLoading = false;
  
  public quotationStates = [
    { value: QuotationState.SentToCustomer, label: 'Sent to Customer' },
    { value: QuotationState.Accepted, label: 'Accepted' },
    { value: QuotationState.Rejected, label: 'Rejected' },
    { value: QuotationState.RequestForModification, label: 'Request for modification' }
  ];
  public QuotationState = QuotationState;

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(
    private pricingService: PricingService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSummaries();

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.filterData(term);
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadSummaries(): void {
    this.isLoading = true;
    this.pricingService.getTrackingSummaries().subscribe({
      next: (data: TrackingSummaryDto[]) => {
        this.trackingSummaries = data || [];
        this.filteredSummaries.data = [...this.trackingSummaries];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  filterData(term: string): void {
    const search = (term || '').trim().toLowerCase();

    if (!search) {
      this.filteredSummaries.data = [...this.trackingSummaries];
      return;
    }

    this.filteredSummaries.data = this.trackingSummaries.filter(x =>
      (x.quotationNumber ?? '').toLowerCase().includes(search) ||
      (x.partyName ?? '').toLowerCase().includes(search) ||
      (x.createdBy ?? '').toLowerCase().includes(search) ||
      (x.sentForApprovalBy ?? '').toLowerCase().includes(search) ||
      (x.approvedBy ?? '').toLowerCase().includes(search) ||
      (x.status ?? '').toLowerCase().includes(search)
    );
  }

  openTrackingTimeline(summary: TrackingSummaryDto): void {
    this.dialog.open(TrackingDetailDialogComponent, {
      width: '95vw', maxWidth: '600px',
      data: summary
    });
  }

  hasStatePermission(): boolean {
    return this.authService.hasPermission('Quotation.State');
  }

  isStateLocked(state: number | null): boolean {
    return state === QuotationState.Accepted || state === QuotationState.Rejected;
  }

  getStateClass(state: number | null): string {
    switch (state) {
      case QuotationState.SentToCustomer: return 'state-sent';
      case QuotationState.Accepted: return 'state-accepted';
      case QuotationState.Rejected: return 'state-rejected';
      case QuotationState.RequestForModification: return 'state-request';
      default: return '';
    }
  }

  onStateChange(summary: TrackingSummaryDto, newState: number): void {
    if (this.isStateLocked(summary.quotationState)) {
      this.snackBar.open('Quotation is locked and cannot be changed.', 'Close', { duration: 3000 });
      return;
    }
    this.pricingService.changeQuotationState(summary.quotationId, newState).subscribe({
      next: () => {
        summary.quotationState = newState;
        this.snackBar.open('Quotation state updated successfully.', 'Close', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(err.error || 'Failed to update quotation state.', 'Close', { duration: 3000 });
        this.loadSummaries();
      }
    });
  }

  editQuotation(summary: TrackingSummaryDto): void {
    this.router.navigate(['/dashboard'], { queryParams: { edit: summary.quotationId } });
  }
}
