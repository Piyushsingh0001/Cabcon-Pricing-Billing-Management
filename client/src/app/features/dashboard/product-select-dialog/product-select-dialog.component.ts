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
import { PricingService, CalculatedQuotationItem, Sku, Material } from '../../../core/pricing.service';
import { DashboardComponent } from '../dashboard.component';
import { QuotationSaveDialogComponent } from '../quotation-save-dialog/quotation-save-dialog.component';

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
  selector: 'app-product-select',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
    templateUrl: './product-select-dialog.component.html',
    styleUrls: ['./product-select-dialog.component.scss']
})
export class ProductSelectDialogComponent {
  public skus: Sku[] = [];
  public selectedIds = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<ProductSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { skus: Sku[], selectedIds: number[] }
  ) {
    this.skus = data.skus;
    this.selectedIds = new Set<number>(data.selectedIds);
  }

  public isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  public toggleSelection(id: number) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  public onCancel() {
    this.dialogRef.close(null);
  }

  public onSave() {
    this.dialogRef.close(Array.from(this.selectedIds));
  }
}
