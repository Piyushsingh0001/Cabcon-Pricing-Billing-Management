import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, switchMap } from 'rxjs';
import { PricingService, Material } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';
import { MaterialCreateEditDialogComponent } from './material-create-edit-dialog/material-create-edit-dialog.component';
import { MaterialHistoryDialogComponent } from './material-history-dialog/material-history-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatMenuModule,
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
  private cdr = inject(ChangeDetectorRef);

  public materials: Material[] = [];
  public totalCount = 0;
  public loading = signal(false);

  ngOnInit() {
    this.loadMaterials();
  }

  public canUpdate(): boolean {
    return this.authService.hasPermission('Pricing.Update');
  }

  public loadMaterials() {
    this.loading.set(true);
    // Request up to 100 materials on page 1 sorted by name (asc) to ensure all display together
    this.pricingService.getMaterials(
      undefined,
      undefined,
      'name',
      false,
      1,
      100
    ).subscribe({
      next: (res) => {
        this.materials = res.items;
        this.totalCount = res.totalCount;
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to load materials data.', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Material',
        message: `Are you sure you want to delete material "${material.name}"? This action cannot be undone.`,
        type: 'confirm',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
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
    });
  }

  public viewHistory(material: Material) {
    this.dialog.open(MaterialHistoryDialogComponent, {
      width: '650px',
      data: material
    });
  }

  public calculateLandedCost(material: Material): number {
    if (material.type === 0) {
      const lme = Number(material.lmeUsdPerMt || 0);
      const premium = Number(material.premiumUsdPerMt || 0);
      const fx = Number(material.fxRate || 0);
      const freight = Number(material.freightInrPerMt || 0);
      return ((lme + premium) * fx + freight) / 1000;
    } else {
      return Number(material.directRateInrPerKg || 0);
    }
  }

  public updatePrice(material: Material) {
    if (!this.canUpdate()) {
      this.snackBar.open('You do not have permission to update pricing.', 'Close', { duration: 3000 });
      return;
    }

    const metaPayload = {
      name: material.name,
      type: material.type
    };

    const pricePayload = material.type === 0 ? {
      materialId: material.id,
      lmeUsdPerMt: Number(material.lmeUsdPerMt || 0),
      premiumUsdPerMt: Number(material.premiumUsdPerMt || 0),
      fxRate: Number(material.fxRate || 0),
      freightInrPerMt: Number(material.freightInrPerMt || 0)
    } : {
      materialId: material.id,
      directRateInrPerKg: Number(material.directRateInrPerKg || 0)
    };

    this.pricingService.updateMaterial(material.id, metaPayload).pipe(
      switchMap(() => this.pricingService.updateMaterialPrice(pricePayload))
    ).subscribe({
      next: () => {
        this.snackBar.open(`${material.name} updated successfully.`, 'Close', { duration: 3000 });
        this.loadMaterials();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to update material.', 'Close', { duration: 3000 });
      }
    });
  }
}

