import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner],
})
export class ChangePasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  oldPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    if (!this.auth.hasActiveRole) {
      this.auth.clearSessionForNoActiveRole();
      void this.router.navigate(['/login'], {
        queryParams: { noActiveRole: '1' },
        replaceUrl: true,
      });
      return;
    }
    if (!this.auth.mustChangePassword) {
      void this.router.navigate(['/tabs/home'], { replaceUrl: true });
    }
  }

  submit(): void {
    this.errorMessage = '';
    if (!this.oldPassword || !this.newPassword || !this.confirmNewPassword) {
      this.errorMessage = 'Fill all password fields';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'New password must be at least 8 characters';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage = 'New password and confirmation do not match';
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(this.newPassword)) {
      this.errorMessage = 'Include upper, lower, digit, and special character';
      return;
    }

    this.loading = true;
    this.auth.changePassword(this.oldPassword, this.newPassword, this.confirmNewPassword).subscribe({
      next: () => {
        this.loading = false;
        void this.showToast('Password updated');
        void this.router.navigate(['/tabs/home'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = getUserFacingApiError(err, 'Unable to update password');
      },
    });
  }

  private showToast(message: string): void {
    void this.toast.success(message, 2500);
  }
}
