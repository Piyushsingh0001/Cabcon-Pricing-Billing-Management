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
    if (!group.selectedVendorName || !group.vendorOptions || group.vendorOptions.length === 0) {
      group.selectedDirectVariant = null;
      group.selectedVariant = group.selectedType === 0 ? (group.lmeState || {}) : null;
      this.calculateGroupAvg(group);
      return;
    }

    let selected = group.variants.find((v: any) => v.vendorName === group.selectedVendorName);
    
    if (!selected && group.variants.length > 0) {
      const base = group.variants[0];
      selected = {
        ...base,
        id: base.id,
        vendorName: group.selectedVendorName,
        vendorId: undefined,
        isPlaceholder: true,
        directRateInrPerKg: null,
        lastRecordedDirectRate: null,
        lastRecordedAsOnDate: null,
        isTodayUpdatedDirect: false,
        missingDaysCountDirect: 30,
        thisMonthAvgDirect: 0,
        prevMonthAvgDirect: 0,
        asOnDateDirect: null
      };
    }
    
    group.selectedDirectVariant = selected || null;
    group.selectedVariant = group.selectedType === 0 ? (group.lmeState || group.selectedDirectVariant) : group.selectedDirectVariant;
    this.calculateGroupAvg(group);
  }

  public getLastRecordedPrice(group: any): number {
    if (!group) return 0;
    if (group.selectedType === 0) {
      return Number(group.lmeState?.lastRecordedLandedCost || 0);
    } else {
      return Number(group.selectedDirectVariant?.lastRecordedDirectRate 
        || group.selectedDirectVariant?.landedCostDirect 
        || 0);
    }
  }

  public getLastRecordedDate(group: any): string | Date | null {
    if (!group) return null;
    if (group.selectedType === 0) {
      return group.lmeState?.asOnDate || null;
    } else {
      return group.selectedDirectVariant?.asOnDateDirect 
        || group.selectedDirectVariant?.lastRecordedAsOnDate 
        || null;
    }
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
      return group.lmeState?.missingDaysCountLme || 0;
    } else {
      if (!group.selectedVendorName || !group.vendorOptions || group.vendorOptions.length === 0) return 0;
      return group.selectedDirectVariant?.missingDaysCountDirect || 0;
    }
  }

  /** Returns true if today's price for this group's selected price type (and selected vendor if Direct) is already stamped. */
  public isTodayUpdated(group: any): boolean {
    if (!group) return false;

    if (group.selectedType === 0) {
      return !!group.lmeState?.isTodayUpdatedLme;
    } else {
      if (!group.selectedVendorName || !group.vendorOptions || group.vendorOptions.length === 0) return false;
      return !!group.selectedDirectVariant?.isTodayUpdatedDirect;
    }
  }

  /** Returns all vendors for this material that have missing price updates (missingDaysCountDirect > 0). */
  public getMissingVendors(group: any): { name: string; days: number }[] {
    if (!group || !group.vendorOptions || group.vendorOptions.length === 0) return [];

    const result: { name: string; days: number }[] = [];
    for (const vName of group.vendorOptions) {
      const variant = group.variants?.find((v: any) => v.vendorName === vName);
      const days = variant ? (variant.missingDaysCountDirect ?? 0) : 30;
      if (days > 0) {
        result.push({ name: vName, days });
      }
    }
    return result;
  }

  /** Formats the missing price notification text for the top of the card. */
  public getMissingVendorsNotification(group: any): string {
    const missing = this.getMissingVendors(group);
    if (missing.length === 0) return '';
    const items = missing.map(m => `${m.name} - ${m.days} ${m.days === 1 ? 'Day' : 'Days'}`);
    return `Price set missing for vendor ${items.join(', ')}. Click here to update.`;
  }

  /** Formats the missing price notification text for LME-linked material at the top of the card. */
  public getMissingLmeNotification(group: any): string {
    const days = this.getMissingDays(group);
    if (days <= 0) return '';
    return `Price set missing for ${days} ${days === 1 ? 'Day' : 'Days'}. Click here to update.`;
  }

  public getCategoryThemeClass(categoryName?: string): string {
    if (!categoryName) return 'theme-default';
    const norm = categoryName.trim().toLowerCase();
    if (norm.includes('core')) return 'theme-core';
    if (norm.includes('insulation')) return 'theme-insulation';
    if (norm.includes('inner')) return 'theme-inner-sheath';
    if (norm.includes('armour') || norm.includes('armor')) return 'theme-armour';
    if (norm.includes('outer') || norm.includes('pvc') || norm.includes('shell') || norm.includes('sheath')) return 'theme-outer-shell';
    return 'theme-default';
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
      panelClass: 'dialog-tier-backfill',
      data: {
        materialId: matId,
        materialName: group.name,
        type: targetType,
        vendorOptions: group.vendorOptions || [],
        currentVendorName: targetType === 1 ? group.selectedVendorName : '',
        currentVendorId: targetType === 1 ? group.selectedDirectVariant?.vendorId : undefined
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

  private sortMaterialGroups(): void {
    const categoryOrder: { [cat: string]: number } = {
      'core material': 1,
      'insulation material': 2,
      'inner sheath': 3,
      'armour wire': 4,
      'pvc outer sheath': 5,
      'pvc outer shell': 5
    };

    const getCategoryRank = (cat?: string): number => {
      if (!cat || !cat.trim()) return 99;
      const lower = cat.trim().toLowerCase();
      for (const key in categoryOrder) {
        if (lower.includes(key) || key.includes(lower)) {
          return categoryOrder[key];
        }
      }
      return 50;
    };

    this.materialGroups.sort((a, b) => {
      const rankA = getCategoryRank(a.categoryName);
      const rankB = getCategoryRank(b.categoryName);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      const catCompare = (a.categoryName || '').localeCompare(b.categoryName || '');
      if (catCompare !== 0) {
        return catCompare;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
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
          const freightVal = m.freightInrPerMt != null
            ? m.freightInrPerMt
            : (m.freightInrPerKg != null ? Number((m.freightInrPerKg * 1000).toFixed(2)) : null);

          const lastLme = Number(m.lmeUsdPerMt || 0);
          const lastPrem = Number(m.premiumUsdPerMt || 0);
          const lastFx = Number(m.fxRate || 0);
          const lastFreight = Number(freightVal || 0);
          const hasLmeData = !!(m.asOnDateLme || (lastLme > 0 && lastFx > 0));
          const lmeLandedCost = (lastLme > 0 && lastFx > 0)
            ? ((lastLme + lastPrem) * lastFx + lastFreight) / 1000
            : (m.landedCostLme ?? 0);

          if (!groupsMap.has(m.name)) {
            const prev = currentSelections.get(m.name);

            groupsMap.set(m.name, {
              name: m.name,
              categoryName: m.categoryName || '',
              density: m.density || 0,
              selectedType: prev?.type !== undefined ? prev.type : (m.type === 0 ? 0 : 1),
              variants: [],
              selectedVendorName: prev?.vendor || m.vendorName || '',
              avgPriceRange: 'this_month',
              calculatedAvg: 0,
              lmeState: {
                materialId: m.id,
                lmeUsdPerMt: m.isTodayUpdatedLme && m.lmeUsdPerMt ? m.lmeUsdPerMt : null,
                premiumUsdPerMt: m.isTodayUpdatedLme && m.premiumUsdPerMt ? m.premiumUsdPerMt : null,
                fxRate: m.isTodayUpdatedLme && m.fxRate ? m.fxRate : null,
                freightInrPerMt: m.isTodayUpdatedLme && freightVal ? freightVal : null,
                isTodayUpdatedLme: !!m.isTodayUpdatedLme,
                missingDaysCountLme: m.missingDaysCountLme || 0,
                thisMonthAvgLme: m.thisMonthAvgLme || 0,
                prevMonthAvgLme: m.prevMonthAvgLme || 0,
                asOnDate: m.asOnDateLme || null,
                lastRecordedLandedCost: hasLmeData ? lmeLandedCost : 0,
                lastRecordedLme: hasLmeData ? (m.lmeUsdPerMt || null) : null,
                lastRecordedPrem: hasLmeData ? (m.premiumUsdPerMt != null ? m.premiumUsdPerMt : null) : null,
                lastRecordedFx: hasLmeData ? (m.fxRate || null) : null,
                lastRecordedFreight: hasLmeData ? freightVal : null
              }
            });
          }
          const group = groupsMap.get(m.name);
          if (m.categoryName && !group.categoryName) {
            group.categoryName = m.categoryName;
          }
          if (m.density && !group.density) {
            group.density = m.density;
          }
          
          const hasDirectData = !!(m.asOnDateDirect || (m.directRateInrPerKg && m.directRateInrPerKg > 0) || m.landedCostDirect);
          const rawDirect = m.directRateInrPerKg ?? m.landedCostDirect ?? null;
          const variant = {
            ...m,
            lastRecordedDirectRate: hasDirectData ? rawDirect : null,
            lastRecordedAsOnDate: m.asOnDateDirect || null,
            directRateInrPerKg: (m.isTodayUpdatedDirect && m.directRateInrPerKg && m.directRateInrPerKg > 0) ? m.directRateInrPerKg : null
          };
          group.variants.push(variant);

          // If this variant has LME data, use it for lmeState
          if (hasLmeData) {
            group.lmeState = {
              materialId: m.id,
              lmeUsdPerMt: m.isTodayUpdatedLme && m.lmeUsdPerMt ? m.lmeUsdPerMt : null,
              premiumUsdPerMt: m.isTodayUpdatedLme && m.premiumUsdPerMt ? m.premiumUsdPerMt : null,
              fxRate: m.isTodayUpdatedLme && m.fxRate ? m.fxRate : null,
              freightInrPerMt: m.isTodayUpdatedLme && freightVal ? freightVal : null,
              isTodayUpdatedLme: !!m.isTodayUpdatedLme,
              missingDaysCountLme: m.missingDaysCountLme || 0,
              thisMonthAvgLme: m.thisMonthAvgLme || 0,
              prevMonthAvgLme: m.prevMonthAvgLme || 0,
              asOnDate: m.asOnDateLme || null,
              lastRecordedLandedCost: lmeLandedCost,
              lastRecordedLme: m.lmeUsdPerMt || null,
              lastRecordedPrem: m.premiumUsdPerMt != null ? m.premiumUsdPerMt : null,
              lastRecordedFx: m.fxRate || null,
              lastRecordedFreight: freightVal
            };
          }
        });

        this.materialGroups = Array.from(groupsMap.values());
        this.sortMaterialGroups();
        
        this.pricingService.getVendorsApi().subscribe({
          next: (vendorsRes) => {
            const activeVendors = (vendorsRes || []).filter(v => v.isActive).map(v => v.name);

            this.pricingService.getVendorMaterialMappingsApi().subscribe({
              next: (mappingsRes) => {
                const vendorMappings: { [matName: string]: string[] } = {};
                (mappingsRes || []).forEach(m => {
                  const activeMapped = (m.vendorNames || []).filter(vn => activeVendors.includes(vn));
                  vendorMappings[m.materialName] = activeMapped;
                });

                this.materialGroups.forEach(group => {
                  const mapped = vendorMappings[group.name] || [];
                  group.vendorOptions = mapped;

                  if (group.vendorOptions.length > 0) {
                    if (!group.selectedVendorName || !group.vendorOptions.includes(group.selectedVendorName)) {
                      group.selectedVendorName = group.vendorOptions[0];
                    }
                  } else {
                    group.selectedVendorName = '';
                  }

                  this.updateGroupSelectedVariant(group);
                });

                this.sortMaterialGroups();
                this.loading.set(false);
                this.cdr.detectChanges();
              },
              error: () => {
                this.materialGroups.forEach(group => {
                  group.vendorOptions = [];
                  group.selectedVendorName = '';
                  this.updateGroupSelectedVariant(group);
                });
                this.sortMaterialGroups();
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
    const existingNames = this.materialGroups.map(g => g.name);
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      panelClass: 'dialog-tier-sm',
      data: {
        material: null,
        existingNames: existingNames
      }
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public editMaterial(material: Material) {
    const existingNames = this.materialGroups.map(g => g.name);
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      panelClass: 'dialog-tier-sm',
      data: {
        material: material,
        existingNames: existingNames
      }
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  public editMaterialGroup(group: any) {
    const mat = group.variants?.find((v: any) => v.id > 0) || { id: group.lmeState?.materialId || 0, name: group.name, categoryName: group.categoryName, density: group.density };
    const existingNames = this.materialGroups.map(g => g.name);
    const dialogRef = this.dialog.open(MaterialCreateEditDialogComponent, {
      panelClass: 'dialog-tier-sm',
      data: {
        material: {
          id: mat.id || group.lmeState?.materialId,
          name: group.name,
          categoryName: group.categoryName,
          density: group.density
        },
        existingNames: existingNames
      }
    });
    dialogRef.afterClosed().subscribe(res => { if (res) this.loadMaterials(); });
  }

  // removed delete method

  public viewHistory(group: any) {
    const matId = group.lmeState?.materialId || group.variants?.find((v: any) => v.id > 0)?.id || group.variants?.[0]?.id || 0;
    if (matId === 0) return;

    this.dialog.open(MaterialHistoryDialogComponent, {
      panelClass: 'dialog-tier-history',
      data: {
        materialId: matId,
        materialName: group.name,
        group: group,
        selectedType: group.selectedType,
        selectedVendorName: group.selectedVendorName,
        vendorOptions: group.vendorOptions || []
      }
    });
  }

  public openTrendChart(group: any) {
    const matId = group.lmeState?.materialId || group.variants?.find((v: any) => v.id > 0)?.id || group.variants?.[0]?.id || 0;
    if (matId === 0) return;

    this.dialog.open(MaterialTrendDialogComponent, {
      panelClass: 'dialog-tier-lg',
      data: {
        id: matId,
        name: group.name,
        type: group.selectedType
      }
    });
  }

  public getGlobalFxRate(): number {
    for (const g of this.materialGroups) {
      if (g.lmeState?.fxRate && Number(g.lmeState.fxRate) > 0) {
        return Number(g.lmeState.fxRate);
      }
      if (g.lmeState?.lastRecordedFx && Number(g.lmeState.lastRecordedFx) > 0) {
        return Number(g.lmeState.lastRecordedFx);
      }
    }
    for (const m of this.materials) {
      if (m.fxRate && Number(m.fxRate) > 0) {
        return Number(m.fxRate);
      }
    }
    return 86.0;
  }

  public getFxPlaceholder(group: any): string {
    const fx = (group.lmeState?.lastRecordedFx && Number(group.lmeState.lastRecordedFx) > 0)
      ? Number(group.lmeState.lastRecordedFx)
      : this.getGlobalFxRate();
    return fx > 0 ? fx.toFixed(2) : '86.00';
  }

  public calculateLandedCost(group: any): number {
    if (!group) return 0;
    if (group.selectedType === 0) {
      const fallbackFx = (group.lmeState?.lastRecordedFx && Number(group.lmeState.lastRecordedFx) > 0)
        ? Number(group.lmeState.lastRecordedFx)
        : this.getGlobalFxRate();

      const lme = this.parseValue(group.lmeState?.lmeUsdPerMt, group.lmeState?.lastRecordedLme);
      let fx = this.parseValue(group.lmeState?.fxRate, fallbackFx);
      if (fx <= 0) {
        fx = fallbackFx > 0 ? fallbackFx : 86.0;
      }
      const prem = this.parseValue(group.lmeState?.premiumUsdPerMt, group.lmeState?.lastRecordedPrem);
      const freight = this.parseValue(group.lmeState?.freightInrPerMt, group.lmeState?.lastRecordedFreight);

      const calculated = ((lme + prem) * fx + freight) / 1000;
      if (calculated > 0) {
        return calculated;
      }
      return Number(group.lmeState?.lastRecordedLandedCost || 0);
    } else {
      const direct = this.parseValue(
        group.selectedDirectVariant?.directRateInrPerKg,
        group.selectedDirectVariant?.lastRecordedDirectRate || group.selectedDirectVariant?.landedCostDirect
      );
      return direct;
    }
  }

  private parseValue(val: any, fallback: any = 0): number {
    if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
      return Number(val);
    }
    if (fallback !== null && fallback !== undefined && fallback !== '' && !isNaN(Number(fallback))) {
      return Number(fallback);
    }
    return 0;
  }

  public updatePrice(group: any) {
    if (!this.canUpdate() || !group) return;

    if (group.selectedType === 0) {
      // Validate LME Price
      const fallbackFx = (group.lmeState?.lastRecordedFx && Number(group.lmeState.lastRecordedFx) > 0)
        ? Number(group.lmeState.lastRecordedFx)
        : this.getGlobalFxRate();

      const lme = group.lmeState?.lmeUsdPerMt != null && group.lmeState?.lmeUsdPerMt !== ''
        ? group.lmeState.lmeUsdPerMt
        : group.lmeState?.lastRecordedLme;
      const fx = group.lmeState?.fxRate != null && group.lmeState?.fxRate !== ''
        ? group.lmeState.fxRate
        : fallbackFx;
      const prem = group.lmeState?.premiumUsdPerMt != null && group.lmeState?.premiumUsdPerMt !== ''
        ? group.lmeState.premiumUsdPerMt
        : (group.lmeState?.lastRecordedPrem ?? 0);
      const freight = group.lmeState?.freightInrPerMt != null && group.lmeState?.freightInrPerMt !== ''
        ? group.lmeState.freightInrPerMt
        : (group.lmeState?.lastRecordedFreight ?? 0);

      if (lme === null || lme === undefined || lme === '' || Number(lme) <= 0) {
        this.snackBar.open('Please enter a valid LME (USD/MT) greater than 0.', 'Close', { duration: 3500 });
        return;
      }
      if (fx === null || fx === undefined || fx === '' || Number(fx) <= 0) {
        this.snackBar.open('Please enter a valid FX Rate (₹/USD) greater than 0.', 'Close', { duration: 3500 });
        return;
      }
      if (prem === null || prem === undefined || prem === '' || Number(prem) < 0) {
        this.snackBar.open('Please enter a valid Premium (USD/MT) >= 0.', 'Close', { duration: 3500 });
        return;
      }
      if (freight === null || freight === undefined || freight === '' || Number(freight) < 0) {
        this.snackBar.open('Please enter a valid Freight (₹/MT) >= 0.', 'Close', { duration: 3500 });
        return;
      }

      this.loading.set(true);
      const lmeMatId = group.lmeState?.materialId || group.variants?.find((v: any) => v.type === 0)?.id || group.variants?.[0]?.id;
      const pricePayload = {
        materialId: lmeMatId,
        type: 0,
        lmeUsdPerMt: Number(lme),
        premiumUsdPerMt: Number(prem),
        fxRate: Number(fx),
        freightInrPerKg: Number(freight) / 1000,
        freightInrPerMt: Number(freight)
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
      // Validate Direct Price (Vendor-specific)
      if (!group.selectedVendorName || !group.vendorOptions || group.vendorOptions.length === 0) {
        this.snackBar.open('Please associate a vendor in Manage Vendors before updating Direct price.', 'Close', { duration: 3500 });
        return;
      }
      const variant = group.selectedDirectVariant;
      const directRate = variant?.directRateInrPerKg;
      if (directRate === null || directRate === undefined || directRate === '' || Number(directRate) <= 0) {
        this.snackBar.open('Please enter a valid Direct Price (₹/kg) greater than 0.', 'Close', { duration: 3500 });
        return;
      }

      this.loading.set(true);
      const matId = (variant && variant.id > 0) ? variant.id : (group.variants?.[0]?.id || 0);
      const pricePayload = {
        materialId: matId,
        type: 1,
        vendorId: variant?.vendorId,
        vendorName: group.selectedVendorName,
        directRateInrPerKg: Number(directRate)
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
