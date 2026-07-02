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
import { SkuEditDialogComponent } from './sku-edit-dialog/sku-edit-dialog.component';
import { CategoryManageDialogComponent } from './category-manage-dialog/category-manage-dialog.component';



@Component({
  selector: 'app-skus',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule
  ],
    templateUrl: './skus.component.html',
    styleUrls: ['./skus.component.scss']
})
export class SkusComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public displayedColumns = ['category', 'name', 'spec', 'unit', 'rmCost', 'mfgCost', 'actions'];
  public dataSource: Sku[] = [];
  public categories = signal<Category[]>([]);
  private cdr = inject(ChangeDetectorRef);
  // Page state
  public totalCount = 0;
  public pageIndex = 0;
  public pageSize = 10;
  private search = '';
  private categoryId: number | null = null;
  private sortBy = '';
  private sortDesc = false;

  ngOnInit() {
    this.loadCategories();
    this.loadSkus();
  }

  public canCreate(): boolean {
    return this.authService.hasPermission('Sku.Create');
  }

  public canUpdate(): boolean {
    return this.authService.hasPermission('Sku.Update');
  }

  public canDelete(): boolean {
    return this.authService.hasPermission('Sku.Delete');
  }

  private loadCategories() {
    this.pricingService.getCategories().subscribe({
      next: (res) => this.categories.set(res)
    });
  }

  private loadSkus() {
    this.pricingService.getSkus(
      this.search,
      this.categoryId ?? undefined,
      this.sortBy,
      this.sortDesc,
      this.pageIndex + 1,
      this.pageSize
    ).subscribe({
      next: (res) => {
        this.dataSource = res.items;
        this.totalCount = res.totalCount;
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to load SKUs.', 'Close', { duration: 3000 });
      }
    });
  }

  public applySearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.search = value;
    this.pageIndex = 0;
    this.loadSkus();
  }

  public applyCategoryFilter(value: number | null) {
    this.categoryId = value;
    this.pageIndex = 0;
    this.loadSkus();
  }

  public sortData(event: any) {
    this.sortBy = event.active;
    this.sortDesc = event.direction === 'desc';
    this.pageIndex = 0;
    this.loadSkus();
  }

  public onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadSkus();
  }

  public addSku() {
    const dialogRef = this.dialog.open(SkuEditDialogComponent, {
      width: '650px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSkus();
      }
    });
  }

  public manageCategories() {
    const dialogRef = this.dialog.open(CategoryManageDialogComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadCategories();
    });
  }

  public editSku(sku: Sku) {
    // Load full details including BOM lines
    this.pricingService.getSku(sku.id).subscribe({
      next: (fullSku) => {
        const dialogRef = this.dialog.open(SkuEditDialogComponent, {
          width: '650px',
          data: fullSku
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadSkus();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to fetch SKU details.', 'Close', { duration: 3000 });
      }
    });
  }

  public deleteSku(sku: Sku) {
    if (confirm(`Are you sure you want to delete ${sku.name} ${sku.spec}?`)) {
      this.pricingService.deleteSku(sku.id).subscribe({
        next: () => {
          this.snackBar.open('SKU deleted successfully.', 'Close', { duration: 3000 });
          this.loadSkus();
        },
        error: () => {
          this.snackBar.open('Failed to delete SKU.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
