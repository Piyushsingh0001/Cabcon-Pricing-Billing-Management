import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './core/auth.service';
import { PricingService } from './core/pricing.service';
import { ChangePasswordDialogComponent } from './features/auth/change-password-dialog/change-password-dialog.component';

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
    MatBadgeModule,
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public authService = inject(AuthService);
  private pricingService = inject(PricingService);
  private dialog = inject(MatDialog);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  public isAuthenticated = this.authService.isAuthenticated;
  public currentUser = this.authService.currentUser;
  public isMobile = false;
  public isAuthRoute = signal<boolean>(false);
  
  constructor() {
    this.breakpointObserver.observe(['(max-width: 991px)']).subscribe(result => {
      this.isMobile = result.matches;
    });

    this.checkAuthRoute(this.router.url || (typeof window !== 'undefined' ? window.location.pathname : ''));

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      const url = event.urlAfterRedirects || event.url;
      this.checkAuthRoute(url);
    });
  }

  private checkAuthRoute(url: string) {
    if (!url) return;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const isAuth = cleanUrl === '/login' || cleanUrl === '/reset-password';
    this.isAuthRoute.set(isAuth);
  }

  public closeOnMobile(sidenav: any) {
    if (this.isMobile && sidenav) {
      sidenav.close();
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
  
  public openChangePasswordDialog() {
    this.dialog.open(ChangePasswordDialogComponent, {
      panelClass: 'dialog-tier-sm',
      disableClose: true
    });
  }

  public logout() {
    this.authService.logout().subscribe();
  }
  
  public onMaterialPricesClick() {
    this.pricingService.refreshMaterials.next();
  }

  public onSkusClick() {
    this.pricingService.refreshSkus.next();
  }
}
