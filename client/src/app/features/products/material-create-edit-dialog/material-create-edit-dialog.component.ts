import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, Material } from '../../../core/pricing.service';

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

  public categories: string[] = [
    'Core Material',
    'Insulation Material',
    'Inner Sheath',
    'Armour Wire',
    'PVC Outer Sheath'
  ];

  private categoryDefaultDensities: { [key: string]: number } = {
    'Core Material': 8.89,
    'Insulation Material': 0.92,
    'Inner Sheath': 1.45,
    'Armour Wire': 7.85,
    'PVC Outer Sheath': 1.45,
    'PVC Outer Shell': 1.45
  };

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

    const rawCategory = this.material?.categoryName || 'Core Material';
    const initialCategory = rawCategory.trim().toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : rawCategory;
    const initialDensity = this.material?.density !== undefined && this.material?.density !== null && this.material.density > 0
      ? this.material.density
      : (this.categoryDefaultDensities[initialCategory] || 8.89);

    this.form = this.fb.group({
      name: [this.material?.name || '', [Validators.required, this.nonEmptyNameValidator(), this.uniqueMaterialNameValidator()]],
      categoryName: [initialCategory, Validators.required],
      density: [initialDensity, [Validators.required, Validators.min(0)]]
    });
  }

  public onCategoryChange(category: string) {
    if (!this.material || !this.material.density) {
      const defaultDensity = this.categoryDefaultDensities[category];
      if (defaultDensity !== undefined) {
        this.form.patchValue({ density: defaultDensity });
      }
    }
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
    this.pricingService.getMaterials(undefined, undefined, undefined, undefined, 1, 500).subscribe({
      next: (res) => {
        if (res && res.items) {
          const allFetchedNames = res.items
            .map(m => m.name)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
          const combinedNames = new Set([...this.existingNames, ...allFetchedNames]);
          this.existingNames = Array.from(combinedNames);
          this.form.get('name')?.updateValueAndValidity();

          const catSet = new Set<string>(this.categories);
          res.items.forEach(m => {
            if (m.categoryName && m.categoryName.trim()) {
              const norm = m.categoryName.trim().toLowerCase() === 'pvc outer shell' ? 'PVC Outer Sheath' : m.categoryName.trim();
              catSet.add(norm);
            }
          });
          const orderMap: { [cat: string]: number } = {
            'core material': 1,
            'insulation material': 2,
            'inner sheath': 3,
            'armour wire': 4,
            'pvc outer sheath': 5
          };
          const catList = Array.from(catSet);
          catList.sort((a, b) => {
            const rankA = orderMap[a.toLowerCase()] ?? 99;
            const rankB = orderMap[b.toLowerCase()] ?? 99;
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
          });
          this.categories = catList;
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

    const payload = {
      name: (formValues.name || '').trim(),
      categoryName: formValues.categoryName,
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
