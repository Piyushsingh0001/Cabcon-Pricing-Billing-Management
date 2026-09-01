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
        directRateInrPerKg: base.directRateInrPerKg || 0,
        isTodayUpdatedDirect: false,
        missingDaysCountDirect: 1
      };
    }
    
    group.selectedDirectVariant = selected || group.variants[0] || {};
    group.selectedVariant = group.selectedType === 0 ? (group.lmeVariant || group.selectedDirectVariant) : group.selectedDirectVariant;
    this.calculateGroupAvg(group);
  }

  public calculateGroupAvg(group: any) {
    if (!group) return;
    if (group.selectedType === 0) {
      const lmeSource = group.lmeState || group.variants?.find((v: any) => v.type === 0) || group.variants?.[0];
      group.calculatedAvg = group.avgPriceRange === 'prev_month'
        ? (lmeSource?.prevMonthAvgLme || 0)
        : (lmeSource?.thisMonthAvgLme || 0);
    } else {
      const directSource = group.selectedDirectVariant || group.variants?.[0];
      group.calculatedAvg = group.avgPriceRange === 'prev_month'
        ? (directSource?.prevMonthAvgDirect || 0)
        : (directSource?.thisMonthAvgDirect || 0);
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
    if (!group) return 0;
    if (group.selectedType === 0) {
      return group.lmeState?.missingDaysCountLme ?? (group.variants?.find((v: any) => v.type === 0)?.missingDaysCountLme || 0);
    } else {
      return group.selectedDirectVariant?.missingDaysCountDirect || 0;
    }
  }

  /** Returns true if today's price for this group's selected price type is already stamped. */
  public isTodayUpdated(group: any): boolean {
    if (!group) return false;

    if (group.selectedType === 0) {
      const lme = group.lmeState;
      if (lme?.isTodayUpdatedLme) return true;
      if (lme?.asOnDate) {
        const asOn = new Date(lme.asOnDate);
        const now = new Date();
        if (asOn.getFullYear() === now.getFullYear() &&
            asOn.getMonth() === now.getMonth() &&
            asOn.getDate() === now.getDate()) {
          return true;
        }
      }
      return false;
    } else {
      const v = group.selectedDirectVariant;
      if (!v) return false;
      if (v.isTodayUpdatedDirect) return true;
      if (!v.isPlaceholder && v.asOnDate) {
        const asOn = new Date(v.asOnDate);
        const now = new Date();
        if (asOn.getFullYear() === now.getFullYear() &&
            asOn.getMonth() === now.getMonth() &&
            asOn.getDate() === now.getDate()) {
          return true;
        }
      }
      return false;
    }
  }

  public openBackfill(group: any) {
    if (!this.canUpdate() || !group) return;

    const targetType = group.selectedType; // 0 for LME, 1 for Direct
    let matId = 0;
    if (targetType === 0) {
      matId = group.lmeState?.materialId || group.variants?.find((v: any) => v.id > 0)?.id || 0;
    } else {
      matId = group.selectedDirectVariant?.id || group.variants?.find((v: any) => v.id > 0)?.id || 0;
    }

    if (matId === 0) {
      this.snackBar.open('Please save a price first before backfilling.', 'Close', { duration: 3500 });
      return;
    }

    const dialogRef = this.dialog.open(MaterialBackfillDialogComponent, {
      panelClass: 'dialog-auto-fit',
      data: {
        materialId: matId,
        materialName: group.name,
        type: targetType,
        vendorOptions: group.vendorOptions || [],
        currentVendorName: targetType === 1 ? group.selectedVendorName : ''
      }
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
    const currentSelections = new Map<string, { vendor?: string; type?: number }>();
    this.materialGroups.forEach(g => {
      currentSelections.set(g.name, {
        vendor: g.selectedVendorName,
        type: g.selectedType
      });
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
            const prev = currentSelections.get(m.name);
            groupsMap.set(m.name, {
              name: m.name,
              selectedType: prev?.type !== undefined ? prev.type : m.type,
              variants: [],
              selectedVendorName: prev?.vendor || m.vendorName || '',
              avgPriceRange: 'this_month',
              calculatedAvg: 0,
              lmeState: {
                materialId: m.id,
                lmeUsdPerMt: m.lmeUsdPerMt || 0,
                premiumUsdPerMt: m.premiumUsdPerMt || 0,
                fxRate: m.fxRate || 0,
                freightInrPerMt: m.freightInrPerMt || 0,
                isTodayUpdatedLme: m.isTodayUpdatedLme,
                missingDaysCountLme: m.missingDaysCountLme,
                thisMonthAvgLme: m.thisMonthAvgLme,
                prevMonthAvgLme: m.prevMonthAvgLme,
                asOnDate: m.asOnDate
              }
            });
          }
          const group = groupsMap.get(m.name);
          group.variants.push(m);
          // If this variant has LME data, use it for lmeState
          if (m.type === 0 || (m.lmeUsdPerMt && m.lmeUsdPerMt > 0)) {
            group.lmeState = {
              materialId: m.id,
              lmeUsdPerMt: m.lmeUsdPerMt || 0,
              premiumUsdPerMt: m.premiumUsdPerMt || 0,
              fxRate: m.fxRate || 0,
              freightInrPerMt: m.freightInrPerMt || 0,
              isTodayUpdatedLme: m.isTodayUpdatedLme,
              missingDaysCountLme: m.missingDaysCountLme,
              thisMonthAvgLme: m.thisMonthAvgLme,
              prevMonthAvgLme: m.prevMonthAvgLme,
              asOnDate: m.asOnDate
            };
          }
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
    const targetType = group.selectedType;
    const targetMaterial = targetType === 0
      ? (group.variants?.find((v: any) => v.type === 0) || group.variants[0])
      : group.selectedDirectVariant;

    if (!targetMaterial) return;
    this.dialog.open(MaterialHistoryDialogComponent, {
      panelClass: 'dialog-tier-lg',
      data: {
        material: targetMaterial,
        group: group,
        variants: group.variants,
        selectedVariantId: targetMaterial.id
      }
    });
  }

  public openTrendChart(group: any) {
    const targetType = group.selectedType;
    const targetMaterial = targetType === 0
      ? (group.variants?.find((v: any) => v.type === 0) || group.variants[0])
      : group.selectedDirectVariant;

    if (!targetMaterial) return;
    this.dialog.open(MaterialTrendDialogComponent, {
      panelClass: 'dialog-tier-md',
      data: targetMaterial
    });
  }

  public calculateLandedCost(group: any): number {
    if (!group) return 0;
    if (group.selectedType === 0) {
      const lme = Number(group.lmeState?.lmeUsdPerMt || 0);
      const prem = Number(group.lmeState?.premiumUsdPerMt || 0);
      const fx = Number(group.lmeState?.fxRate || 0);
      const freight = Number(group.lmeState?.freightInrPerMt || 0);
      return ((lme + prem) * fx + freight) / 1000;
    } else {
      return Number(group.selectedDirectVariant?.directRateInrPerKg || 0);
    }
  }

  public updatePrice(group: any) {
    if (!this.canUpdate() || !group) return;
    this.loading.set(true);

    if (group.selectedType === 0) {
      // Update LME Price
      const lmeMatId = group.lmeState?.materialId || group.variants?.find((v: any) => v.type === 0)?.id || group.variants?.[0]?.id;
      const pricePayload = {
        materialId: lmeMatId,
        type: 0,
        lmeUsdPerMt: Number(group.lmeState.lmeUsdPerMt || 0),
        premiumUsdPerMt: Number(group.lmeState.premiumUsdPerMt || 0),
        fxRate: Number(group.lmeState.fxRate || 0),
        freightInrPerKg: Number(group.lmeState.freightInrPerMt || 0) / 1000,
        freightInrPerMt: Number(group.lmeState.freightInrPerMt || 0)
      };
      this.pricingService.updateMaterialPrice(pricePayload).subscribe({
        next: () => {
          this.snackBar.open(`${group.name} (LME) updated successfully.`, 'Close', { duration: 3000 });
          if (group.lmeState) {
            group.lmeState.isTodayUpdatedLme = true;
            group.lmeState.asOnDate = new Date().toISOString();
          }
          this.loadMaterials();
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to update LME price.', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Update Direct Price (Vendor-specific)
      const variant = group.selectedDirectVariant;
      const matId = (variant && variant.id > 0) ? variant.id : (group.variants?.[0]?.id || 0);
      const pricePayload = {
        materialId: matId,
        type: 1,
        vendorId: variant?.vendorId,
        vendorName: group.selectedVendorName,
        directRateInrPerKg: Number(variant?.directRateInrPerKg || 0)
      };
      this.pricingService.updateMaterialPrice(pricePayload).subscribe({
        next: () => {
          this.snackBar.open(`${group.name} (${group.selectedVendorName}) updated successfully.`, 'Close', { duration: 3000 });
          if (variant) {
            variant.isTodayUpdatedDirect = true;
            variant.asOnDate = new Date().toISOString();
          }
          this.loadMaterials();
        },
        error: (err) => {
          this.loading.set(false);
          this.snackBar.open(err.error?.message || 'Failed to update Direct price.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
