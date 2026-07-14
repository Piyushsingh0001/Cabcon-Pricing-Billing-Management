import { Component, Inject, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth.service';

export interface QuotationPreviewData {
  partyName: string;
  customerDetails?: any;
  validityDays: number;
  priceBasisNote: string;
  totalExGst: number;
  lines: any[];
}

@Component({
  selector: 'app-quotation-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    DatePipe
  ],
  templateUrl: './quotation-preview-dialog.component.html',
  styleUrls: ['./quotation-preview-dialog.component.scss']
})
export class QuotationPreviewDialogComponent {
  private authService = inject(AuthService);
  
  public displayedColumns = ['sno', 'description', 'unit', 'offerExGst'];
  public isSuperAdmin = this.authService.hasRole('Super Admin');
  public today = new Date();

  constructor(
    public dialogRef: MatDialogRef<QuotationPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuotationPreviewData
  ) {}

  public onSend() {
    this.dialogRef.close(true);
  }
}
