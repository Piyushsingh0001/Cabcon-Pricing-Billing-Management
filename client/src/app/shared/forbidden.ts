import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="forbidden-container animated-view">
      <mat-icon color="warn">block</mat-icon>
      <h1>403 - Access Denied</h1>
      <p>You do not have permission to view this resource.</p>
      <button mat-flat-button class="btn-primary" routerLink="/dashboard">Return to Dashboard</button>
    </div>
  `,
  styles: [`
    .forbidden-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 80vh;
      text-align: center;
    }
    mat-icon {
      font-size: 96px;
      width: 96px;
      height: 96px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 32px;
      margin-bottom: 12px;
    }
    p {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }
  `]
})
export class ForbiddenComponent {}
