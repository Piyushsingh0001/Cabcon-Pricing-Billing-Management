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
  template: `
    <div class="login-wrapper">
      <div class="background-decor">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
      
      <mat-card class="glass-card login-card animated-view">
        <mat-card-header>
          <div class="logo-area">
            <img src="images/logo.jpg" alt="Cabcon Logo" class="cabcon-logo">
          </div>
          <mat-card-subtitle>Enterprise Pricing & Billing Portal</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- SIGN IN VIEW -->
          <ng-container *ngIf="currentView() === 'signin'">
            <form [formGroup]="loginForm" (ngSubmit)="onLoginSubmit()">
              <mat-form-field appearance="outline">
                <mat-label>Username or Email</mat-label>
                <input matInput formControlName="username" type="text" placeholder="e.g. admin">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error *ngIf="loginForm.get('username')?.hasError('required')">Username is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" [type]="hidePassword() ? 'password' : 'text'">
                <mat-icon matPrefix>lock</mat-icon>
                <button type="button" mat-icon-button matSuffix (click)="togglePassword()" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hidePassword()">
                  <mat-icon>{{hidePassword() ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
              </mat-form-field>

              <div class="signin-options">
                <mat-checkbox formControlName="rememberMe">Remember me</mat-checkbox>
                <a class="nav-link" (click)="setView('forgot')">Forgot password?</a>
              </div>

              <div class="error-banner" *ngIf="errorMessage()">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>

              <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="loginForm.invalid || isLoading()">
                <span *ngIf="!isLoading()">Sign In</span>
                <mat-spinner diameter="24" *ngIf="isLoading()"></mat-spinner>
              </button>

              <div class="view-footer">
                <span>Don't have an account? </span>
                <a class="nav-link bold" (click)="setView('signup')">Sign Up / Create Account</a>
              </div>
            </form>
          </ng-container>

          <!-- SIGN UP / CREATE USER VIEW -->
          <ng-container *ngIf="currentView() === 'signup'">
            <form [formGroup]="signUpForm" (ngSubmit)="onSignUpSubmit()">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName" placeholder="e.g. John Doe">
                <mat-icon matPrefix>badge</mat-icon>
                <mat-error *ngIf="signUpForm.get('fullName')?.hasError('required')">Full Name is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email Address</mat-label>
                <input matInput formControlName="email" type="email" placeholder="e.g. john@example.com">
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="signUpForm.get('email')?.hasError('required')">Email is required</mat-error>
                <mat-error *ngIf="signUpForm.get('email')?.hasError('email')">Invalid email address</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Username</mat-label>
                <input matInput formControlName="userName" placeholder="e.g. johndoe">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error *ngIf="signUpForm.get('userName')?.hasError('required')">Username is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput formControlName="password" type="password">
                <mat-icon matPrefix>lock</mat-icon>
                <mat-error *ngIf="signUpForm.get('password')?.hasError('required')">Password is required</mat-error>
                <mat-error *ngIf="signUpForm.get('password')?.hasError('minlength')">Password must be at least 6 characters</mat-error>
              </mat-form-field>

              <div class="error-banner" *ngIf="errorMessage()">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>

              <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="signUpForm.invalid || isLoading()">
                <span *ngIf="!isLoading()">Create Account</span>
                <mat-spinner diameter="24" *ngIf="isLoading()"></mat-spinner>
              </button>

              <div class="view-footer">
                <a class="nav-link" (click)="setView('signin')">
                  <mat-icon>arrow_back</mat-icon> Back to Sign In
                </a>
              </div>
            </form>
          </ng-container>

          <!-- FORGOT PASSWORD VIEW -->
          <ng-container *ngIf="currentView() === 'forgot'">
            <form [formGroup]="forgotForm" (ngSubmit)="onForgotSubmit()">
              <p class="instruction-text">
                Enter your registered email address below. We'll send you instructions to reset your password.
              </p>

              <mat-form-field appearance="outline">
                <mat-label>Email Address</mat-label>
                <input matInput formControlName="email" type="email" placeholder="e.g. yourname@example.com">
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="forgotForm.get('email')?.hasError('required')">Email is required</mat-error>
                <mat-error *ngIf="forgotForm.get('email')?.hasError('email')">Invalid email address</mat-error>
              </mat-form-field>

              <div class="error-banner" *ngIf="errorMessage()">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>

              <button mat-flat-button class="btn-primary submit-btn" type="submit" [disabled]="forgotForm.invalid || isLoading()">
                <span *ngIf="!isLoading()">Send Reset Link</span>
                <mat-spinner diameter="24" *ngIf="isLoading()"></mat-spinner>
              </button>

              <div class="view-footer">
                <a class="nav-link" (click)="setView('signin')">
                  <mat-icon>arrow_back</mat-icon> Back to Sign In
                </a>
              </div>
            </form>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `,
 styles: [`

.login-wrapper {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  background:
    linear-gradient(
      135deg,
      #101d32 0%,
      #16263f 45%,
      #f5f7fa 45%,
      #f5f7fa 100%
    );
}


/* Background decoration */

.background-decor {
  position:absolute;
  inset:0;
}


.circle {
  position:absolute;
  border-radius:50%;
  filter:blur(80px);
}


.circle-1 {

  width:350px;
  height:350px;

  left:10%;
  top:20%;

  background:rgba(214,40,40,.25);

}


.circle-2 {

  width:400px;
  height:400px;

  right:10%;
  bottom:15%;

  background:rgba(16,29,50,.25);

}




/* Login card */

.login-card {

  width:100%;
  max-width:430px;

  padding:35px 30px;

  z-index:2;

  border-radius:20px;

  background:white;

  box-shadow:
  0 25px 60px rgba(0,0,0,.20);

}




/* Logo */

.logo-area {

  display:flex;

  justify-content:center;

  margin-bottom:20px;

}


.cabcon-logo {

  width:180px;

  height:auto;

}




mat-card-header {

 display:flex;

 flex-direction:column;

 align-items:center;

 text-align:center;

 margin-bottom:25px;

}



mat-card-subtitle {

 color:#64748b !important;

 font-size:15px;

}




/* Form */

form {

 display:flex;

 flex-direction:column;

 gap:16px;

}



mat-form-field {

 width:100%;

}




/* Remember / forgot */

.signin-options {

 display:flex;

 justify-content:space-between;

 align-items:center;

 font-size:13px;

}




/* Links */

.nav-link {

 color:#d62828;

 cursor:pointer;

 text-decoration:none;

 font-weight:500;

}


.nav-link:hover {

 color:#101d32;

 text-decoration:underline;

}


.nav-link.bold {

 font-weight:700;

}




/* Login button */

.btn-primary {


 width:100%;

 height:50px !important;


 background:#d62828 !important;

 color:white !important;


 border-radius:10px !important;


 font-size:16px;

 font-weight:600;


 transition:.3s;

}



.btn-primary:hover {


 background:#b91c1c !important;


 transform:translateY(-2px);

}





/* Error */

.error-banner {

 display:flex;

 align-items:center;

 gap:8px;


 padding:12px;


 background:#fee2e2;


 border:1px solid #fecaca;


 border-radius:10px;


 color:#b91c1c;


 font-size:14px;

}



.error-banner mat-icon {

 font-size:20px;

}





/* Footer */

.view-footer {

 display:flex;

 justify-content:center;

 align-items:center;


 margin-top:20px;


 font-size:13px;


 color:#64748b;

}



.view-footer mat-icon {

 font-size:16px;

}




mat-spinner {

 margin:auto;

}




/* Mobile */

@media(max-width:768px){


.login-wrapper {

 background:#f5f7fa;

}


.login-card {

 margin:20px;

}


.circle {

 display:none;

}


}

`]
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
