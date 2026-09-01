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
        lmeUsdPerMt: [null, [Validators.min(0)]],
        premiumUsdPerMt: [null, [Validators.min(0)]],
        fxRate: [null, [Validators.min(0)]],
        freightInrPerMt: [null, [Validators.min(0)]]
      });
    } else {
      // Direct — vendor dropdown per row
      return this.fb.group({
        date: [dateStr],
        vendorName: [this.data.currentVendorName || (this.availableVendors[0] || ''), [Validators.required]],
        directRateInrPerKg: [null, [Validators.min(0)]]
      });
    }
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    const formValues = this.form.value.prices;

    const payload = formValues.map((p: any) => {
      const result: any = { date: p.date, type: this.data.type };
      if (this.data.type === 0) {
        // LME — no vendor
        result.lmeUsdPerMt = p.lmeUsdPerMt != null && p.lmeUsdPerMt !== '' ? Number(p.lmeUsdPerMt) : 0;
        result.premiumUsdPerMt = p.premiumUsdPerMt != null && p.premiumUsdPerMt !== '' ? Number(p.premiumUsdPerMt) : 0;
        result.fxRate = p.fxRate != null && p.fxRate !== '' ? Number(p.fxRate) : 0;
        result.freightInrPerMt = p.freightInrPerMt != null && p.freightInrPerMt !== '' ? Number(p.freightInrPerMt) : 0;
      } else {
        // Direct — vendor per row
        result.vendorName = p.vendorName;
        result.directRateInrPerKg = p.directRateInrPerKg != null && p.directRateInrPerKg !== '' ? Number(p.directRateInrPerKg) : 0;
      }
      return result;
    });

    this.pricingService.backfillMaterialPrices(this.data.materialId, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Material prices backfilled successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snackBar.open(err.error?.message || 'Failed to backfill prices.', 'Close', { duration: 3000 });
      }
    });
  }
}
