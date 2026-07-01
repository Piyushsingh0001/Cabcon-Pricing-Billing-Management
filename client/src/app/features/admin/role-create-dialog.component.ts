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
import { UserCreateDialogComponent } from './user-create-dialog.component';
import { UserRolesDialogComponent } from './user-roles-dialog.component';
import { RolePermissionsDialogComponent } from './role-permissions-dialog.component';



@Component({
  selector: 'app-role-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
    templateUrl: './role-create-dialog.component.html',
    styleUrls: ['./role-create-dialog.component.scss']
})
export class RoleCreateDialogComponent {
  private fb = inject(FormBuilder);
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);

  public form: FormGroup;
  public loading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<RoleCreateDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  public onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);

    this.pricingService.createRole(this.form.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Role created successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snackBar.open(`Failed: ${err.error?.message || 'Error occurred.'}`, 'Close', { duration: 5000 });
      }
    });
  }
}
