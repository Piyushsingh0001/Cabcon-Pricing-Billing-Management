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
import { PricingService, UserDto, RoleSummary, PermissionDto } from '../../../core/pricing.service';
import { AuthService } from '../../../core/auth.service';
import { AdminComponent } from '../admin.component';
import { UserCreateDialogComponent } from '../user-create-dialog/user-create-dialog.component';
import { RoleCreateDialogComponent } from '../role-create-dialog/role-create-dialog.component';
import { RolePermissionsDialogComponent } from '../role-permissions-dialog/role-permissions-dialog.component';



@Component({
  selector: 'app-user-roles-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
    templateUrl: './user-roles-dialog.component.html',
    styleUrls: ['./user-roles-dialog.component.scss']
})
export class UserRolesDialogComponent {
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);

  public user: UserDto;
  public roles: RoleSummary[] = [];
  public selectedRoleIds = new Set<number>();
  public loading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<UserRolesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: UserDto, roles: RoleSummary[] }
  ) {
    this.user = data.user;
    this.roles = data.roles;
    
    // Map initial user roles to selected IDs
    this.roles.forEach(r => {
      if (this.user.roles.includes(r.name)) {
        this.selectedRoleIds.add(r.id);
      }
    });
  }

  public hasRole(roleName: string): boolean {
    return this.user.roles.includes(roleName);
  }

  public toggleRole(roleId: number) {
    if (this.selectedRoleIds.has(roleId)) {
      this.selectedRoleIds.delete(roleId);
    } else {
      this.selectedRoleIds.add(roleId);
    }
  }

  public onSubmit() {
    this.loading.set(true);
    this.pricingService.assignRolesToUser(this.user.id, Array.from(this.selectedRoleIds)).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('User roles updated successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to update user roles.', 'Close', { duration: 3000 });
      }
    });
  }
}
