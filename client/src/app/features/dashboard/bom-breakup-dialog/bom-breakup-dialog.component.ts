import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Sku, Material } from '../../../core/pricing.service';

export interface BomBreakupDialogData {
  sku: Sku;
  materials: Material[];
  rowMfgOverride?: number;
  rowConversionTypeOverride?: number;
  rowPctOverride?: number;
  rowAmtOverride?: number;
  rowOfferOverride?: number;
  loadingMode?: number;
  globalPct?: number;
  globalAmt?: number;
  globalOverheadPct?: number;
  globalMarginPct?: number;
  globalPacking?: number;
  globalFreight?: number;
  quantity?: number;
  rmCost?: number;
  mfgCost?: number;
  offerExGst?: number;
}

export interface BomLineDisplayItem {
  materialName: string;
  vendorName: string;
  pricingMethod: number;
  priceType: number;
  methodLabel: string;
  formulaText: string;
  pricingBasis: string;
  rateDisplay: string;
  priceFormula: string;
  unitPrice: number;
  weightPerUnit: number;
  weightPerUnitDisplay: string;
  totalWeightDisplay: string;
  unitLineCost: number;
  batchWeight: number;
  batchLineCost: number;
  lineCostDisplay: string;
}

@Component({
  selector: 'app-bom-breakup-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './bom-breakup-dialog.component.html',
  styleUrls: ['./bom-breakup-dialog.component.scss']
})
export class BomBreakupDialogComponent implements OnInit {
  public sku: Sku;
  public materials: Material[];
  
  public bomLinesDisplay: BomLineDisplayItem[] = [];
  public userQuantity: number = 1;
  public totalUnitCost: number = 0;
  public totalBatchCost: number = 0;
  public totalUnitWeight: number = 0;
  public totalBatchWeight: number = 0;

  // Breakdown & Costing Card Properties
  public rmTotalFormula: string = '';
  public totalRmCost: number = 0;
  public mfgTypeLabel: string = 'Percentage (%)';
  public mfgValueDisplay: string = '0%';
  public mfgAddition: number = 0;
  public mfgCost: number = 0;
  public loadingModeLabel: string = 'Margin %';
  public loadingValueDisplay: string = '5%';
  public loadingCost: number = 0;
  public offerExGst: number = 0;
  public totalAmount: number = 0;

  constructor(
    public dialogRef: MatDialogRef<BomBreakupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BomBreakupDialogData
  ) {
    this.sku = data.sku;
    this.materials = data.materials || [];
    this.userQuantity = data.quantity || this.sku?.quantity || 1;
  }

  ngOnInit() {
    this.calculateBreakup();
  }

  private calculateBreakup() {
    let sumUnitCost = 0;
    let sumBatchCost = 0;
    let sumUnitWeight = 0;
    let sumBatchWeight = 0;

    if (this.sku && this.sku.bomLines) {
      this.bomLinesDisplay = this.sku.bomLines.map((line: any) => {
        const mat = this.materials.find(m => m.id === line.materialId);
        const method = line.pricingMethod !== undefined && line.pricingMethod !== null ? Number(line.pricingMethod) : 1;
        const pType = line.priceType !== undefined && line.priceType !== null ? Number(line.priceType) : (mat ? Number(mat.type) : 0);

        let unitPrice = 0;
        let methodLabel = '';
        let formulaText = '';
        let pricingBasis = '';

        if (method === 1) { // Actual
          if (pType === 0) { // LME-linked
            const lme = mat ? Number(mat.lmeUsdPerMt || 0) : 0;
            const premium = mat ? Number(mat.premiumUsdPerMt || 0) : 0;
            const fx = mat ? Number(mat.fxRate || 0) : 0;
            const freight = mat ? Number(mat.freightInrPerMt || 0) : 0;
            unitPrice = ((lme + premium) * fx + freight) / 1000;
            methodLabel = 'Actual (LME-linked)';
            pricingBasis = 'LME-linked';
            if (lme > 0 || premium > 0 || fx > 0 || freight > 0) {
              formulaText = `(($${lme.toLocaleString()} + $${premium}) × ${fx} + ₹${freight.toLocaleString()}) / 1000`;
            } else {
              formulaText = `((LME + Premium) × FX + Freight) / 1000`;
            }
          } else { // Direct
            unitPrice = mat ? Number(mat.directRateInrPerKg || 0) : 0;
            methodLabel = 'Actual (Direct Rate)';
            pricingBasis = 'Direct Rate';
            formulaText = `Direct rate master: ₹${unitPrice.toFixed(2)}/kg`;
          }
        } else if (method === 0) { // Average
          const pMonth = line.pricingMonth ?? 0;
          const monthStr = pMonth === 0 ? 'This Month' : 'Prev Month';
          if (pType === 0) {
            methodLabel = `Average LME (${monthStr})`;
            pricingBasis = `Avg LME (${monthStr})`;
            unitPrice = mat ? (pMonth === 0 ? Number(mat.thisMonthAvgLme || line.manualPrice || 0) : Number(mat.prevMonthAvgLme || line.manualPrice || 0)) : Number(line.manualPrice || 0);
          } else {
            methodLabel = `Average Direct (${monthStr})`;
            pricingBasis = `Avg Direct (${monthStr})`;
            unitPrice = mat ? (pMonth === 0 ? Number(mat.thisMonthAvgDirect || line.manualPrice || 0) : Number(mat.prevMonthAvgDirect || line.manualPrice || 0)) : Number(line.manualPrice || 0);
          }
          formulaText = `${monthStr} monthly average rate`;
        } else { // Manual
          unitPrice = Number(line.manualPrice || 0);
          methodLabel = 'Manual Custom Price';
          pricingBasis = 'Manual Price';
          formulaText = `Custom manual rate: ₹${unitPrice.toFixed(2)}/kg`;
        }

        const weightPerUnit = Number(line.weightKg || 0);
        const unitLineCost = unitPrice * weightPerUnit;
        const batchWeight = weightPerUnit * this.userQuantity;
        const batchLineCost = unitLineCost * this.userQuantity;

        sumUnitCost += unitLineCost;
        sumBatchCost += batchLineCost;
        sumUnitWeight += weightPerUnit;
        sumBatchWeight += batchWeight;

        return {
          materialName: line.materialName || (mat ? mat.name : 'Unknown Material'),
          vendorName: mat?.vendorName || '--',
          pricingMethod: method,
          priceType: pType,
          methodLabel: methodLabel,
          formulaText: formulaText,
          pricingBasis: pricingBasis,
          rateDisplay: `₹${unitPrice.toFixed(2)} / kg`,
          priceFormula: formulaText,
          unitPrice: unitPrice,
          weightPerUnit: weightPerUnit,
          weightPerUnitDisplay: `${weightPerUnit.toFixed(2)} kg`,
          totalWeightDisplay: `${batchWeight.toFixed(2)} kg`,
          unitLineCost: unitLineCost,
          batchWeight: batchWeight,
          batchLineCost: batchLineCost,
          lineCostDisplay: `₹${batchLineCost.toFixed(2)} (${this.userQuantity > 1 ? `₹${unitLineCost.toFixed(2)} × ${this.userQuantity}` : `₹${unitLineCost.toFixed(2)}`})`
        };
      });
    }

    this.totalUnitCost = sumUnitCost;
    this.totalBatchCost = sumBatchCost;
    this.totalUnitWeight = sumUnitWeight;
    this.totalBatchWeight = sumBatchWeight;

    // Calculate RM Total
    this.totalRmCost = this.data.rmCost !== undefined ? this.data.rmCost : (sumUnitCost * this.userQuantity);
    this.rmTotalFormula = this.userQuantity > 1
      ? `₹${sumUnitCost.toFixed(2)} / ${this.sku.unit || 'unit'} × ${this.userQuantity} = ₹${this.totalRmCost.toFixed(2)}`
      : `₹${this.totalRmCost.toFixed(2)}`;

    // Manufacturing Cost (MFG)
    const convType = this.data.rowConversionTypeOverride !== undefined ? this.data.rowConversionTypeOverride : (this.sku.conversionType ?? 0);
    const convVal = this.data.rowMfgOverride !== undefined ? this.data.rowMfgOverride : (this.sku.conversionValue ?? 0);

    if (convType === 0) { // Percentage
      this.mfgTypeLabel = 'Percentage (%)';
      const pct = (convVal <= 1 && convVal > 0) ? Math.round(convVal * 100) : convVal;
      this.mfgValueDisplay = `${pct}%`;
      this.mfgAddition = this.totalRmCost * (pct / 100);
      this.mfgCost = this.totalRmCost + this.mfgAddition;
    } else { // ₹ / kg
      this.mfgTypeLabel = '₹ / kg';
      this.mfgValueDisplay = `₹${convVal.toFixed(2)} / kg`;
      this.mfgAddition = sumBatchWeight * convVal;
      this.mfgCost = this.totalRmCost + this.mfgAddition;
    }

    if (this.data.mfgCost !== undefined && this.data.mfgCost > 0) {
      this.mfgCost = this.data.mfgCost;
    }

    // Loading Cost
    const loadingMode = this.data.loadingMode ?? 0;
    const globalPct = this.data.globalPct ?? 0.05;
    const globalAmt = this.data.globalAmt ?? 10;

    if (loadingMode === 0) {
      const pct = (this.data.rowPctOverride !== undefined ? this.data.rowPctOverride : globalPct);
      this.loadingModeLabel = 'Margin %';
      this.loadingValueDisplay = `${Math.round(pct * 100)}%`;
      this.loadingCost = this.totalRmCost * pct;
    } else if (loadingMode === 1) {
      const amt = (this.data.rowAmtOverride !== undefined ? this.data.rowAmtOverride : globalAmt);
      this.loadingModeLabel = '₹ per unit';
      this.loadingValueDisplay = `₹${amt.toFixed(2)} / unit`;
      this.loadingCost = amt * this.userQuantity;
    } else if (loadingMode === 2) {
      const overhead = this.data.globalOverheadPct ?? 0.05;
      const margin = this.data.globalMarginPct ?? 0.05;
      const packing = this.data.globalPacking ?? 2;
      const freight = this.data.globalFreight ?? 3;
      this.loadingModeLabel = 'Itemised';
      this.loadingValueDisplay = `Overhead ${Math.round(overhead*100)}% + Margin ${Math.round(margin*100)}% + Packing ₹${packing} + Freight ₹${freight}`;
      this.loadingCost = (this.totalRmCost * (overhead + margin)) + ((packing + freight) * this.userQuantity);
    } else {
      this.loadingModeLabel = 'None';
      this.loadingValueDisplay = '0';
      this.loadingCost = 0;
    }

    // Offer Ex-GST
    if (this.data.rowOfferOverride !== undefined && this.data.rowOfferOverride > 0) {
      this.offerExGst = this.data.rowOfferOverride;
    } else if (this.data.offerExGst !== undefined && this.data.offerExGst > 0) {
      this.offerExGst = this.data.offerExGst;
    } else {
      this.offerExGst = (this.mfgCost + this.loadingCost) / (this.userQuantity > 0 ? this.userQuantity : 1);
    }

    this.totalAmount = this.offerExGst * this.userQuantity;
  }
  
  public close() {
    this.dialogRef.close();
  }
}
