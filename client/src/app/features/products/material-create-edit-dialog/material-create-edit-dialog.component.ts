import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
import { forkJoin, of, switchMap } from 'rxjs';
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
export class MaterialCreateEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  public loading = signal(false);

  public material: Material | null = null;
  public existingNames: string[] = [];
  public form: FormGroup;
  public availableVendors: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<MaterialCreateEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data && 'name' in data && !('material' in data)) {
      this.material = data as Material;
      this.existingNames = [];
    } else if (data) {
      this.material = data.material || null;
      this.existingNames = data.existingNames || [];
    } else {
      this.material = null;
      this.existingNames = [];
    }

    this.form = this.fb.group({
      name: [this.material?.name || '', [Validators.required, this.nonEmptyNameValidator(), this.uniqueMaterialNameValidator()]],
      vendorName: [this.material?.vendorName || ''],
      type: [this.material?.type !== undefined ? this.material.type : 0, Validators.required],
      lmeUsdPerMt: [this.material ? this.material.lmeUsdPerMt : null],
      premiumUsdPerMt: [this.material ? this.material.premiumUsdPerMt : null],
      fxRate: [this.material ? this.material.fxRate : null],
      freightInrPerMt: [this.material ? this.material.freightInrPerMt : null],
      directRateInrPerKg: [this.material ? this.material.directRateInrPerKg : null]
    });

    this.onTypeChange(this.form.get('type')?.value);
  }

  private nonEmptyNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || control.value.toString().trim().length === 0) {
        return { required: true };
      }
      return null;
    };
  }

  private uniqueMaterialNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const val = control.value.toString().trim().toLowerCase();
      if (!val) {
        return null;
      }
      const currentName = this.material?.name?.trim().toLowerCase() || '';
      
      const isDuplicate = this.existingNames.some(name => {
        const item = (name || '').trim().toLowerCase();
        return item === val && item !== currentName;
      });

      return isDuplicate ? { nameExists: true } : null;
    };
  }

  ngOnInit(): void {
    if (!this.existingNames || this.existingNames.length === 0) {
      this.pricingService.getMaterials(undefined, undefined, undefined, undefined, 1, 500).subscribe({
        next: (res) => {
          if (res && res.items) {
            this.existingNames = Array.from(new Set(res.items.map(m => m.name)));
            this.form.get('name')?.updateValueAndValidity();
          }
        }
      });
    }

    this.pricingService.getVendorsApi().subscribe({
      next: (res) => {
        const dbVendors = (res || []).map(v => v.name);
        this.availableVendors = Array.from(new Set([...dbVendors]));
        if (this.material?.vendorName && !this.availableVendors.includes(this.material.vendorName)) {
          this.availableVendors.push(this.material.vendorName);
        }
      },
      error: () => {
        this.availableVendors = [];
        if (this.material?.vendorName) {
          this.availableVendors.push(this.material.vendorName);
        }
      }
    });
  }

  public onTypeChange(type: number) {
    if (type === 0) {
      this.form.get('vendorName')?.setValue('');
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
      const metaPayload = { name: formValues.name, vendorName: formValues.vendorName, type: formValues.type };
      
      // 2. Prepare Price updates conditional layout parameters
      const pricePayload = formValues.type === 0 ? {
        materialId: this.material.id,
        type: 0,
        lmeUsdPerMt: formValues.lmeUsdPerMt,
        premiumUsdPerMt: formValues.premiumUsdPerMt,
        fxRate: formValues.fxRate,
        freightInrPerMt: formValues.freightInrPerMt,
        freightInrPerKg: formValues.freightInrPerMt ? formValues.freightInrPerMt / 1000 : 0
      } : {
        materialId: this.material.id,
        type: 1,
        vendorName: formValues.vendorName,
        directRateInrPerKg: formValues.directRateInrPerKg
      };

      this.pricingService.updateMaterial(this.material.id, metaPayload).pipe(
        switchMap(() => this.pricingService.updateMaterialPrice(pricePayload))
      ).subscribe({
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
