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
  
  public bomLinesDisplay: any[] = [];
  public totalCost: number = 0;

  constructor(
    public dialogRef: MatDialogRef<BomBreakupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BomBreakupDialogData
  ) {
    this.sku = data.sku;
    this.materials = data.materials || [];
  }

  ngOnInit() {
    this.calculateBreakup();
  }

  private calculateBreakup() {
    let total = 0;
    if (this.sku.bomLines) {
      this.bomLinesDisplay = this.sku.bomLines.map((line: any) => {
        let unitPrice = 0;
        const mat = this.materials.find(m => m.id === line.materialId);
        
        if (line.pricingMethod === 1) { // Actual
          if (mat) {
            const pType = line.priceType !== undefined ? line.priceType : mat.type;
            if (pType === 0) { // LME
              const lme = Number(mat.lmeUsdPerMt || 0);
              const premium = Number(mat.premiumUsdPerMt || 0);
              const fx = Number(mat.fxRate || 0);
              const freight = Number(mat.freightInrPerMt || 0);
              unitPrice = ((lme + premium) * fx + freight) / 1000;
            } else {
              unitPrice = Number(mat.directRateInrPerKg || 0);
            }
          }
        } else {
          unitPrice = line.manualPrice || 0;
        }

        const quantity = line.weightKg || 0;
        const lineCost = unitPrice * quantity;
        total += lineCost;

        return {
          materialName: line.materialName || (mat ? mat.name : 'Unknown'),
          vendorName: mat?.vendorName || '--',
          quantity: quantity,
          unitPrice: unitPrice,
          lineCost: lineCost
        };
      });
    }
    this.totalCost = total;
  }
  
  public close() {
    this.dialogRef.close();
  }
}
