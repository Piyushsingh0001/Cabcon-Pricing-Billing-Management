import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService } from '../../../core/pricing.service';

export interface BackfillDialogData {
  /** ID of the material (first real variant) */
  materialId: number;
  materialName: string;
  /** 0 = LME/Exchange, 1 = Direct */
  type: number;
  /** All vendor options for Direct type rows */
  vendorOptions: string[];
  /** Currently selected vendor name */
  currentVendorName: string;
}

@Component({
  selector: 'app-material-backfill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './material-backfill-dialog.component.html',
  styleUrls: ['./material-backfill-dialog.component.scss']
})
export class MaterialBackfillDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  public loading = signal(false);

  public form: FormGroup;
  public missingDates: Date[] = [];
  public availableVendors: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<MaterialBackfillDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BackfillDialogData
  ) {
    this.form = this.fb.group({
      prices: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loading.set(true);

    // Populate vendor options from data
    this.availableVendors = this.data.vendorOptions || [];

    // Load missing dates for this material + type from the backend
    this.pricingService.getMissingDates(this.data.materialId, this.data.type).subscribe({
      next: (dates) => {
        this.missingDates = dates.map(d => new Date(d));
        this.buildFormArray();
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load missing dates', 'Close', { duration: 3000 });
        this.loading.set(false);
        this.dialogRef.close();
      }
    });
  }

  get pricesArray(): FormArray {
    return this.form.get('prices') as FormArray;
  }

  private buildFormArray(): void {
    this.missingDates.forEach(date => {
      this.pricesArray.push(this.createPriceGroup(date));
    });
  }

  private createPriceGroup(date: Date): FormGroup {
    const dateStr = date.toISOString().substring(0, 10);

    if (this.data.type === 0) {
      // LME/Exchange — no vendor field
      return this.fb.group({
        date: [dateStr],
        lmeUsdPerMt: [null],
        premiumUsdPerMt: [null],
        fxRate: [null],
        freightInrPerMt: [null]
      });
    } else {
      // Direct — vendor dropdown per row
      return this.fb.group({
        date: [dateStr],
        vendorName: [this.data.currentVendorName || (this.availableVendors[0] || '')],
        directRateInrPerKg: [null]
      });
    }
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onSubmit(): void {
    const formValues = this.form.value.prices || [];
    const payload: any[] = [];

    for (let i = 0; i < formValues.length; i++) {
      const p = formValues[i];
      const rowDate = this.missingDates[i]
        ? new Date(this.missingDates[i]).toLocaleDateString('en-GB')
        : p.date;

      if (this.data.type === 0) {
        // LME row checks
        const isLmeSet = p.lmeUsdPerMt !== null && p.lmeUsdPerMt !== undefined && p.lmeUsdPerMt !== '';
        const isPremSet = p.premiumUsdPerMt !== null && p.premiumUsdPerMt !== undefined && p.premiumUsdPerMt !== '';
        const isFxSet = p.fxRate !== null && p.fxRate !== undefined && p.fxRate !== '';
        const isFreightSet = p.freightInrPerMt !== null && p.freightInrPerMt !== undefined && p.freightInrPerMt !== '';

        const hasAny = isLmeSet || isPremSet || isFxSet || isFreightSet;
        const hasAll = isLmeSet && isPremSet && isFxSet && isFreightSet;

        // If completely empty -> skip this row
        if (!hasAny) {
          continue;
        }

        // If partially filled -> validation error
        if (!hasAll) {
          this.snackBar.open(`Date ${rowDate}: Please enter all LME fields (LME, Premium, FX, Freight) or leave the entire row blank.`, 'Close', { duration: 4000 });
          return;
        }

        const lmeVal = Number(p.lmeUsdPerMt);
        const fxVal = Number(p.fxRate);
        const premVal = Number(p.premiumUsdPerMt);
        const freightVal = Number(p.freightInrPerMt);

        if (isNaN(lmeVal) || lmeVal <= 0) {
          this.snackBar.open(`Date ${rowDate}: LME (USD/MT) must be greater than 0.`, 'Close', { duration: 3500 });
          return;
        }
        if (isNaN(fxVal) || fxVal <= 0) {
          this.snackBar.open(`Date ${rowDate}: FX Rate (₹/USD) must be greater than 0.`, 'Close', { duration: 3500 });
          return;
        }
        if (isNaN(premVal) || premVal < 0) {
          this.snackBar.open(`Date ${rowDate}: Premium (USD/MT) cannot be negative.`, 'Close', { duration: 3500 });
          return;
        }
        if (isNaN(freightVal) || freightVal < 0) {
          this.snackBar.open(`Date ${rowDate}: Freight (₹/MT) cannot be negative.`, 'Close', { duration: 3500 });
          return;
        }

        payload.push({
          date: p.date,
          type: 0,
          lmeUsdPerMt: lmeVal,
          premiumUsdPerMt: premVal,
          fxRate: fxVal,
          freightInrPerMt: freightVal,
          freightInrPerKg: freightVal / 1000
        });
      } else {
        // Direct row checks
        const isRateSet = p.directRateInrPerKg !== null && p.directRateInrPerKg !== undefined && p.directRateInrPerKg !== '';
        const isVendorSet = p.vendorName !== null && p.vendorName !== undefined && p.vendorName.trim() !== '';

        // If rate is empty -> skip this row
        if (!isRateSet) {
          continue;
        }

        if (!isVendorSet) {
          this.snackBar.open(`Date ${rowDate}: Please select a vendor.`, 'Close', { duration: 3500 });
          return;
        }

        const rateVal = Number(p.directRateInrPerKg);
        if (isNaN(rateVal) || rateVal <= 0) {
          this.snackBar.open(`Date ${rowDate}: Direct Rate (₹/kg) must be greater than 0.`, 'Close', { duration: 3500 });
          return;
        }

        payload.push({
          date: p.date,
          type: 1,
          vendorName: p.vendorName.trim(),
          directRateInrPerKg: rateVal
        });
      }
    }

    if (payload.length === 0) {
      this.snackBar.open('Please fill all price fields for at least one date.', 'Close', { duration: 3500 });
      return;
    }

    this.loading.set(true);
    this.pricingService.backfillMaterialPrices(this.data.materialId, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open(`Successfully saved prices for ${payload.length} date(s).`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snackBar.open(err.error?.message || 'Failed to backfill prices.', 'Close', { duration: 3000 });
      }
    });
  }
}
