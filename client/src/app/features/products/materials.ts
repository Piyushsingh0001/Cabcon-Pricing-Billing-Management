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
import { PricingService, Material, MaterialPriceHistory } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';

// --- MAIN MATERIALS COMPONENT ---
@Component({
  selector: 'app-materials',
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
    <div class="materials-container animated-view">
      <div class="header-section">
        <div>
          <h1>Material Base Rates</h1>
          <p class="subtitle">Create materials, set commodity prices and track history</p>
        </div>
        <button mat-flat-button class="btn-primary" (click)="addMaterial()" *ngIf="canUpdate()">
          <mat-icon>add</mat-icon> Add Material
        </button>
      </div>

      <div class="filters-row glass-card">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Materials</mat-label>
          <input matInput (keyup)="applySearch($event)" placeholder="e.g. Copper">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Material Type</mat-label>
          <mat-select (selectionChange)="applyTypeFilter($event.value)">
            <mat-option [value]="null">All Types</mat-option>
            <mat-option [value]="0">Exchange-linked</mat-option>
            <mat-option [value]="1">Direct Rate</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="table-container glass-card">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="sortData($event)">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
            <td mat-cell *matCellDef="let element">
              <span class="material-name">{{element.name}}</span>
              <span class="placeholder-tag" *ngIf="element.isPlaceholder">Placeholder</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
            <td mat-cell *matCellDef="let element">
              <span class="type-tag" [ngClass]="element.type === 0 ? 'exchange' : 'direct'">
                {{element.type === 0 ? 'Exchange-linked' : 'Direct Rate'}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="asOnDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Updated</th>
            <td mat-cell *matCellDef="let element">{{element.asOnDate | date:'medium'}}</td>
          </ng-container>

          <ng-container matColumnDef="landedCost">
            <th mat-header-cell *matHeaderCellDef>Landed Cost (₹/kg)</th>
            <td mat-cell *matCellDef="let element" class="landed-cost-cell">
              {{element.landedCost | number:'1.2-2'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let element">
              <div class="action-buttons">
                <button mat-icon-button color="accent" (click)="viewHistory(element)" title="View Price History">
                  <mat-icon>history</mat-icon>
                </button>
                <button mat-icon-button color="primary" (click)="editMaterial(element)" *ngIf="canUpdate()" title="Edit Name/Type/Rates">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteMaterial(element)" *ngIf="canUpdate()" title="Delete Material">
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
    .materials-container { display: flex; flex-direction: column; gap: 24px; }
    .header-section { display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { color: var(--text-secondary); margin: 0; }
    .filters-row { display: flex; gap: 16px; padding: 16px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 250px; }
    .filter-field { width: 200px; }
    .table-container { padding: 8px; overflow-x: auto; }
    .material-name { font-weight: 600; color: var(--text-primary); }
    .placeholder-tag { background: rgba(234, 179, 8, 0.15); color: #facc15; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 8px; border: 1px solid rgba(234, 179, 8, 0.2); }
    .type-tag { font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: 12px; }
    .type-tag.exchange { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); }
    .type-tag.direct { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
    .landed-cost-cell { font-weight: 700; color: var(--text-primary); }
    .action-buttons { display: flex; gap: 4px; }
    ::ng-deep .mat-mdc-paginator { background: transparent !important; color: var(--text-secondary) !important; }
  `]
})
export class MaterialsComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  public displayedColumns = ['name', 'type', 'asOnDate', 'landedCost', 'actions'];
  public dataSource = new MatTableDataSource<Material>();
  
  public totalCount = 0;
  public pageIndex = 0;
  public pageSize = 10;
  private search = '';
  private typeFilter: number | null = null;
  private sortBy = '';
  private sortDesc = false;

  ngOnInit() {
    this.loadMaterials();
  }

  public canUpdate(): boolean {
    return this.authService.hasPermission('Pricing.Update');
  }

  private loadMaterials() {
    this.pricingService.getMaterials(
      this.search,
      this.typeFilter ?? undefined,
      this.sortBy,
      this.sortDesc,
      this.pageIndex + 1,
      this.pageSize
    ).subscribe({
      next: (res) => {
        console.log("GRID API RESPONSE:", res.items);
        this.dataSource.data = res.items;
        this.totalCount = res.totalCount;
      },
      error: () => {
        this.snackBar.open('Failed to load materials data.', 'Close', { duration: 3000 });
      }
    });
  }

  public applySearch(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
    this.pageIndex = 0;
    this.loadMaterials();
  }

  public applyTypeFilter(value: number | null) {
    this.typeFilter = value;
    this.pageIndex = 0;
    this.loadMaterials();
  }

  public sortData(event: any) {
    this.sortBy = event.active;
    this.sortDesc = event.direction === 'desc';
    this.pageIndex = 0;
    this.loadMaterials();
  }

  public onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadMaterials();
  }

  public addMaterial() {
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      width: '500px',
      data: null
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public editMaterial(material: Material) {
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      width: '500px',
      data: material
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public deleteMaterial(material: Material) {
    if (confirm(`Are you sure you want to delete ${material.name}?`)) {
      this.pricingService.deleteMaterial(material.id).subscribe({
        next: () => {
          this.snackBar.open('Material deleted successfully.', 'Close', { duration: 3000 });
          this.loadMaterials();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to delete material.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  public viewHistory(material: Material) {
    this.dialog.open(MaterialHistoryDialogComponent, {
      width: '650px',
      data: material
    });
  }
}

// --- COMBINED DIALOG: CREATE, EDIT METADATA, AND UPDATE PRICE RATES ---
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
  template: `
    <h2 mat-dialog-title>{{ material ? 'Edit Material Details' : 'Add Material' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline">
          <mat-label>Material Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Copper wire">
          <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Material Type</mat-label>
          <mat-select formControlName="type" (selectionChange)="onTypeChange($event.value)">
            <mat-option [value]="0">Exchange-linked</mat-option>
            <mat-option [value]="1">Direct Rate</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="rate-fields-section">
          <ng-container *ngIf="form.get('type')?.value === 0">
            <h3 class="section-title">Exchange-linked Metrics</h3>
            <mat-form-field appearance="outline">
              <mat-label>LME ($/MT)</mat-label>
              <input matInput formControlName="lmeUsdPerMt" type="number">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Premium ($/MT)</mat-label>
              <input matInput formControlName="premiumUsdPerMt" type="number">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Fx Rate (₹/$)</mat-label>
              <input matInput formControlName="fxRate" type="number" step="0.01">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Freight (₹/MT)</mat-label>
              <input matInput formControlName="freightInrPerMt" type="number">
            </mat-form-field>
          </ng-container>

          <ng-container *ngIf="form.get('type')?.value === 1">
            <h3 class="section-title">Direct Pricing</h3>
            <mat-form-field appearance="outline">
              <mat-label>Direct Rate (₹/kg)</mat-label>
              <input matInput formControlName="directRateInrPerKg" type="number" step="0.01">
            </mat-form-field>
          </ng-container>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()" (click)="onSubmit()">
        {{ material ? 'Save Changes' : 'Create Material' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .rate-fields-section { border-top: 1px dashed rgba(255,255,255,0.1); margin-top: 8px; padding-top: 12px; display: flex; flex-direction: column; gap: 12px; }
    .section-title { font-size: 14px; font-weight: 600; margin: 0 0 4px 0; opacity: 0.8; color: var(--text-primary); }
  `]
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

// --- DIALOG FOR VIEWING PRICE HISTORY ---
@Component({
  selector: 'app-material-history',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Price Stamp Log: {{material.name}}</h2>
    <mat-dialog-content>
      <div class="history-table-container">
        <table mat-table [dataSource]="historyData">
          
          <ng-container matColumnDef="effectiveDate">
            <th mat-header-cell *matHeaderCellDef>Effective Date</th>
            <td mat-cell *matCellDef="let log">{{log.effectiveDate | date:'medium'}}</td>
          </ng-container>

          <ng-container matColumnDef="rateDetails">
            <th mat-header-cell *matHeaderCellDef>Rate Details</th>
            <td mat-cell *matCellDef="let log">
              <span *ngIf="material.type === 0">
                LME: \${{log.lmeUsdPerMt}}, Prem: \${{log.premiumUsdPerMt}}, Fx: ₹{{log.fxRate}}
              </span>
              <span *ngIf="material.type === 1">
                Direct Rate: ₹{{log.directRateInrPerKg}}/kg
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="landedCost">
            <th mat-header-cell *matHeaderCellDef>Landed Cost</th>
            <td mat-cell *matCellDef="let log" class="landed-cost-cell">
              ₹{{log.landedCostInrPerKg | number:'1.2-2'}}/kg
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>

        <div class="no-records" *ngIf="historyData.data.length === 0">
          No pricing updates found for this material.
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .history-table-container {
      max-height: 400px;
      overflow-y: auto;
    }
    .landed-cost-cell {
      font-weight: 700;
      color: var(--text-primary);
    }
    .no-records {
      text-align: center;
      padding: 24px;
      color: var(--text-secondary);
    }
  `]
})
export class MaterialHistoryDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  
  public historyData = new MatTableDataSource<MaterialPriceHistory>();
  public columns = ['effectiveDate', 'rateDetails', 'landedCost'];
  private cdr = inject(ChangeDetectorRef);
  constructor(
    @Inject(MAT_DIALOG_DATA) public material: Material
  ) {}

ngOnInit() {
  this.pricingService.getMaterialHistory(this.material.id).subscribe({
    next: (res: MaterialPriceHistory[]) => {


      this.historyData = new MatTableDataSource<MaterialPriceHistory>(res);

      this.cdr.detectChanges();

    },
    error: () => {
      this.historyData = new MatTableDataSource<MaterialPriceHistory>([]);
      this.cdr.detectChanges();
    }
  });
}
}