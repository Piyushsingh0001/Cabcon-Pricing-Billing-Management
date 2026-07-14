import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BaseChartDirective } from 'ng2-charts';
import { PricingService, Material, MaterialPriceHistory } from '../../../core/pricing.service';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-material-trend-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
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

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ` ₹${Number(context.raw).toFixed(2)}/kg`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `₹${value}`
        }
      }
    }
  };

  constructor(
    public dialogRef: MatDialogRef<MaterialTrendDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public material: Material
  ) {}

  ngOnInit(): void {
    this.pricingService.getMaterialHistory(this.material.id, this.material.type).subscribe({
      next: (history: MaterialPriceHistory[]) => {
        if (!history || history.length === 0) {
          this.snackBar.open('No history data available for this material.', 'Close', { duration: 3000 });
          this.dialogRef.close();
          return;
        }

        // Sort by date ascending
        const sorted = history.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
        
        this.lineChartData = {
          labels: sorted.map(h => new Date(h.effectiveDate).toLocaleDateString()),
          datasets: [
            {
              data: sorted.map(h => h.landedCostInrPerKg),
              label: 'Landed Cost (₹/kg)',
              fill: true,
              tension: 0.4,
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.2)'
            }
          ]
        };

        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load history data.', 'Close', { duration: 3000 });
        this.dialogRef.close();
      }
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }
}
