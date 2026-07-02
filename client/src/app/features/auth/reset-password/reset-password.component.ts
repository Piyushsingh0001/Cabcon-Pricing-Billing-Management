import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
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
    MatSnackBarModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);

  public hidePassword = signal(true);
  public isLoading = signal(false);
  public errorMessage = signal<string | null>(null);
  public isSuccess = signal(false);
  private token: string = '';

  public resetForm!: FormGroup;

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] || '';
    const email = this.route.snapshot.queryParams['email'] || '';

    this.resetForm = this.fb.group({
      email: [{ value: email, disabled: true }],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    if (!this.token || !email) {
      this.errorMessage.set('Invalid or missing reset token.');
    }
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (password !== confirm) {
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      if (control.get('confirmPassword')?.hasError('mismatch')) {
        control.get('confirmPassword')?.setErrors(null);
      }
      return null;
    }
  }

  public togglePassword() {
    this.hidePassword.update(prev => !prev);
  }

  public goToLogin() {
    this.router.navigate(['/login']);
  }

  public onSubmit() {
    if (this.resetForm.invalid || !this.token) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      email: this.resetForm.getRawValue().email,
      token: this.token,
      newPassword: this.resetForm.value.newPassword
    };

    this.http.post('https://localhost:55027/api/auth/reset-password', payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reset password. The link may have expired.');
      }
    });
  }
}
