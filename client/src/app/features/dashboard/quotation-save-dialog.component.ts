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
import { DashboardComponent } from './dashboard.component';
import { ProductSelectDialogComponent } from './product-select-dialog.component';

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
    templateUrl: './quotation-save-dialog.component.html',
    styleUrls: ['./quotation-save-dialog.component.scss']
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
