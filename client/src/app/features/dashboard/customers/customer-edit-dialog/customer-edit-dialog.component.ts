import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
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
    let parsedAddresses: string[] = [];
    let defaultIndex = 0;
    if (this.data?.address) {
      try {
        const parsed = JSON.parse(this.data.address);
        if (Array.isArray(parsed)) {
          parsedAddresses = parsed;
        } else if (parsed && Array.isArray(parsed.addresses)) {
          parsedAddresses = parsed.addresses;
          defaultIndex = parsed.defaultIndex || 0;
        } else {
          parsedAddresses = [this.data.address];
        }
      } catch {
        parsedAddresses = [this.data.address];
      }
    }
    
    if (parsedAddresses.length === 0) {
      parsedAddresses.push('');
    }

    this.form = this.fb.group({
      name: [this.data?.name || '', Validators.required],
      contactNumber: [this.data?.contactNumber || ''],
      gstNumber: [this.data?.gstNumber || ''],
      addresses: this.fb.array(parsedAddresses.map(addr => this.fb.control(addr))),
      defaultIndex: [defaultIndex]
    });
  }

  get addressesArray(): FormArray {
    return this.form.get('addresses') as FormArray;
  }

  addAddress() {
    this.addressesArray.push(this.fb.control(''));
  }

  setDefaultAddress(index: number) {
    this.form.get('defaultIndex')?.setValue(index);
  }

  removeAddress(index: number) {
    this.addressesArray.removeAt(index);
    if (this.addressesArray.length === 0) {
      this.addAddress();
    } else if (this.form.get('defaultIndex')?.value >= this.addressesArray.length) {
      this.form.get('defaultIndex')?.setValue(0);
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    const formValue = { ...this.form.value };
    const addresses = formValue.addresses;
    
    let validAddresses: string[] = [];
    let newDefaultIndex = 0;
    
    for (let i = 0; i < addresses.length; i++) {
        if ((addresses[i] || '').trim() !== '') {
            validAddresses.push(addresses[i]);
            if (i === formValue.defaultIndex) {
                newDefaultIndex = validAddresses.length - 1;
            }
        }
    }
    
    if (validAddresses.length > 0) {
        formValue.address = JSON.stringify({ addresses: validAddresses, defaultIndex: newDefaultIndex });
    } else {
        formValue.address = null;
    }
    delete formValue.addresses;
    delete formValue.defaultIndex;

    if (this.data && this.data.id) {
      this.pricingService.updateCustomer(this.data.id, formValue).subscribe({
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
      this.pricingService.createCustomer(formValue).subscribe({
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
