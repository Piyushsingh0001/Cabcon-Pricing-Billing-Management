import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BaseChartDirective } from 'ng2-charts';
import { PricingService, MaterialPriceHistory } from '../../../core/pricing.service';
import { ChartConfiguration, ChartOptions } from 'chart.js';

export interface TrendDialogData {
  id: number;
  name: string;
  type?: number;
}

@Component({
  selector: 'app-material-trend-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    BaseChartDirective
  ],
  templateUrl: './material-trend-dialog.component.html',
  styleUrls: ['./material-trend-dialog.component.scss']
})
export class MaterialTrendDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  public loading = signal(true);
  public hasData = signal(false);

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 14,
          font: {
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            size: 12,
            weight: 600
          },
          color: '#334155'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            if (context.raw === null || context.raw === undefined) return '';
            return ` ${context.dataset.label}: ₹${Number(context.raw).toFixed(2)}/kg`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: '#64748b'
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: '#f1f5f9'
        },
        ticks: {
          callback: (value) => `₹${value}`,
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: '#64748b'
        }
      }
    }
  };

  private vendorColors = [
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }, // Emerald Green
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }, // Violet
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }, // Amber
    { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }, // Rose / Pink
    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },  // Cyan
    { border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' }, // Orange
    { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' }, // Indigo
    { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' }  // Teal
  ];

  constructor(
    public dialogRef: MatDialogRef<MaterialTrendDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrendDialogData
  ) {}

  ngOnInit(): void {
    // Fetch all history for this metal (both LME and Direct vendor records)
    this.pricingService.getMaterialHistory(this.data.id).subscribe({
      next: (history: MaterialPriceHistory[]) => {
        if (!history || history.length === 0) {
          this.hasData.set(false);
          this.loading.set(false);
          return;
        }

        // Collect all distinct dates sorted ascending
        const allDateKeys = Array.from(
          new Set(history.map(h => new Date(h.effectiveDate).toISOString().substring(0, 10)))
        ).sort();

        if (allDateKeys.length === 0) {
          this.hasData.set(false);
          this.loading.set(false);
          return;
        }

        const labels = allDateKeys.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        });

        const datasets: ChartConfiguration<'line'>['data']['datasets'] = [];

        // 1. LME Curve (distinct Royal Blue color)
        const lmeRecords = history.filter(h => h.type === 0);
        if (lmeRecords.length > 0) {
          const lmeMap = new Map<string, number>();
          lmeRecords.forEach(h => {
            const d = new Date(h.effectiveDate).toISOString().substring(0, 10);
            lmeMap.set(d, h.landedCostInrPerKg);
          });

          const lmeData = allDateKeys.map(d => lmeMap.has(d) ? lmeMap.get(d)! : null);

          datasets.push({
            data: lmeData,
            label: 'LME-linked',
            borderColor: '#2563eb', // Royal Blue
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: false,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#2563eb',
            borderWidth: 2.5
          });
        }

        // 2. Direct Curves per Vendor (each vendor gets a separate curve with unique color)
        const directRecords = history.filter(h => h.type === 1);
        if (directRecords.length > 0) {
          const vendorNames = Array.from(
            new Set(directRecords.map(h => h.vendorName || 'Direct Price'))
          ).sort();

          vendorNames.forEach((vName, idx) => {
            const vMap = new Map<string, number>();
            directRecords
              .filter(h => (h.vendorName || 'Direct Price') === vName)
              .forEach(h => {
                const d = new Date(h.effectiveDate).toISOString().substring(0, 10);
                vMap.set(d, h.landedCostInrPerKg);
              });

            const vData = allDateKeys.map(d => vMap.has(d) ? vMap.get(d)! : null);
            const color = this.vendorColors[idx % this.vendorColors.length];

            datasets.push({
              data: vData,
              label: `Direct — ${vName}`,
              borderColor: color.border,
              backgroundColor: color.bg,
              fill: false,
              tension: 0.3,
              spanGaps: true,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: color.border,
              borderWidth: 2
            });
          });
        }

        this.lineChartData = {
          labels: labels,
          datasets: datasets
        };

        this.hasData.set(datasets.length > 0);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load price trend data.', 'Close', { duration: 3000 });
        this.loading.set(false);
        this.hasData.set(false);
      }
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
