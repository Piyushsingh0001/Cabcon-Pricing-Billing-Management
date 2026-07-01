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

// --- MAIN ADMIN COMPONENT ---
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
  template: `
    <div class="admin-container animated-view">
      <div class="header-section">
        <div>
          <h1>Administration Panel</h1>
          <p class="subtitle">Manage user accounts, roles, and security policies</p>
        </div>
      </div>

      <mat-tab-group class="glass-card admin-tabs">
        <!-- USER MANAGEMENT TAB -->
        <mat-tab label="Users">
          <div class="tab-content">
            <div class="tab-actions">
              <h3>System Users</h3>
              <button mat-flat-button class="btn-primary" (click)="createUser()" *ngIf="canCreateUser()">
                <mat-icon>person_add</mat-icon> Create User
              </button>
            </div>

            <table mat-table [dataSource]="users">
              <!-- Username -->
              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef>Username</th>
                <td mat-cell *matCellDef="let element" class="bold-cell">{{element.userName}}</td>
              </ng-container>

              <!-- Full Name -->
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>Full Name</th>
                <td mat-cell *matCellDef="let element">{{element.fullName}}</td>
              </ng-container>

              <!-- Email -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let element">{{element.email}}</td>
              </ng-container>

              <!-- Roles -->
              <ng-container matColumnDef="roles">
                <th mat-header-cell *matHeaderCellDef>Roles</th>
                <td mat-cell *matCellDef="let element">
                  <span class="role-badge" *ngFor="let role of element.roles">{{role}}</span>
                </td>
              </ng-container>

              <!-- Last Login -->
              <ng-container matColumnDef="lastLogin">
                <th mat-header-cell *matHeaderCellDef>Last Login</th>
                <td mat-cell *matCellDef="let element">
                  {{element.lastLoginDate ? (element.lastLoginDate | date:'short') : 'Never'}}
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let element">
                  <button mat-stroked-button color="primary" (click)="manageUserRoles(element)" *ngIf="canManageRoles()">
                    <mat-icon>security</mat-icon> Assign Roles
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: userColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- ROLE & PERMISSION MANAGEMENT TAB -->
        <mat-tab label="Roles & Permissions">
          <div class="tab-content">
            <div class="tab-actions">
              <h3>Security Roles</h3>
              <button mat-flat-button class="btn-primary" (click)="createRole()" *ngIf="canCreateRole()">
                <mat-icon>add</mat-icon> Add Role
              </button>
            </div>

            <table mat-table [dataSource]="roles">
              <!-- Name -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Role Name</th>
                <td mat-cell *matCellDef="let element" class="bold-cell">{{element.name}}</td>
              </ng-container>

              <!-- Description -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let element">{{element.description || 'No description provided.'}}</td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let element">
                  <button mat-stroked-button color="accent" (click)="manageRolePermissions(element)" *ngIf="canManagePermissions()">
                    <mat-icon>admin_panel_settings</mat-icon> Edit Permissions
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="roleColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: roleColumns;"></tr>
            </table>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .admin-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }
    .subtitle {
      color: var(--text-secondary);
      margin: 0;
    }
    .admin-tabs {
      background: var(--bg-card);
      border-radius: 12px;
      overflow: hidden;
    }
    .tab-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .tab-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tab-actions h3 {
      margin: 0;
      font-weight: 600;
    }
    .bold-cell {
      font-weight: 600;
      color: var(--text-primary);
    }
    .role-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 2px 8px;
      border-radius: 12px;
      margin-right: 4px;
    }
    ::ng-deep .mat-mdc-tab-group-actions-container {
      border-bottom: 1px solid var(--border-glass) !important;
    }
  `]
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
      error: () => this.snackBar.open('Failed to load roles.', 'Close', { duration: 3000 })
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
    this.pricingService.getQuotation(role.id).subscribe({ // Wait, getRole endpoint? 
      // Roles getById endpoint: GET /api/roles/{id:int}
      // Let's call roles endpoint directly or write pricingService wrapper
    });
    
    // We can call getRole Details via custom request
    const http = inject(this.pricingService['http'].constructor as any) as any;
    http.get(`https://localhost:55027/api/roles/${role.id}`).subscribe({
      next: (roleDetail: any) => {
        this.pricingService.getPermissions().subscribe(allPerms => {
          const dialogRef = this.dialog.open(RolePermissionsDialogComponent, {
            width: '550px',
            data: {
              role,
              allPermissions: allPerms,
              assignedPermissionCodes: roleDetail.permissions.map((p: any) => p.code)
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

// --- DIALOG: CREATE USER ---
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
  template: `
    <h2 mat-dialog-title>Create New User</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="admin-form">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email Address</mat-label>
          <input matInput formControlName="email" type="email">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="userName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput formControlName="password" type="password">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Primary Role</mat-label>
          <mat-select formControlName="roleName">
            <mat-option *ngFor="let r of roles" [value]="r.name">{{r.name}}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()" (click)="onSubmit()">Save User</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .admin-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }
  `]
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

// --- DIALOG: ASSIGN USER ROLES ---
@Component({
  selector: 'app-user-roles-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Assign Roles: {{user.fullName}}</h2>
    <mat-dialog-content>
      <div class="checkbox-list">
        <mat-checkbox *ngFor="let role of roles" 
                      [checked]="hasRole(role.name)" 
                      (change)="toggleRole(role.id)">
          {{role.name}}
        </mat-checkbox>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="loading()" (click)="onSubmit()">Save Roles</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .checkbox-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }
  `]
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

// --- DIALOG: CREATE ROLE ---
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
  template: `
    <h2 mat-dialog-title>Add New Security Role</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="admin-form">
        <mat-form-field appearance="outline">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. SalesHead">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()" (click)="onSubmit()">Save Role</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .admin-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }
  `]
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

// --- DIALOG: ASSIGN ROLE PERMISSIONS ---
@Component({
  selector: 'app-role-permissions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Edit Permissions: {{role.name}}</h2>
    <mat-dialog-content class="dialog-content">
      <div class="checkbox-grid">
        <div *ngFor="let perm of allPermissions" class="permission-checkbox-row">
          <mat-checkbox [checked]="hasPermission(perm.code)" (change)="togglePermission(perm.id, perm.code)">
            <div class="perm-info">
              <span class="code">{{perm.code}}</span>
              <span class="name">{{perm.name}} ({{perm.module}})</span>
            </div>
          </mat-checkbox>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button class="btn-primary" [disabled]="loading()" (click)="onSubmit()">Save Permissions</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      max-height: 400px;
      overflow-y: auto;
    }
    .checkbox-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;
    }
    .permission-checkbox-row {
      border-bottom: 1px solid var(--border-glass);
      padding-bottom: 8px;
    }
    .perm-info {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }
    .perm-info .code {
      font-weight: 600;
      color: var(--text-primary);
    }
    .perm-info .name {
      font-size: 11px;
      color: var(--text-secondary);
    }
  `]
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
