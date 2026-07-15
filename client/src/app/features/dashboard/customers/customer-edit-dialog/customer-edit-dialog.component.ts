import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PricingService, CustomerSummary } from '../../../../core/pricing.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-customer-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-edit-dialog.component.html',
  styleUrls: ['./customer-edit-dialog.component.scss']
})
export class CustomerEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);

  public form!: FormGroup;
  public loading = false;

  constructor(
    public dialogRef: MatDialogRef<CustomerEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomerSummary | null
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: [this.data?.name || '', Validators.required],
      contactNumber: [this.data?.contactNumber || ''],
      gstNumber: [this.data?.gstNumber || ''],
      address: [this.data?.address || '']
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    if (this.data && this.data.id) {
      this.pricingService.updateCustomer(this.data.id, this.form.value).subscribe({
        next: () => {
          this.snackBar.open('Customer updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to update customer', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.pricingService.createCustomer(this.form.value).subscribe({
        next: () => {
          this.snackBar.open('Customer added successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to add customer', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
