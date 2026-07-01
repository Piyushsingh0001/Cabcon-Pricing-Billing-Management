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
import { SkuEditDialogComponent } from './sku-edit-dialog.component';



@Component({
  selector: 'app-category-manage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
    templateUrl: './category-manage-dialog.component.html',
    styleUrls: ['./category-manage-dialog.component.scss']
})
export class CategoryManageDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  
  public categories: Category[] = [];
  public displayedColumns = ['name', 'actions'];
  public loading = signal(false);
  public newCategoryCtrl = this.fb.control('', Validators.required);

  ngOnInit() {
    this.loadCategories();
  }

  private loadCategories() {
    this.loading.set(true);
    this.pricingService.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load categories.', 'Close', { duration: 3000 });
      }
    });
  }

  public addCategory() {
    if (this.newCategoryCtrl.invalid) return;
    
    this.loading.set(true);
    this.pricingService.createCategory(this.newCategoryCtrl.value!).subscribe({
      next: () => {
        this.newCategoryCtrl.reset();
        this.snackBar.open('Category created successfully.', 'Close', { duration: 3000 });
        this.loadCategories();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snackBar.open(`Error: ${err.error?.message || 'Failed to create category.'}`, 'Close', { duration: 5000 });
      }
    });
  }

  public deleteCategory(category: Category) {
    if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      this.loading.set(true);
      this.pricingService.deleteCategory(category.id).subscribe({
        next: () => {
          this.snackBar.open('Category deleted successfully.', 'Close', { duration: 3000 });
          this.loadCategories();
        },
        error: (err: any) => {
          this.loading.set(false);
          this.snackBar.open(`Error: ${err.error?.message || 'Failed to delete category.'}`, 'Close', { duration: 5000 });
        }
      });
    }
  }
}
