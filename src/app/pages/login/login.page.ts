import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner],
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  loginId = '';
  password = '';
  loading = false;
  sessionExpired = false;

  get schoolName(): string {
    return this.tenant.tenant?.name || '';
  }

  get schoolCode(): string {
    return this.tenant.tenant?.schoolCode || '';
  }

  get schoolInitial(): string {
    const name = this.schoolName.trim();
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    const code = this.schoolCode.trim();
    return code ? code.charAt(0).toUpperCase() : 'S';
  }

  ngOnInit(): void {
    this.sessionExpired = this.route.snapshot.queryParamMap.get('sessionExpired') === '1';
    if (this.auth.isLoggedIn) {
      void this.router.navigate(
        [this.auth.mustChangePassword ? '/change-password' : '/tabs/home'],
        { replaceUrl: true },
      );
    }
  }

  login(): void {
    if (!this.loginId.trim() || !this.password) {
      void this.toast.warning('Enter mobile/email and password', 3500);
      return;
    }
    this.loading = true;
    this.auth.loginWithCredentials(this.loginId, this.password).subscribe({
      next: ({ mustChangePassword }) => {
        this.loading = false;
        void this.router.navigate([mustChangePassword ? '/change-password' : '/tabs/home'], {
          replaceUrl: true,
        });
      },
      error: (err) => {
        this.loading = false;
        const msg =
          typeof err?.error === 'string'
            ? err.error
            : Array.isArray(err?.error)
              ? err.error.join(', ')
              : err?.message || 'Invalid login or password';
        void this.toast.error(msg, 3500);
      },
    });
  }

  changeSchool(): void {
    this.auth.changeSchool();
  }
}
