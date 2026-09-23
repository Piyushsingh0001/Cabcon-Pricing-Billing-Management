import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, Material, MaterialType } from '../../../core/pricing.service';

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
    MatSelectModule,
    MatSnackBarModule
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

  public materialTypes: MaterialType[] = [];

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

    const initialDensity = this.material?.density !== undefined && this.material?.density !== null
      ? this.material.density
      : 0;

    this.form = this.fb.group({
      name: [this.material?.name || '', [Validators.required, this.nonEmptyNameValidator(), this.uniqueMaterialNameValidator()]],
      materialTypeId: [this.material?.materialTypeId || null, Validators.required],
      density: [initialDensity, [Validators.required, Validators.min(0)]]
    });
  }

  public onMaterialTypeChange(typeId: number) {
    // Keep user-entered or existing density
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
      const currentName = (this.material?.name || '').trim().toLowerCase();
      
      // Allow the current material's own existing name
      if (currentName && val === currentName) {
        return null;
      }

      // Disallow matching with any other material's name
      const isDuplicate = this.existingNames.some(name => {
        const item = (name || '').trim().toLowerCase();
        return item && item === val && item !== currentName;
      });

      return isDuplicate ? { nameExists: true } : null;
    };
  }

  ngOnInit(): void {
    // Load Material Types
    this.pricingService.getMaterialTypes().subscribe({
      next: (types) => {
        this.materialTypes = types || [];
        // If editing material and materialTypeId is null, try to match by materialTypeName or categoryName
        if (this.material && !this.form.get('materialTypeId')?.value) {
          const typeName = (this.material.materialTypeName || this.material.categoryName || '').trim().toLowerCase();
          const matched = this.materialTypes.find(t => t.name.trim().toLowerCase() === typeName);
          if (matched) {
            this.form.patchValue({ materialTypeId: matched.id });
          } else if (this.materialTypes.length > 0) {
            this.form.patchValue({ materialTypeId: this.materialTypes[0].id });
          }
        } else if (!this.material && !this.form.get('materialTypeId')?.value && this.materialTypes.length > 0) {
          this.form.patchValue({ materialTypeId: this.materialTypes[0].id });
        }
      }
    });

    this.pricingService.getMaterials(undefined, undefined, undefined, undefined, 1, 500).subscribe({
      next: (res) => {
        if (res && res.items) {
          const allFetchedNames = res.items
            .map(m => m.name)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
          const combinedNames = new Set([...this.existingNames, ...allFetchedNames]);
          this.existingNames = Array.from(combinedNames);
          this.form.get('name')?.updateValueAndValidity();
        }
      }
    });
  }

  public onCancel() {
    this.dialogRef.close(false);
  }

  public onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const formValues = this.form.value;
    const selectedType = this.materialTypes.find(t => t.id === formValues.materialTypeId);

    const payload = {
      name: (formValues.name || '').trim(),
      materialTypeId: formValues.materialTypeId,
      materialTypeName: selectedType?.name,
      categoryName: selectedType?.name,
      density: Number(formValues.density)
    };

    if (this.material) {
      this.pricingService.updateMaterial(this.material.id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Material updated successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          const errMsg = err.error?.message || err.error?.errors?.[0] || 'Failed to update material.';
          if (errMsg.toLowerCase().includes('already exists')) {
            this.form.get('name')?.setErrors({ nameExists: true });
          }
          this.snackBar.open(errMsg, 'Close', { duration: 3000 });
        }
      });
    } else {
      this.pricingService.createMaterial(payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Material created successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading.set(false);
          const errMsg = err.error?.message || err.error?.errors?.[0] || 'Failed to create material.';
          if (errMsg.toLowerCase().includes('already exists')) {
            this.form.get('name')?.setErrors({ nameExists: true });
          }
          this.snackBar.open(errMsg, 'Close', { duration: 3000 });
        }
      });
    }
  }
}
