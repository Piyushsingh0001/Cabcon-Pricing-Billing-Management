import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, Sku, Category, Material } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';
import { SkusComponent } from './skus.component';
import { CategoryManageDialogComponent } from './category-manage-dialog.component';



@Component({
  selector: 'app-sku-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
    templateUrl: './sku-edit-dialog.component.html',
    styleUrls: ['./sku-edit-dialog.component.scss']
})
export class SkuEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  public loading = signal(false);

  public form: FormGroup;
  public categories: Category[] = [];
  public materials: Material[] = [];

  constructor(
    public dialogRef: MatDialogRef<SkuEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public sku: any // SkuDetails
  ) {
    this.form = this.fb.group({
      categoryId: [sku?.categoryId || '', Validators.required],
      name: [sku?.name || '', Validators.required],
      spec: [sku?.spec || '', Validators.required],
      unit: [sku?.unit || 'Coil', Validators.required],
      conversionType: [sku?.conversionType || 0, Validators.required],
      conversionValue: [sku?.conversionValue || 0.08, [Validators.required, Validators.min(0)]],
      gstRate: [sku?.gstRate || 0.18, [Validators.required, Validators.min(0), Validators.max(1)]],
      bomLines: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.loadDropdowns();
  }

  public get bomLines() {
    return this.form.get('bomLines') as FormArray;
  }

  private loadDropdowns() {
    this.pricingService.getCategories().subscribe(res => this.categories = res);
    this.pricingService.getMaterials(undefined, undefined, undefined, false, 1, 100).subscribe(res => {
      this.materials = res.items;
      
      // Populate form lines if editing
      if (this.sku && this.sku.bomLines) {
        this.sku.bomLines.forEach((line: any) => {
          this.bomLines.push(this.fb.group({
            materialId: [line.materialId, Validators.required],
            weightKg: [line.weightKg, [Validators.required, Validators.min(0.0001)]]
          }));
        });
      } else {
        // Add one initial empty line
        this.addBomLine();
      }
    });
  }

  public addBomLine() {
    this.bomLines.push(this.fb.group({
      materialId: ['', Validators.required],
      weightKg: [0.1, [Validators.required, Validators.min(0.0001)]]
    }));
  }

  public removeBomLine(idx: number) {
    this.bomLines.removeAt(idx);
  }

  public onCancel() {
    this.dialogRef.close(false);
  }

  public onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const body = {
      ...this.form.value,
      id: this.sku?.id
    };

    const action$ = this.sku 
      ? this.pricingService.updateSku(this.sku.id, body)
      : this.pricingService.createSku(body);

    (action$ as any).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open(this.sku ? 'Product updated successfully.' : 'Product created successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        const errDetails = err.error?.errors ? Object.values(err.error.errors).flat().join(' ') : '';
        this.snackBar.open(`Error: ${err.error?.message || 'Failed to save product.'} ${errDetails}`, 'Close', { duration: 5000 });
      }
    });
  }
}
