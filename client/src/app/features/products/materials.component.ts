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
import { MaterialCreateEditDialogComponent } from './material-create-edit-dialog.component';
import { MaterialHistoryDialogComponent } from './material-history-dialog.component';



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
    templateUrl: './materials.component.html',
    styleUrls: ['./materials.component.scss']
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
