import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from './core/auth.service';
import { PricingService } from './core/pricing.service';




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private authService = inject(AuthService);
  private pricingService = inject(PricingService);

  public isAuthenticated = this.authService.isAuthenticated;
  public currentUser = this.authService.currentUser;
  
  public pendingApprovalsCount = 0;

  constructor() {
    // Check pending count periodically or once if super admin
    setInterval(() => this.checkPendingApprovals(), 30000); // Check every 30s
    setTimeout(() => this.checkPendingApprovals(), 1000);
    
    this.pricingService.pendingApprovalUpdated.subscribe(() => {
      this.checkPendingApprovals();
    });
  }

  private checkPendingApprovals() {
    if (this.isAuthenticated() && (this.authService.hasRole('Super Admin') || this.authService.hasRole('Admin'))) {
      this.pricingService.getPendingApprovalsCount().subscribe({
        next: (count) => this.pendingApprovalsCount = count,
        error: () => {} // ignore
      });
    }
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
get groupedPermissions() {
  const user = this.currentUser();

  if (!user?.permissions?.length) {
    return [];
  }

  const groups: { [key: string]: string[] } = {};

  user.permissions.forEach(permission => {
    const [module, action] = permission.split('.');

    if (!groups[module]) {
      groups[module] = [];
    }

    groups[module].push(action);
  });

  return Object.keys(groups).map(module => ({
    module,
    actions: groups[module]
  }));
}
getModuleIcon(module: string): string {
  switch (module) {
    case 'Users':
      return 'group';

    case 'Roles':
      return 'security';

    case 'Pricing':
      return 'payments';

    case 'Sku':
      return 'inventory_2';

    case 'Quotation':
      return 'description';

    case 'Settings':
      return 'settings';

    default:
      return 'check_circle';
  }
}
  public logout() {
    this.authService.logout().subscribe();
  }
  
}
