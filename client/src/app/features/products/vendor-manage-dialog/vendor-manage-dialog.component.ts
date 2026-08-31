import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService } from '../../../core/pricing.service';

export interface VendorManageDialogData {
  materialNames: string[];
  allMaterials?: any[];
}

@Component({
  selector: 'app-vendor-manage-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule
  ],
  templateUrl: './vendor-manage-dialog.component.html',
  styleUrls: ['./vendor-manage-dialog.component.scss']
})
export class VendorManageDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);

  public materialNames: string[] = [];
  public vendors: string[] = [];
  public mappings: { [materialName: string]: string[] } = {};
  public newVendorName = '';

  constructor(
    public dialogRef: MatDialogRef<VendorManageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VendorManageDialogData
  ) {}

  ngOnInit(): void {
    this.materialNames = this.data?.materialNames || [];

    // Fetch Vendors strictly from Database API
    this.pricingService.getVendorsApi().subscribe({
      next: (res) => {
        this.vendors = (res || []).map(v => v.name);

        // Fetch Mappings strictly from Database API
        this.pricingService.getVendorMaterialMappingsApi().subscribe({
          next: (mappingsRes) => {
            const apiMappings: { [matName: string]: string[] } = {};
            (mappingsRes || []).forEach(m => {
              apiMappings[m.materialName] = m.vendorNames || [];
            });

            this.materialNames.forEach(matName => {
              this.mappings[matName] = apiMappings[matName] ? [...apiMappings[matName]] : [];
            });
          },
          error: () => {
            this.materialNames.forEach(matName => {
              this.mappings[matName] = [];
            });
          }
        });
      },
      error: () => {
        this.vendors = [];
        this.materialNames.forEach(matName => {
          this.mappings[matName] = [];
        });
      }
    });
  }

  public isMapped(vendor: string, materialName: string): boolean {
    return (this.mappings[materialName] || []).includes(vendor);
  }

  public toggleMapping(vendor: string, materialName: string): void {
    if (!this.mappings[materialName]) {
      this.mappings[materialName] = [];
    }
    const index = this.mappings[materialName].indexOf(vendor);
    if (index > -1) {
      this.mappings[materialName].splice(index, 1);
    } else {
      this.mappings[materialName].push(vendor);
    }
  }

  public addVendor(): void {
    const trimmed = (this.newVendorName || '').trim();
    if (!trimmed) return;

    if (this.vendors.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      this.snackBar.open(`Vendor "${trimmed}" already exists.`, 'Close', { duration: 3000 });
      return;
    }

    this.pricingService.createVendorApi(trimmed).subscribe({
      next: (res) => {
        const vName = res?.name || trimmed;
        if (!this.vendors.includes(vName)) {
          this.vendors.push(vName);
        }
        this.materialNames.forEach(matName => {
          if (!this.mappings[matName]) {
            this.mappings[matName] = [];
          }
        });
        this.newVendorName = '';
        this.snackBar.open(`Vendor "${vName}" added to database.`, 'Close', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open(err?.error || 'Failed to add vendor to database.', 'Close', { duration: 3000 });
      }
    });
  }

  public removeVendor(vendor: string): void {
    this.pricingService.getVendorsApi().subscribe(allVendors => {
      const found = (allVendors || []).find(v => v.name.toLowerCase() === vendor.toLowerCase());
      if (found && found.id) {
        this.pricingService.deleteVendorApi(found.id).subscribe({
          next: () => {
            const idx = this.vendors.indexOf(vendor);
            if (idx > -1) this.vendors.splice(idx, 1);
            this.materialNames.forEach(matName => {
              if (this.mappings[matName]) {
                const mIdx = this.mappings[matName].indexOf(vendor);
                if (mIdx > -1) this.mappings[matName].splice(mIdx, 1);
              }
            });
            this.snackBar.open(`Vendor "${vendor}" removed from database.`, 'Close', { duration: 2500 });
          },
          error: () => {
            this.snackBar.open(`Failed to remove vendor from database.`, 'Close', { duration: 3000 });
          }
        });
      } else {
        const idx = this.vendors.indexOf(vendor);
        if (idx > -1) this.vendors.splice(idx, 1);
        this.snackBar.open(`Vendor "${vendor}" removed.`, 'Close', { duration: 2500 });
      }
    });
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onSave(): void {
    const payload = this.materialNames.map(matName => ({
      materialName: matName,
      vendorNames: this.mappings[matName] || []
    }));

    this.pricingService.saveVendorMaterialMappingsApi(payload).subscribe({
      next: () => {
        this.snackBar.open('Vendor-Material mappings saved to database successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snackBar.open(err?.error || 'Failed to save mappings to database.', 'Close', { duration: 3000 });
      }
    });
  }
}
