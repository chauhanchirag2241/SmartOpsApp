import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonNote,
  IonSpinner,
  IonText,
  ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonNote,
    IonText,
  ],
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastController);

  loginId = '';
  password = '';
  loading = false;
  sessionExpired = false;

  ngOnInit(): void {
    this.sessionExpired = this.route.snapshot.queryParamMap.get('sessionExpired') === '1';
    if (this.auth.isLoggedIn) {
      void this.router.navigate(['/tabs/home'], { replaceUrl: true });
    }
  }

  login(): void {
    if (!this.loginId.trim() || !this.password) {
      void this.showToast('Enter mobile/email and password');
      return;
    }
    this.loading = true;
    this.auth.loginWithCredentials(this.loginId, this.password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/tabs/home'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        const msg =
          typeof err?.error === 'string'
            ? err.error
            : Array.isArray(err?.error)
              ? err.error.join(', ')
              : err?.message || 'Invalid login or password';
        void this.showToast(msg);
      },
    });
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 3500, position: 'bottom' });
    await t.present();
  }
}
