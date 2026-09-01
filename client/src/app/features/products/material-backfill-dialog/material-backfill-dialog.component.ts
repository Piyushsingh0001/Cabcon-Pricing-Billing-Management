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
import { switchMap } from 'rxjs';
import { PricingService, Material } from '../../../core/pricing.service';

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
    @Inject(MAT_DIALOG_DATA) public material: Material
  ) {
    this.form = this.fb.group({
      prices: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loading.set(true);

    this.pricingService.getVendorsApi().subscribe({
      next: (res) => {
        this.availableVendors = (res || []).map(v => v.name);
        if (this.material.vendorName && !this.availableVendors.includes(this.material.vendorName)) {
          this.availableVendors.push(this.material.vendorName);
        }
      },
      error: () => {
        if (this.material.vendorName) {
          this.availableVendors = [this.material.vendorName];
        }
      }
    });

    this.pricingService.getMissingDates(this.material.id, this.material.type).subscribe({
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
    return this.fb.group({
      date: [dateStr],
      vendorName: [this.material.vendorName || ''],
      type: [{ value: this.material.type, disabled: true }],
      lmeUsdPerMt: [this.material.lmeUsdPerMt || 0, [Validators.min(0)]],
      premiumUsdPerMt: [this.material.premiumUsdPerMt || 0, [Validators.min(0)]],
      fxRate: [this.material.fxRate || 0, [Validators.min(0)]],
      freightInrPerMt: [this.material.freightInrPerMt || 0, [Validators.min(0)]],
      directRateInrPerKg: [this.material.directRateInrPerKg || 0, [Validators.min(0)]]
    });
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    const formValues = this.form.value.prices;

    const payload = formValues.map((p: any) => {
      const result: any = { date: p.date, type: this.material.type };
      if (this.material.type === 0) {
        result.lmeUsdPerMt = p.lmeUsdPerMt;
        result.premiumUsdPerMt = p.premiumUsdPerMt;
        result.fxRate = p.fxRate;
        result.freightInrPerMt = p.freightInrPerMt;
      } else {
        result.vendorName = p.vendorName;
        result.directRateInrPerKg = p.directRateInrPerKg;
      }
      return result;
    });

    const metaPayload = {
      name: this.material.name,
      vendorName: this.material.vendorName,
      type: this.material.type
    };

    this.pricingService.updateMaterial(this.material.id, metaPayload).pipe(
      switchMap(() => this.pricingService.backfillMaterialPrices(this.material.id, payload))
    ).subscribe({
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
