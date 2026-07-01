import { Component, Inject, OnInit, inject, signal } from '@angular/core';
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

// --- MAIN SKUS COMPONENT ---
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
  template: `
    <div class="skus-container animated-view">
      <div class="header-section">
        <div>
          <h1>SKU & Bill of Materials (BOM)</h1>
          <p class="subtitle">Define wire/cable specifications and raw material weights</p>
        </div>
        <button mat-flat-button class="btn-primary" (click)="addSku()" *ngIf="canCreate()">
          <mat-icon>add</mat-icon>
          Add SKU
        </button>
      </div>

      <div class="filters-row glass-card">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Products</mat-label>
          <input matInput (keyup)="applySearch($event)" placeholder="Search by name, spec, or category...">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Category</mat-label>
          <mat-select (selectionChange)="applyCategoryFilter($event.value)">
            <mat-option [value]="null">All Categories</mat-option>
            <mat-option *ngFor="let cat of categories()" [value]="cat.id">{{cat.name}}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="table-container glass-card">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="sortData($event)">
          <!-- Category Column -->
          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Category</th>
            <td mat-cell *matCellDef="let element">{{element.categoryName}}</td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Product Variant</th>
            <td mat-cell *matCellDef="let element">
              <span class="sku-name">{{element.name}}</span>
              <span class="placeholder-tag" *ngIf="element.isPlaceholder">Placeholder</span>
            </td>
          </ng-container>

          <!-- Spec Column -->
          <ng-container matColumnDef="spec">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Specification</th>
            <td mat-cell *matCellDef="let element">{{element.spec}}</td>
          </ng-container>

          <!-- Unit Column -->
          <ng-container matColumnDef="unit">
            <th mat-header-cell *matHeaderCellDef>Unit</th>
            <td mat-cell *matCellDef="let element">{{element.unit}}</td>
          </ng-container>

          <!-- RM Cost Column -->
          <ng-container matColumnDef="rmCost">
            <th mat-header-cell *matHeaderCellDef>RM Cost (₹)</th>
            <td mat-cell *matCellDef="let element">₹{{element.rawMaterialCost | number:'1.2-2'}}</td>
          </ng-container>

          <!-- Mfg Cost Column -->
          <ng-container matColumnDef="mfgCost">
            <th mat-header-cell *matHeaderCellDef>Base Mfg Cost (₹)</th>
            <td mat-cell *matCellDef="let element">₹{{element.manufacturingCost | number:'1.2-2'}}</td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let element">
              <div class="action-buttons">
                <button mat-icon-button color="primary" (click)="editSku(element)" *ngIf="canUpdate()" title="Edit SKU & BOM">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteSku(element)" *ngIf="canDelete()" title="Delete SKU">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <mat-paginator [length]="totalCount"
                       [pageSize]="pageSize"
                       [pageSizeOptions]="[5, 10, 20]"
                       (page)="onPageChange($event)"
                       showFirstLastButtons>
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .skus-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }
    .subtitle {
      color: var(--text-secondary);
      margin: 0;
    }
    .filters-row {
      display: flex;
      gap: 16px;
      padding: 16px;
      flex-wrap: wrap;
    }
    .search-field {
      flex: 1;
      min-width: 250px;
    }
    .filter-field {
      width: 200px;
    }
    .table-container {
      padding: 8px;
      overflow-x: auto;
    }
    .sku-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .placeholder-tag {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
      border: 1px solid rgba(234, 179, 8, 0.2);
    }
    .action-buttons {
      display: flex;
      gap: 4px;
    }
    ::ng-deep .mat-mdc-paginator {
      background: transparent !important;
      color: var(--text-secondary) !important;
    }
  `]
})
export class SkusComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public displayedColumns = ['category', 'name', 'spec', 'unit', 'rmCost', 'mfgCost', 'actions'];
  public dataSource: Sku[] = [];
  public categories = signal<Category[]>([]);

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

// --- DIALOG FOR ADDING/EDITING SKU & BOM LINES ---
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
  template: `
    <h2 mat-dialog-title>{{ sku ? 'Edit SKU & BOM' : 'Create New SKU' }}</h2>
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form">
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option *ngFor="let cat of categories" [value]="cat.id">{{cat.name}}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('categoryId')?.hasError('required')">Category is required</mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline">
            <mat-label>Product Name (e.g. FR, FRLSH)</mat-label>
            <input matInput formControlName="name">
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Specification (e.g. 1.5 sq.mm)</mat-label>
            <input matInput formControlName="spec">
            <mat-error *ngIf="form.get('spec')?.hasError('required')">Specification is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Unit (e.g. Coil, km, m)</mat-label>
            <input matInput formControlName="unit">
            <mat-error *ngIf="form.get('unit')?.hasError('required')">Unit is required</mat-error>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Conversion Type</mat-label>
            <mat-select formControlName="conversionType">
              <mat-option [value]="0">Percentage (%) of RM</mat-option>
              <mat-option [value]="1">Fixed Amount (₹/kg)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Conversion Value (e.g. 0.08 or 10.0)</mat-label>
            <input matInput formControlName="conversionValue" type="number" step="0.001">
            <mat-error *ngIf="form.get('conversionValue')?.hasError('required')">Value is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>GST Rate (e.g. 0.18 for 18%)</mat-label>
            <input matInput formControlName="gstRate" type="number" step="0.01">
            <mat-error *ngIf="form.get('gstRate')?.hasError('required')">GST is required</mat-error>
          </mat-form-field>
        </div>

        <!-- BOM Section -->
        <div class="bom-section">
          <div class="bom-header">
            <h3>Bill of Materials (BOM) Weights</h3>
            <button type="button" mat-stroked-button color="primary" (click)="addBomLine()">
              <mat-icon>add</mat-icon> Add Raw Material
            </button>
          </div>

          <div formArrayName="bomLines" class="bom-list">
            <div *ngFor="let line of bomLines.controls; let idx = index" [formGroupName]="idx" class="bom-line-row">
              
              <mat-form-field appearance="outline" class="material-select">
                <mat-label>Material</mat-label>
                <mat-select formControlName="materialId">
                  <mat-option *ngFor="let mat of materials" [value]="mat.id">{{mat.name}}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="weight-input">
                <mat-label>Weight (kg per Unit)</mat-label>
                <input matInput formControlName="weightKg" type="number" step="0.0001">
              </mat-form-field>

              <button type="button" mat-icon-button color="warn" (click)="removeBomLine(idx)" [disabled]="bomLines.length <= 1">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
          <div class="bom-error" *ngIf="bomLines.hasError('required') || bomLines.invalid">
            All raw material lines must have valid material selections and weight greater than 0 kg.
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()" (click)="onSubmit()">
        {{ sku ? 'Save Changes' : 'Create Product' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      max-height: 70vh;
    }
    .row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    .row mat-form-field {
      flex: 1;
    }
    .bom-section {
      margin-top: 24px;
      border-top: 1px solid var(--border-glass);
      padding-top: 16px;
    }
    .bom-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .bom-header h3 {
      margin: 0;
      font-weight: 600;
      color: var(--text-primary);
    }
    .bom-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bom-line-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .material-select {
      flex: 2;
    }
    .weight-input {
      flex: 1;
    }
    .bom-error {
      color: #f87171;
      font-size: 12px;
      margin-top: 8px;
    }
  `]
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
