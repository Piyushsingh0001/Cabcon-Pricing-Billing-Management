import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { PricingService, Material, MaterialPriceHistory } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { MaterialsComponent } from '../materials.component';
import { MaterialHistoryDialogComponent } from '../material-history-dialog/material-history-dialog.component';



@Component({
  selector: 'app-material-create-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
    templateUrl: './material-create-edit-dialog.component.html',
    styleUrls: ['./material-create-edit-dialog.component.scss']
})
export class MaterialCreateEditDialogComponent {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  public loading = signal(false);

  public form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<MaterialCreateEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public material: Material | null
  ) {
    this.form = this.fb.group({
      name: [material?.name || '', Validators.required],
      type: [material?.type !== undefined ? material.type : 0, Validators.required],
      lmeUsdPerMt: [material?.lmeUsdPerMt || 0],
      premiumUsdPerMt: [material?.premiumUsdPerMt || 0],
      fxRate: [material?.fxRate || 0],
      freightInrPerMt: [material?.freightInrPerMt || 0],
      directRateInrPerKg: [material?.directRateInrPerKg || 0]
    });

    this.onTypeChange(this.form.get('type')?.value);
  }

  public onTypeChange(type: number) {
    if (type === 0) {
      this.form.get('lmeUsdPerMt')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('premiumUsdPerMt')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('fxRate')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('freightInrPerMt')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('directRateInrPerKg')?.clearValidators();
    } else {
      this.form.get('directRateInrPerKg')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('lmeUsdPerMt')?.clearValidators();
      this.form.get('premiumUsdPerMt')?.clearValidators();
      this.form.get('fxRate')?.clearValidators();
      this.form.get('freightInrPerMt')?.clearValidators();
    }
    this.form.get('lmeUsdPerMt')?.updateValueAndValidity();
    this.form.get('premiumUsdPerMt')?.updateValueAndValidity();
    this.form.get('fxRate')?.updateValueAndValidity();
    this.form.get('freightInrPerMt')?.updateValueAndValidity();
    this.form.get('directRateInrPerKg')?.updateValueAndValidity();
  }

  public onCancel() {
    this.dialogRef.close(false);
  }

  public onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const formValues = this.form.value;

    if (this.material) {
      // 1. Prepare Base updates
      const metaPayload = { name: formValues.name, type: formValues.type };
      
      // 2. Prepare Price updates conditional layout parameters
      const pricePayload = formValues.type === 0 ? {
        materialId: this.material.id,
        lmeUsdPerMt: formValues.lmeUsdPerMt,
        premiumUsdPerMt: formValues.premiumUsdPerMt,
        fxRate: formValues.fxRate,
        freightInrPerMt: formValues.freightInrPerMt
      } : {
        materialId: this.material.id,
        directRateInrPerKg: formValues.directRateInrPerKg
      };

      // 3. Chain streams via forkJoin to complete updates simultaneously
      forkJoin({
        meta: this.pricingService.updateMaterial(this.material.id, metaPayload),
        price: this.pricingService.updateMaterialPrice(pricePayload)
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Material definitions and rates saved.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to update changes.', 'Close', { duration: 3000 });
        }
      });

    } else {
      // Setup logic for fresh creation entries
      this.pricingService.createMaterial(formValues).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Material created successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to create material.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
