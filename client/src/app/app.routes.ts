import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, permissionGuard('Quotation.Generate')]
  },
  {
    path: 'quotations',
    loadComponent: () => import('./features/dashboard/quotations-list/quotations-list.component').then(m => m.QuotationsListComponent),
    canActivate: [authGuard, permissionGuard('Quotation.View')]
  },
  {
    path: 'pending-approvals',
    loadComponent: () => import('./features/dashboard/quotations-list/quotations-list.component').then(m => m.QuotationsListComponent),
    canActivate: [authGuard, permissionGuard('Quotation.View')],
    data: { pendingOnly: true }
  },
  {
    path: 'draft-quotations',
    loadComponent: () => import('./features/dashboard/quotations-list/quotations-list.component').then(m => m.QuotationsListComponent),
    canActivate: [authGuard, permissionGuard('Quotation.View')],
    data: { draftOnly: true }
  },
  {
    path: 'tracking',
    loadComponent: () => import('./features/dashboard/tracking-list/tracking-list.component').then(m => m.TrackingListComponent),
    canActivate: [authGuard, permissionGuard('Quotation.View')]
  },
  {
    path: 'customers',
    loadComponent: () => import('./features/dashboard/customers/customers.component').then(m => m.CustomersComponent),
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
    redirectTo: 'materials',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'materials'
  }
];
