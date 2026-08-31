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
import { MaterialBackfillDialogComponent } from './material-backfill-dialog/material-backfill-dialog.component';
import { MaterialTrendDialogComponent } from './material-trend-dialog/material-trend-dialog.component';
import { VendorManageDialogComponent } from './vendor-manage-dialog/vendor-manage-dialog.component';

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
  public materialGroups: any[] = [];
  public loading = signal(true);

  // Monthly Averages
  public showAverages = false;
  public monthlyAverages: any[] = [];
  public selectedMonth = new Date().getMonth() + 1;
  public selectedYear = new Date().getFullYear();
  public averageColumns = ['materialName', 'vendorName', 'averageCost'];

  public months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  
  public years = [2024, 2025, 2026, 2027];

  ngOnInit() {
    this.loadMaterials();
  }

  public onVendorChange(group: any) {
    this.updateGroupSelectedVariant(group);
  }

  private updateGroupSelectedVariant(group: any) {
    let selected = group.variants.find((v: any) => v.vendorName === group.selectedVendorName);
    
    if (!selected && group.variants.length > 0) {
      const base = group.variants[0];
      selected = {
        ...base,
        id: 0,
        vendorName: group.selectedVendorName,
        isPlaceholder: true,
        lmeUsdPerMt: base.lmeUsdPerMt || 0,
        premiumUsdPerMt: base.premiumUsdPerMt || 0,
        fxRate: base.fxRate || 0,
        freightInrPerMt: base.freightInrPerMt || 0,
        directRateInrPerKg: base.directRateInrPerKg || 0
      };
    }
    
    group.selectedVariant = selected || group.variants[0];
    if (group.selectedVariant) {
      group.selectedVariantId = group.selectedVariant.id;
    }
    this.calculateGroupAvg(group);
  }

  public calculateGroupAvg(group: any) {
    if (!group.selectedVariant) return;
    const isLme = group.selectedVariant.type === 0;
    
    if (group.avgPriceRange === 'prev_month') {
      group.calculatedAvg = isLme ? (group.selectedVariant.prevMonthAvgLme || 0) : (group.selectedVariant.prevMonthAvgDirect || 0);
    } else {
      group.calculatedAvg = isLme ? (group.selectedVariant.thisMonthAvgLme || 0) : (group.selectedVariant.thisMonthAvgDirect || 0);
    }
  }

  public onTypeChange(group: any) {
    this.calculateGroupAvg(group);
  }

  public toggleAverages() {
    this.showAverages = !this.showAverages;
    if (this.showAverages) {
      this.loadMonthlyAverages();
    }
  }

  public loadMonthlyAverages() {
    this.pricingService.getMonthlyAverage(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => {
        this.monthlyAverages = res;
        this.cdr.detectChanges();
      },
      error: () => {
        this.snackBar.open('Failed to load monthly averages.', 'Close', { duration: 3000 });
      }
    });
  }

  public getMissingDays(group: any): number {
    if (!group.selectedVariant) return 0;
    const isLme = group.selectedVariant.type === 0;
    return isLme ? (group.selectedVariant.missingDaysCountLme || 0) : (group.selectedVariant.missingDaysCountDirect || 0);
  }

  public openBackfill(material: Material) {
    if (!this.canUpdate()) return;
    const dialogRef = this.dialog.open(MaterialBackfillDialogComponent, {
      panelClass: 'dialog-auto-fit',
      data: material
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public openManageVendors() {
    const materialNames = this.materialGroups.map(g => g.name);
    const dialogRef = this.dialog.open(VendorManageDialogComponent, {
      panelClass: 'dialog-auto-fit',
      data: {
        materialNames: materialNames,
        allMaterials: this.materials
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loadMaterials();
      }
    });
  }

  public canUpdate(): boolean {
    return this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  }

  public loadMaterials() {
    this.loading.set(true);

    // Preserve current selections before reloading
    const currentSelections = new Map<string, string>();
    this.materialGroups.forEach(g => {
      if (g.selectedVendorName) {
        currentSelections.set(g.name, g.selectedVendorName);
      }
    });

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
        this.materials = res.items || [];
        // Group materials by Name
        const groupsMap = new Map<string, any>();
        
        res.items.forEach(m => {
          if (!groupsMap.has(m.name)) {
            groupsMap.set(m.name, {
              name: m.name,
              variants: [],
              selectedVendorName: currentSelections.get(m.name) || m.vendorName || '',
              avgPriceRange: 'this_month',
              calculatedAvg: 0
            });
          }
          groupsMap.get(m.name).variants.push(m);
        });

        this.materialGroups = Array.from(groupsMap.values());
        
        this.pricingService.getVendorsApi().subscribe({
          next: (vendorsRes) => {
            const allDbVendors = (vendorsRes || []).map(v => v.name);

            this.pricingService.getVendorMaterialMappingsApi().subscribe({
              next: (mappingsRes) => {
                const vendorMappings: { [matName: string]: string[] } = {};
                (mappingsRes || []).forEach(m => {
                  vendorMappings[m.materialName] = m.vendorNames || [];
                });

                this.materialGroups.forEach(group => {
                  const mappedVendors = vendorMappings[group.name];
                  if (mappedVendors && Array.isArray(mappedVendors) && mappedVendors.length > 0) {
                    group.vendorOptions = mappedVendors;
                  } else {
                    const variantVendors = group.variants.map((v: any) => v.vendorName).filter(Boolean);
                    group.vendorOptions = variantVendors.length > 0 ? Array.from(new Set(variantVendors)) : allDbVendors;
                  }

                  if (!group.selectedVendorName || !group.vendorOptions.includes(group.selectedVendorName)) {
                    group.selectedVendorName = group.vendorOptions[0] || 'Default Vendor';
                  }

                  this.updateGroupSelectedVariant(group);
                });

                this.loading.set(false);
                this.cdr.detectChanges();
              },
              error: () => {
                this.materialGroups.forEach(group => {
                  const variantVendors = group.variants.map((v: any) => v.vendorName).filter(Boolean);
                  group.vendorOptions = variantVendors.length > 0 ? Array.from(new Set(variantVendors)) : allDbVendors;
                  this.updateGroupSelectedVariant(group);
                });
                this.loading.set(false);
                this.cdr.detectChanges();
              }
            });
          },
          error: () => {
            this.loading.set(false);
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load materials data.', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  public addMaterial() {
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      panelClass: 'dialog-tier-sm',
      data: null
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public editMaterial(material: Material) {
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      panelClass: 'dialog-tier-sm',
      data: material
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  // removed delete method

  public viewHistory(group: any) {
    const material = group.selectedVariant;
    if (!material) return;
    this.dialog.open(MaterialHistoryDialogComponent, {
      panelClass: 'dialog-tier-lg',
      data: {
        material: material,
        group: group,
        variants: group.variants,
        selectedVariantId: group.selectedVariantId
      }
    });
  }

  public openTrendChart(group: any) {
    const material = group.selectedVariant;
    if (!material) return;
    this.dialog.open(MaterialTrendDialogComponent, {
      panelClass: 'dialog-tier-md',
      data: material
    });
  }

  public calculateLandedCost(group: any): number {
    const material = group.selectedVariant;
    if (!material) return 0;
    if (material.type === 0) {
      return (((material.lmeUsdPerMt || 0) + (material.premiumUsdPerMt || 0)) * (material.fxRate || 0) + (material.freightInrPerMt || 0)) / 1000;
    }
    return material.directRateInrPerKg || 0;
  }

  public updatePrice(group: any) {
    if (!this.canUpdate()) return;
    const material = group.selectedVariant;
    this.loading.set(true);

    if (material.id === 0) {
      const createPayload = {
        name: material.name,
        vendorName: material.vendorName,
        type: material.type,
        lmeUsdPerMt: Number(material.lmeUsdPerMt || 0),
        premiumUsdPerMt: Number(material.premiumUsdPerMt || 0),
        fxRate: Number(material.fxRate || 0),
        freightInrPerMt: Number(material.freightInrPerMt || 0),
        directRateInrPerKg: Number(material.directRateInrPerKg || 0)
      };

      this.pricingService.createMaterial(createPayload).subscribe({
        next: () => {
          this.snackBar.open(`${material.name} (${material.vendorName}) updated successfully.`, 'Close', { duration: 3000 });
          this.loadMaterials();
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to update price.', 'Close', { duration: 3000 });
        }
      });
    } else {
      const metaPayload = {
        name: material.name,
        vendorName: material.vendorName,
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
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to update material.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

