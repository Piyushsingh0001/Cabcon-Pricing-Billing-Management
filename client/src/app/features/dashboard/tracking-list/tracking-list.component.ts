import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PricingService, TrackingSummaryDto } from '../../../core/pricing.service';
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
    MatTooltipModule
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
    'createdDate', 
    'actions'
  ];

  public trackingSummaries: TrackingSummaryDto[] = [];
  public filteredSummaries = new MatTableDataSource<TrackingSummaryDto>();
  public isLoading = false;

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(
    private pricingService: PricingService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
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
      width: '600px',
      data: summary
    });
  }
}