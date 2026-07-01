import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';




@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
    templateUrl: './forbidden.component.html',
    styleUrls: ['./forbidden.component.scss']
})
export class ForbiddenComponent {}
