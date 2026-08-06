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
import { SchoolService } from '../../core/services/school.service';
import { TenantService } from '../../core/services/tenant.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-school-code',
  templateUrl: './school-code.page.html',
  styleUrls: ['./school-code.page.scss'],
  imports: [FormsModule, IonContent, IonInput, IonButton, IonSpinner],
})
export class SchoolCodePage implements OnInit {
  private readonly schoolApi = inject(SchoolService);
  private readonly tenant = inject(TenantService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  schoolCode = '';
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn && this.tenant.hasTenant) {
      void this.router.navigate(
        [this.auth.mustChangePassword ? '/change-password' : '/tabs/home'],
        { replaceUrl: true },
      );
      return;
    }

    if (this.tenant.tenant) {
      void this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  continue(): void {
    const code = this.schoolCode.trim();
    if (!code) {
      this.errorMessage = 'Enter your school code';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.schoolApi.findBySchoolCode(code).subscribe({
      next: (school) => {
        this.loading = false;
        if (!school.subdomain) {
          this.errorMessage = 'School found but is not configured correctly';
          return;
        }
        this.tenant.setTenant({
          id: school.id,
          name: school.name,
          subdomain: school.subdomain,
          schoolCode: school.schoolCode?.trim() || code,
        });
        void this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 404) {
          this.errorMessage = 'School not found. Check the school code and try again.';
          return;
        }
        const msg =
          typeof err?.error === 'string'
            ? err.error
            : err?.message || 'Could not find school. Check your connection and try again.';
        this.errorMessage = msg;
        void this.showToast(msg);
      },
    });
  }

  private showToast(message: string): void {
    void this.toast.error(message, 3500);
  }
}
