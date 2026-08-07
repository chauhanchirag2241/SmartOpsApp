import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { clipboardOutline, homeOutline, megaphoneOutline, personOutline } from 'ionicons/icons';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { MenuCodes } from '../../../core/constants/menu-codes';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Persistent bottom nav shown on all authenticated app pages (not only Home).
 * Lets users jump back to dashboard from any feature screen.
 */
@Component({
  selector: 'app-bottom-nav',
  templateUrl: './app-bottom-nav.component.html',
  styleUrls: ['./app-bottom-nav.component.scss'],
  imports: [IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class AppBottomNavComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    addIcons({ homeOutline, clipboardOutline, megaphoneOutline, personOutline });
  }

  get homeActive(): boolean {
    const u = this.url() || '';
    return u.startsWith('/tabs') || u === '/' || u === '';
  }

  get attendanceActive(): boolean {
    const u = this.url() || '';
    return u.startsWith('/attendance') || u.startsWith('/staff-attendance');
  }

  goHome(): void {
    void this.router.navigateByUrl('/tabs/home');
  }

  goAttendance(): void {
    if (this.permissions.canView(MenuCodes.Attendance)) {
      void this.router.navigateByUrl('/attendance');
      return;
    }
    if (this.permissions.canView(MenuCodes.StaffAttendance)) {
      void this.router.navigateByUrl('/staff-attendance');
      return;
    }
    void this.toast.info('Attendance is not available for your role.', 2200);
  }

  comingSoon(label: string): void {
    void this.toast.info(`${label} is coming soon on mobile.`, 2200);
  }
}
