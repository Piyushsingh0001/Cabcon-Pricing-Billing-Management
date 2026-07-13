import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { PricingService, CustomerSummary } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [DatePipe],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  public displayedColumns = ['name', 'contactNumber', 'gstNumber', 'address', 'updatedBy', 'actions'];
  public dataSource = new MatTableDataSource<CustomerSummary>([]);
  public canEdit = this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin');
  public isAdding = signal(false);
  public addForm!: FormGroup;

  ngOnInit() {
    this.addForm = this.fb.group({
      name: ['', Validators.required],
      contactNumber: [''],
      gstNumber: [''],
      address: ['']
    });
    
    this.loadCustomers();
  }

  public loadCustomers() {
    this.pricingService.getCustomers().subscribe({
      next: (res) => {
        this.dataSource.data = res ?? [];
      },
      error: () => {
        this.snackBar.open('Failed to load customers.', 'Close', { duration: 3000 });
      }
    });
  }

  public applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  public showAddForm() {
    this.isAdding.set(true);
    this.addForm.reset();
  }

  public cancelAdd() {
    this.isAdding.set(false);
  }

  public submitAdd() {
    if (this.addForm.invalid) return;
    
    this.pricingService.createCustomer(this.addForm.value).subscribe({
      next: () => {
        this.snackBar.open('Customer added successfully', 'Close', { duration: 3000 });
        this.isAdding.set(false);
        this.loadCustomers();
      },
      error: () => {
        this.snackBar.open('Failed to add customer', 'Close', { duration: 3000 });
      }
    });
  }

  public deleteCustomer(customer: CustomerSummary) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Customer',
        message: `Are you sure you want to delete customer ${customer.name}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        theme: 'red'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.pricingService.deleteCustomer(customer.id).subscribe({
          next: () => {
            this.snackBar.open('Customer removed successfully.', 'Close', { duration: 3000 });
            this.loadCustomers();
          },
          error: () => {
            this.snackBar.open('Failed to remove customer.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
