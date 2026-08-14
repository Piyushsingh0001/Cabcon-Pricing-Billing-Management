import { ChangeDetectorRef, Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { forkJoin } from 'rxjs';
import { PricingService, Material, MaterialPriceHistory } from '../../../core/pricing.service';

@Component({
  selector: 'app-material-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatMenuModule
  ],
  providers: [DatePipe, DecimalPipe],
  templateUrl: './material-history-dialog.component.html',
  styleUrls: ['./material-history-dialog.component.scss']
})
export class MaterialHistoryDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);
  private decimalPipe = inject(DecimalPipe);

  public material: Material | null = null;
  public groupName: string = '';
  public vendors: Array<{ id: number; vendorName: string }> = [];

  // Filter state
  public selectedVendorId: number | string = 'ALL';
  public selectedYear: number | string = new Date().getFullYear();
  public selectedMonth: number | string = new Date().getMonth() + 1;
  public startDate: string = '';
  public endDate: string = '';

  public months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  public years: number[] = [];

  public allRawHistory: MaterialPriceHistory[] = [];
  public historyData = new MatTableDataSource<MaterialPriceHistory>();
  public columns = ['effectiveDate', 'lmeRate', 'lmeLandedCost', 'directLandedCost', 'updatedBy'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const currentYr = new Date().getFullYear();
    this.years = [currentYr - 2, currentYr - 1, currentYr, currentYr + 1, currentYr + 2];
  }

  ngOnInit() {
    if (this.data && this.data.variants) {
      this.groupName = this.data.group?.name || this.data.material?.name || '';
      this.material = this.data.material;
      this.vendors = (this.data.variants || []).map((v: any) => ({
        id: v.id,
        vendorName: v.vendorName || 'Default Vendor'
      }));
      this.selectedVendorId = this.data.selectedVariantId || this.material?.id || (this.vendors[0]?.id ?? 'ALL');
    } else if (this.data) {
      this.material = this.data;
      this.groupName = this.data.name || '';
      this.vendors = [{ id: this.data.id, vendorName: this.data.vendorName || 'Default Vendor' }];
      this.selectedVendorId = this.data.id;
    }

    this.loadHistory();
  }

  public loadHistory() {
    if (this.selectedVendorId === 'ALL') {
      if (this.vendors.length === 0) {
        this.allRawHistory = [];
        this.applyFilters();
        return;
      }
      const requests = this.vendors.map(v => this.pricingService.getMaterialHistory(v.id));
      forkJoin(requests).subscribe({
        next: (results: MaterialPriceHistory[][]) => {
          let combined: MaterialPriceHistory[] = [];
          results.forEach((list, idx) => {
            const vName = this.vendors[idx]?.vendorName;
            list.forEach(item => {
              combined.push({ ...item, vendorName: item.vendorName || vName });
            });
          });
          this.allRawHistory = combined;
          this.applyFilters();
        },
        error: () => {
          this.allRawHistory = [];
          this.applyFilters();
        }
      });
    } else {
      const vendorId = Number(this.selectedVendorId);
      const vendorObj = this.vendors.find(v => v.id === vendorId);
      this.pricingService.getMaterialHistory(vendorId).subscribe({
        next: (res: MaterialPriceHistory[]) => {
          this.allRawHistory = res.map(item => ({
            ...item,
            vendorName: item.vendorName || vendorObj?.vendorName
          }));
          this.applyFilters();
        },
        error: () => {
          this.allRawHistory = [];
          this.applyFilters();
        }
      });
    }
  }

  public onVendorChange() {
    this.loadHistory();
  }

  public onFilterChange() {
    this.applyFilters();
  }

  public resetFilters() {
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = new Date().getMonth() + 1;
    this.startDate = '';
    this.endDate = '';
    if (this.data && this.data.selectedVariantId) {
      this.selectedVendorId = this.data.selectedVariantId;
    } else if (this.vendors.length > 0) {
      this.selectedVendorId = this.vendors[0].id;
    }
    this.loadHistory();
  }

  public applyFilters() {
    let filtered = [...this.allRawHistory];

    // Filter by Custom Date Range if specified
    if (this.startDate) {
      const start = new Date(this.startDate + 'T00:00:00');
      filtered = filtered.filter(item => new Date(item.effectiveDate) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate + 'T23:59:59');
      filtered = filtered.filter(item => new Date(item.effectiveDate) <= end);
    }

    // Filter by Year and Month if no custom date specified
    if (!this.startDate && !this.endDate) {
      if (this.selectedYear !== 'ALL') {
        const yearNum = Number(this.selectedYear);
        filtered = filtered.filter(item => new Date(item.effectiveDate).getFullYear() === yearNum);
      }
      if (this.selectedMonth !== 'ALL') {
        const monthNum = Number(this.selectedMonth);
        filtered = filtered.filter(item => (new Date(item.effectiveDate).getMonth() + 1) === monthNum);
      }
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    this.historyData = new MatTableDataSource<MaterialPriceHistory>(filtered);
    this.cdr.detectChanges();
  }

  public downloadExcel() {
    const data = this.historyData.data;
    if (!data || data.length === 0) return;

    const headers = ['Date', 'Vendor', 'LME Rate ($/MT)', 'LME Landed Cost (₹/kg)', 'Direct Landed Cost (₹/kg)', 'Updated By'];
    const rows = data.map(item => [
      this.datePipe.transform(item.effectiveDate, 'dd/MM/yyyy') || '',
      `"${(item.vendorName || '').replace(/"/g, '""')}"`,
      item.type === 0 && item.lmeUsdPerMt != null ? item.lmeUsdPerMt.toFixed(2) : '-',
      item.type === 0 ? item.landedCostInrPerKg.toFixed(2) : '-',
      item.type === 1 ? item.landedCostInrPerKg.toFixed(2) : '-',
      `"${(item.updatedBy || 'System').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (this.groupName || 'Material').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.setAttribute('download', `Price_History_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public downloadPdf() {
    const data = this.historyData.data;
    if (!data || data.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = `Price Stamp Log: ${this.groupName || this.material?.name || 'Material'}`;
    const generatedOn = new Date().toLocaleString();

    let tableRows = data.map(item => {
      const dateStr = this.datePipe.transform(item.effectiveDate, 'dd/MM/yyyy') || '';
      const vendorStr = item.vendorName || '-';
      const lmeRateStr = item.type === 0 && item.lmeUsdPerMt != null ? `$${this.decimalPipe.transform(item.lmeUsdPerMt, '1.2-2')}/MT` : '-';
      const lmeLandedStr = item.type === 0 ? `₹${this.decimalPipe.transform(item.landedCostInrPerKg, '1.2-2')}/kg` : '-';
      const directLandedStr = item.type === 1 ? `₹${this.decimalPipe.transform(item.landedCostInrPerKg, '1.2-2')}/kg` : '-';
      const updatedByStr = item.updatedBy || 'System';

      return `
        <tr>
          <td>${dateStr}</td>
          <td>${vendorStr}</td>
          <td>${lmeRateStr}</td>
          <td>${lmeLandedStr}</td>
          <td>${directLandedStr}</td>
          <td>${updatedByStr}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1f2937; }
          h2 { margin-bottom: 4px; color: #111827; }
          .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
          tr:nth-child(even) { background-color: #f9fafb; }
          @media print {
            body { padding: 0; }
            @page { size: landscape; margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <div class="meta">Generated on: ${generatedOn} | Total records: ${data.length}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>LME Rate</th>
              <th>LME Landed Cost</th>
              <th>Direct Landed Cost</th>
              <th>Updated By</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
