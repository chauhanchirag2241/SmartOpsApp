import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  appsOutline,
  bookOutline,
  busOutline,
  calendarClearOutline,
  calendarOutline,
  cardOutline,
  cashOutline,
  checkboxOutline,
  documentTextOutline,
  easelOutline,
  ellipsisHorizontalOutline,
  gitNetworkOutline,
  imagesOutline,
  libraryOutline,
  lockClosedOutline,
  megaphoneOutline,
  peopleOutline,
  personOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  walletOutline,
} from 'ionicons/icons';
import { DashboardModuleItem } from '../../core/config/mobile-menu.config';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AppHeaderService } from '../../core/services/app-header.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [AppHeaderComponent, IonContent, IonIcon],
})
export class HomePage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  private readonly header = inject(AppHeaderService);
  private readonly toast = inject(ToastController);
  readonly ay = inject(AcademicYearContextService);
  private subs = new Subscription();

  userName = '';
  roleLabel = '';
  allModules: DashboardModuleItem[] = [];
  visibleModules: DashboardModuleItem[] = [];
  headerSearch = '';

  constructor() {
    addIcons({
      schoolOutline,
      shieldCheckmarkOutline,
      checkboxOutline,
      bookOutline,
      calendarOutline,
      documentTextOutline,
      cardOutline,
      libraryOutline,
      busOutline,
      megaphoneOutline,
      calendarClearOutline,
      imagesOutline,
      lockClosedOutline,
      ellipsisHorizontalOutline,
      appsOutline,
      peopleOutline,
      personOutline,
      easelOutline,
      gitNetworkOutline,
      cashOutline,
      walletOutline,
    });
  }

  ngOnInit(): void {
    const user = this.auth.currentUser;
    this.userName = user?.name ?? 'User';
    this.roleLabel = this.formatRole(user?.roles?.[0] ?? user?.role ?? '');
    this.allModules = this.permissions.getDashboardModules();
    this.applyFilters();

    this.subs.add(
      this.header.searchQuery$.subscribe((q) => {
        this.headerSearch = q.trim().toLowerCase();
        this.applyFilters();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get attendanceStatLabel(): string {
    return this.permissions.canView(MenuCodes.Attendance) ? 'Open module' : '—';
  }

  get homeworkStatLabel(): string {
    return this.permissions.canView(MenuCodes.Homework) ? 'Open module' : '—';
  }

  openModule(mod: DashboardModuleItem): void {
    if (!mod.availableOnMobile || !mod.mobileRoute) {
      void this.showToast(`${mod.name} is not available on mobile yet.`);
      return;
    }
    void this.router.navigate([mod.mobileRoute]);
  }

  private applyFilters(): void {
    let list = [...this.allModules];
    if (this.headerSearch) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(this.headerSearch) ||
          m.menuCode.toLowerCase().includes(this.headerSearch),
      );
    }
    this.visibleModules = list;
  }

  private formatRole(role: string): string {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 3000, position: 'bottom' });
    await t.present();
  }
}
