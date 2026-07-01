import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, permissionGuard('Quotation.Generate')]
  },
  {
    path: 'quotations',
    loadComponent: () => import('./features/dashboard/quotations-list.component').then(m => m.QuotationsListComponent),
    canActivate: [authGuard, permissionGuard('Quotation.View')]
  },
  {
    path: 'materials',
    loadComponent: () => import('./features/products/materials.component').then(m => m.MaterialsComponent),
    canActivate: [authGuard, permissionGuard('Pricing.View')]
  },
  {
    path: 'skus',
    loadComponent: () => import('./features/products/skus.component').then(m => m.SkusComponent),
    canActivate: [authGuard, permissionGuard('Sku.View')]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, permissionGuard('Users.View')]
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/forbidden.component').then(m => m.ForbiddenComponent)
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
