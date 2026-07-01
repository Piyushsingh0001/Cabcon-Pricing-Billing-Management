import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of, BehaviorSubject } from 'rxjs';

export interface UserSession {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  accessToken: string;
  accessTokenExpiresUtc: string;
  refreshToken: string;
  refreshTokenExpiresUtc: string;
  roles: string[];
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiBase = 'https://localhost:55027/api/auth'; // Matches WebApi launchSettings.json

  // Signals
  private sessionSignal = signal<UserSession | null>(null);
  
  public session = this.sessionSignal.asReadonly();
  public isAuthenticated = computed(() => this.sessionSignal() !== null);
  public currentUser = computed(() => this.sessionSignal());
  
  private isRefreshingToken = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    const saved = localStorage.getItem('cabcon_session');
    if (saved) {
      try {
        const session: UserSession = JSON.parse(saved);
        // Check if refresh token is expired
        if (new Date(session.refreshTokenExpiresUtc) > new Date()) {
          this.sessionSignal.set(session);
        } else {
          this.clearSession();
        }
      } catch {
        this.clearSession();
      }
    }
  }

  public getAccessToken(): string | null {
    return this.sessionSignal()?.accessToken ?? null;
  }

  public getRefreshToken(): string | null {
    return this.sessionSignal()?.refreshToken ?? null;
  }

  public hasPermission(permission: string): boolean {
    const user = this.sessionSignal();
    if (!user) return false;
    // Admins bypass all checks
    if (user.roles.includes('Admin')) return true;
    return user.permissions.includes(permission);
  }

  public hasRole(role: string): boolean {
    const user = this.sessionSignal();
    return user ? user.roles.includes(role) : false;
  }

  public login(userNameOrEmail: string, password: string): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.apiBase}/login`, { userNameOrEmail, password }).pipe(
      tap(session => this.setSession(session))
    );
  }

  public logout(): Observable<void> {
    const token = this.getRefreshToken();
    const clearAndRedirect = () => {
      this.clearSession();
      window.location.href = '/login';
    };

    if (token) {
      return this.http.post<void>(`${this.apiBase}/logout`, { refreshToken: token }).pipe(
        tap(clearAndRedirect),
        catchError(() => {
          clearAndRedirect();
          return of(undefined);
        })
      );
    }
    clearAndRedirect();
    return of(undefined);
  }

  public refreshToken(): Observable<UserSession | null> {
    const token = this.getRefreshToken();
    if (!token) {
      this.clearSession();
      return of(null);
    }

    return this.http.post<UserSession>(`${this.apiBase}/refresh-token`, { refreshToken: token }).pipe(
      tap(session => this.setSession(session)),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  private setSession(session: UserSession) {
    this.sessionSignal.set(session);
    localStorage.setItem('cabcon_session', JSON.stringify(session));
  }

  private clearSession() {
    this.sessionSignal.set(null);
    localStorage.removeItem('cabcon_session');
  }
}
