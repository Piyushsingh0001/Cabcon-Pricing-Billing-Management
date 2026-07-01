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
import { RoleCreateDialogComponent } from './role-create-dialog.component';



@Component({
  selector: 'app-role-permissions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
    templateUrl: './role-permissions-dialog.component.html',
    styleUrls: ['./role-permissions-dialog.component.scss']
})
export class RolePermissionsDialogComponent {
  private pricingService = inject(PricingService);
  private snackBar = inject(MatSnackBar);

  public role: RoleSummary;
  public allPermissions: PermissionDto[] = [];
  public selectedPermissionIds = new Set<number>();
  public assignedCodes = new Set<string>();
  public loading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<RolePermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      role: RoleSummary,
      allPermissions: PermissionDto[],
      assignedPermissionCodes: string[]
    }
  ) {
    this.role = data.role;
    this.allPermissions = data.allPermissions;
    this.assignedCodes = new Set<string>(data.assignedPermissionCodes);
    
    // Map code matches to IDs
    this.allPermissions.forEach(p => {
      if (this.assignedCodes.has(p.code)) {
        this.selectedPermissionIds.add(p.id);
      }
    });
  }

  public hasPermission(code: string): boolean {
    return this.assignedCodes.has(code);
  }

  public togglePermission(id: number, code: string) {
    if (this.selectedPermissionIds.has(id)) {
      this.selectedPermissionIds.delete(id);
      this.assignedCodes.delete(code);
    } else {
      this.selectedPermissionIds.add(id);
      this.assignedCodes.add(code);
    }
  }

  public onSubmit() {
    this.loading.set(true);
    this.pricingService.assignPermissionsToRole(this.role.id, Array.from(this.selectedPermissionIds)).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Role permissions updated successfully.', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to update role permissions.', 'Close', { duration: 3000 });
      }
    });
  }
}
