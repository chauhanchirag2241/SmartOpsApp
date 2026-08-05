import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { LoginResponse, User, UserProfile, UserRole } from '../models/user.model';
import { isUsableAccessToken } from '../utils/token.util';
import { AcademicYearContextService } from './academic-year-context.service';
import { ApiService } from './api.service';
import { PermissionService } from './permission.service';
import { StorageService } from './storage.service';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly permissionService = inject(PermissionService);
  private readonly ayContext = inject(AcademicYearContextService);
  private readonly tenant = inject(TenantService);
  private readonly tokenKey = 'mobile_token';
  private readonly userKey = 'mobile_user';
  private readonly ayKey = 'mobile_academic_year_id';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.ensureValidSessionOrClear();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return isUsableAccessToken(this.getToken());
  }

  get mustChangePassword(): boolean {
    return !!this.currentUser?.mustChangePassword;
  }

  ensureValidSessionOrClear(): void {
    const token = this.getToken();
    if (!isUsableAccessToken(token)) {
      this.clearSessionStorage();
      this.permissionService.clear();
      this.currentUserSubject.next(null);
      return;
    }
    const user = this.storage.get<User>(this.userKey);
    this.currentUserSubject.next(user ? { ...user, token } : null);
  }

  /** Login with email (e.g. admin@smartops.com) or 10-digit mobile number + password. */
  loginWithCredentials(login: string, password: string): Observable<{ mustChangePassword: boolean }> {
    const payload = { email: this.normalizeLogin(login), password };
    return this.api.post<LoginResponse>('auth/login', payload).pipe(
      switchMap((raw) => {
        const accessToken = this.resolveAccessToken(raw);
        if (!isUsableAccessToken(accessToken)) {
          return throwError(() => new Error('Login succeeded but no access token was returned.'));
        }
        this.storage.set(this.tokenKey, accessToken);
        return this.api.get<UserProfile>('auth/me').pipe(
          map((profile) => ({
            accessToken,
            profile,
            mustChangePassword: !!(raw.mustChangePassword ?? profile.mustChangePassword),
          })),
        );
      }),
      switchMap(({ accessToken, profile, mustChangePassword }) => {
        const user = this.mapProfileToUser(profile, mustChangePassword);
        this.login(user, accessToken);
        return this.permissionService.loadSession().pipe(
          map(() => ({ mustChangePassword })),
          catchError(() => of({ mustChangePassword })),
        );
      }),
      switchMap(({ mustChangePassword }) =>
        this.ayContext.loadCurrentYear().pipe(
          catchError(() => of(null)),
          map(() => ({ mustChangePassword })),
        ),
      ),
      catchError((err) => throwError(() => err)),
    );
  }

  changePassword(oldPassword: string, newPassword: string, confirmNewPassword: string): Observable<void> {
    return this.api
      .post<void>('auth/change-password', { oldPassword, newPassword, confirmNewPassword })
      .pipe(
        tap(() => {
          const user = this.currentUser;
          if (user) {
            const updated = { ...user, mustChangePassword: false };
            this.storage.set(this.userKey, updated);
            this.currentUserSubject.next(updated);
          }
        }),
        map(() => undefined),
      );
  }

  login(user: User, token: string): void {
    this.storage.set(this.tokenKey, token);
    this.storage.set(this.userKey, { ...user, token });
    this.currentUserSubject.next({ ...user, token });
  }

  /** Clears session only — keeps device school (mobile_tenant). */
  logout(): void {
    this.permissionService.clear();
    this.clearSessionStorage();
    this.currentUserSubject.next(null);
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  /** Clears session + school so user can pick another school code. */
  changeSchool(): void {
    this.permissionService.clear();
    this.clearSessionStorage();
    this.tenant.clearTenant();
    this.currentUserSubject.next(null);
    void this.router.navigate(['/school-code'], { replaceUrl: true });
  }

  expireSession(): void {
    this.permissionService.clear();
    this.clearSessionStorage();
    this.currentUserSubject.next(null);
    void this.router.navigate(['/login'], { queryParams: { sessionExpired: '1' }, replaceUrl: true });
  }

  getToken(): string | null {
    const token = this.storage.get<string>(this.tokenKey);
    return typeof token === 'string' ? token.trim() : null;
  }

  private normalizeLogin(value: string): string {
    const trimmed = value.trim();
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  private clearSessionStorage(): void {
    this.storage.remove(this.tokenKey);
    this.storage.remove(this.userKey);
    this.storage.remove(this.ayKey);
  }

  private resolveAccessToken(raw: LoginResponse | Record<string, unknown>): string {
    const record = raw as Record<string, unknown>;
    const candidate = record['accessToken'] ?? record['AccessToken'];
    return typeof candidate === 'string' ? candidate : '';
  }

  private mapProfileToUser(profile: UserProfile, mustChangePassword = false): User {
    const roles = profile.roles ?? [];
    const primaryRole = roles[0] ?? 'School Admin';
    return {
      id: profile.id,
      name: profile.username || profile.email,
      email: profile.email,
      role: this.mapRole(primaryRole),
      roles,
      roleId: profile.roleId,
      roleCode: profile.roleCode,
      mustChangePassword: mustChangePassword || !!profile.mustChangePassword,
    };
  }

  private mapRole(role?: string): UserRole {
    const known: UserRole[] = ['teacher', 'student', 'parent', 'admin', 'Admin', 'Accountant', 'SmartOpsAdmin', 'School Admin'];
    if (known.includes(role as UserRole)) {
      return role as UserRole;
    }
    return 'Admin';
  }
}
