import { ChangeDetectorRef, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PricingService, UserDto, RoleSummary, PermissionDto } from '../../core/pricing.service';
import { AuthService } from '../../core/auth.service';
import { AdminComponent } from './admin.component';
import { UserRolesDialogComponent } from './user-roles-dialog.component';
import { RoleCreateDialogComponent } from './role-create-dialog.component';
import { RolePermissionsDialogComponent } from './role-permissions-dialog.component';



@Component({
  selector: 'app-user-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
    templateUrl: './user-create-dialog.component.html',
    styleUrls: ['./user-create-dialog.component.scss']
})
export class UserCreateDialogComponent {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);
  
  public form: FormGroup;
  public loading = signal(false);
  public roles: RoleSummary[] = [];

  constructor(
    public dialogRef: MatDialogRef<UserCreateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roles: RoleSummary[] }
  ) {
    this.roles = data.roles;
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      password: ['', Validators.required],
      roleName: ['User', Validators.required]
    });
  }

  public onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);

    const payload = {
      ...this.form.value,
      clientVerifyUrlBase: 'https://localhost:4200/confirm-email'
    };

    this.pricingService.registerUser(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('User created successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snackBar.open(`Failed: ${err.error?.message || 'Error occurred.'}`, 'Close', { duration: 5000 });
      }
    });
  }
}
