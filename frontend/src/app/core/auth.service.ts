import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API } from './config';
import { AuthResponse, Role, User } from './models';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly _token = signal<string | null>(read<string>(TOKEN_KEY));
  private readonly _user = signal<User | null>(read<User>(USER_KEY));

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token() && !!this._user());
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly displayName = computed(() => {
    const u = this._user();
    if (!u) return '';
    // Doctors are shown as "Dr <last name>", like in the API.
    return u.role === 'DOCTOR' ? `Dr ${u.lastName}` : `${u.firstName} ${u.lastName}`;
  });

  constructor() {
    // Refresh the profile (up-to-date role / status) on startup.
    if (this._token()) this.refresh().subscribe({ error: () => {} });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password }).pipe(tap((r) => this.store(r)));
  }

  register(body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string | null;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/register`, body).pipe(tap((r) => this.store(r)));
  }

  forgotPassword(email: string) {
    return this.http.post<void>(`${API}/auth/forgot-password`, { email });
  }

  setPassword(token: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/set-password`, { token, password }).pipe(tap((r) => this.store(r)));
  }

  refresh(): Observable<User> {
    return this.http.get<User>(`${API}/auth/me`).pipe(tap((u) => this.setUser(u)));
  }

  updateProfile(body: Partial<User>): Observable<User> {
    return this.http.put<User>(`${API}/auth/me`, body).pipe(tap((u) => this.setUser(u)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<void>(`${API}/auth/me/password`, { currentPassword, newPassword });
  }

  logout(redirect = true) {
    this._token.set(null);
    this._user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    if (redirect) this.router.navigateByUrl('/');
  }

  /** Home page of the area matching the role. */
  homeFor(role: Role | null = this.role()): string {
    switch (role) {
      case 'ADMIN':
        return '/admin/tableau-de-bord';
      case 'DOCTOR':
        return '/cabinet/tableau-de-bord';
      case 'PATIENT':
        return '/espace/rendez-vous';
      default:
        return '/';
    }
  }

  private store(r: AuthResponse) {
    this._token.set(r.token);
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(r.token));
    } catch {}
    this.setUser(r.user);
  }

  private setUser(u: User) {
    this._user.set(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }
}
