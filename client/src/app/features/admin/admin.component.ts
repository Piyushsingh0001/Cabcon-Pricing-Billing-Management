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
import { UserCreateDialogComponent } from './user-create-dialog/user-create-dialog.component';
import { UserRolesDialogComponent } from './user-roles-dialog/user-roles-dialog.component';
import { RoleCreateDialogComponent } from './role-create-dialog/role-create-dialog.component';
import { RolePermissionsDialogComponent } from './role-permissions-dialog/role-permissions-dialog.component';



@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule
  ],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  public users: UserDto[] = [];
  public roles: RoleSummary[] = [];

  public userColumns = ['username', 'fullName', 'email', 'roles', 'lastLogin', 'actions'];
  public roleColumns = ['name', 'description', 'actions'];

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  public canCreateUser(): boolean {
    return this.authService.hasPermission('Users.Create');
  }

  public canManageRoles(): boolean {
    return this.authService.hasPermission('Users.ManageRoles');
  }

  public canCreateRole(): boolean {
    return this.authService.hasPermission('Roles.Create');
  }

  public canManagePermissions(): boolean {
    return this.authService.hasPermission('Roles.ManagePermissions');
  }

  private loadUsers() {
    this.pricingService.getUsers().subscribe({
      next: (res) => {
        this.users = res;
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('Failed to load users.', 'Close', { duration: 3000 })
    });
  }

  private loadRoles() {
    this.pricingService.getRoles().subscribe({
      next: (res) => {
        this.roles = res;
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('Manager does not have right to change role .', 'Close', { duration: 3000 })
    });
  }

  public createUser() {
    const dialogRef = this.dialog.open(UserCreateDialogComponent, {
      width: '500px',
      data: { roles: this.roles }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loadUsers();
      }
    });
  }

  public manageUserRoles(user: UserDto) {
    const dialogRef = this.dialog.open(UserRolesDialogComponent, {
      width: '450px',
      data: { user, roles: this.roles }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loadUsers();
      }
    });
  }

  public createRole() {
    const dialogRef = this.dialog.open(RoleCreateDialogComponent, {
      width: '450px'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.loadRoles();
      }
    });
  }

  public manageRolePermissions(role: RoleSummary) {
    // Load full role detail to get checked permissions
    this.pricingService.getRole(role.id).subscribe({
      next: (roleDetail: any) => {
        this.pricingService.getPermissions().subscribe(allPerms => {
          const dialogRef = this.dialog.open(RolePermissionsDialogComponent, {
            width: '550px',
            data: {
              role,
              allPermissions: allPerms,
              assignedPermissionCodes: (roleDetail.permissionIds || [])
                .map((id: number) => allPerms.find(p => p.id === id)?.code)
                .filter(Boolean)
            }
          });
          this.cdr.detectChanges();
          dialogRef.afterClosed().subscribe(res => {
            if (res) {
              this.loadRoles();
            }
          });
        });
      },
      error: () => this.snackBar.open('Failed to load role permissions.', 'Close', { duration: 3000 })
    });
  }
}
