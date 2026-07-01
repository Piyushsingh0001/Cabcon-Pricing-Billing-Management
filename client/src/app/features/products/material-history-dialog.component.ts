import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { PricingService, Material, MaterialPriceHistory } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';
import { MaterialsComponent } from './materials.component';
import { MaterialCreateEditDialogComponent } from './material-create-edit-dialog.component';



@Component({
  selector: 'app-material-history',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ],
    templateUrl: './material-history-dialog.component.html',
    styleUrls: ['./material-history-dialog.component.scss']
})
export class MaterialHistoryDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  
  public historyData = new MatTableDataSource<MaterialPriceHistory>();
  public columns = ['effectiveDate', 'rateDetails', 'landedCost'];
  private cdr = inject(ChangeDetectorRef);
  constructor(
    @Inject(MAT_DIALOG_DATA) public material: Material
  ) {}

ngOnInit() {
  this.pricingService.getMaterialHistory(this.material.id).subscribe({
    next: (res: MaterialPriceHistory[]) => {


      this.historyData = new MatTableDataSource<MaterialPriceHistory>(res);

      this.cdr.detectChanges();

    },
    error: () => {
      this.historyData = new MatTableDataSource<MaterialPriceHistory>([]);
      this.cdr.detectChanges();
    }
  });
}
}
