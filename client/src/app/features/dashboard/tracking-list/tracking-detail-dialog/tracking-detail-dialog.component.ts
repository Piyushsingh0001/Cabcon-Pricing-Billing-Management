import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PricingService, TrackingSummaryDto, TrackingLogDto } from '../../../../core/pricing.service';

@Component({
  selector: 'app-tracking-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tracking-detail-dialog.component.html',
  styleUrls: ['./tracking-detail-dialog.component.scss']
})
export class TrackingDetailDialogComponent implements OnInit {
  public isLoading = true;
  public logs: TrackingLogDto[] = [];

  constructor(
    public dialogRef: MatDialogRef<TrackingDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrackingSummaryDto,
    private pricingService: PricingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pricingService.getTrackingDetails(this.data.quotationId).subscribe({
      next: (res: TrackingLogDto[]) => {
        this.logs = res || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
