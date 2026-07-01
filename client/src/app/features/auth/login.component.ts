import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/auth.service';
import { PricingService } from '../../core/pricing.service';




@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private pricingService = inject(PricingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  public hidePassword = signal(true);
  public isLoading = signal(false);
  public errorMessage = signal<string | null>(null);
  public currentView = signal<'signin' | 'signup' | 'forgot'>('signin');

  // Form declarations
  public loginForm!: FormGroup;
  public signUpForm!: FormGroup;
  public forgotForm!: FormGroup;

  ngOnInit() {
    this.initForms();
    this.checkRememberedUser();
  }

  private initForms() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.signUpForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private checkRememberedUser() {
    const remembered = localStorage.getItem('cabcon_remembered_username');
    if (remembered) {
      this.loginForm.patchValue({
        username: remembered,
        rememberMe: true
      });
    }
  }

  public setView(view: 'signin' | 'signup' | 'forgot') {
    this.currentView.set(view);
    this.errorMessage.set(null);
  }

  public togglePassword() {
    this.hidePassword.update(prev => !prev);
  }

  public onLoginSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { username, password, rememberMe } = this.loginForm.value;

    this.authService.login(username!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
        if (rememberMe) {
          localStorage.setItem('cabcon_remembered_username', username!);
        } else {
          localStorage.removeItem('cabcon_remembered_username');
        }
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Authentication failed. Please check credentials.');
      }
    });
  }

  public onSignUpSubmit() {
    if (this.signUpForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.signUpForm.value,
      roleName: 'User',
      clientVerifyUrlBase: 'http://localhost:4200/confirm-email'
    };

    this.pricingService.registerUser(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Registration successful! Please log in.', 'Close', { duration: 5000 });
        this.setView('signin');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create account.');
      }
    });
  }

  public onForgotSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      email: this.forgotForm.value.email,
      clientResetUrlBase: 'http://localhost:4200/reset-password'
    };

    // Call public forgot-password API: POST /api/auth/forgot-password
    const http = inject(this.pricingService['http'].constructor as any) as any;
    http.post('https://localhost:55027/api/auth/forgot-password', payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.snackBar.open(res.message || 'Password reset link sent to your email.', 'Close', { duration: 5000 });
        this.setView('signin');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Unable to request password recovery.');
      }
    });
  }
}
