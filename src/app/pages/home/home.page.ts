import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonPopover,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  airplaneOutline,
  appsOutline,
  book,
  bookOutline,
  calendarClearOutline,
  calendarOutline,
  callOutline,
  cardOutline,
  cash,
  cashOutline,
  checkboxOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  createOutline,
  documentTextOutline,
  fingerPrintOutline,
  gridOutline,
  logOutOutline,
  megaphoneOutline,
  notificationsOutline,
  peopleOutline,
  schoolOutline,
  wallet,
  walletOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { ClassService } from '../../core/services/class.service';
import { PermissionService } from '../../core/services/permission.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';
import { buildHomeDashboardConfig, resolveHomeUserType } from './home-dashboard.config';
import {
  HomeHeaderInfo,
  HomeMoreAction,
  HomePrimaryAction,
  HomeSpotlightCard,
} from './home-dashboard.models';
import { HdMoreActionTileComponent } from './components/hd-more-action-tile/hd-more-action-tile.component';
import { HdPrimaryActionCardComponent } from './components/hd-primary-action-card/hd-primary-action-card.component';
import { HdSpotlightCardComponent } from './components/hd-spotlight-card/hd-spotlight-card.component';
import { HdUserHeaderComponent } from './components/hd-user-header/hd-user-header.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonPopover,
    HdUserHeaderComponent,
    HdSpotlightCardComponent,
    HdPrimaryActionCardComponent,
    HdMoreActionTileComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  private readonly students = inject(StudentService);
  private readonly classes = inject(ClassService);
  private readonly toast = inject(ToastService);
  readonly ay = inject(AcademicYearContextService);

  headerInfo: HomeHeaderInfo = {
    greeting: 'Hello',
    displayName: 'User',
    dateLabel: '',
    contextLine: '',
    roleBadge: '',
    initials: 'U',
  };
  spotlight: HomeSpotlightCard[] = [];
  primaryActions: HomePrimaryAction[] = [];
  moreActionsTitle = 'More Actions';
  moreActions: HomeMoreAction[] = [];
  myActionsTitle = 'My Actions';
  myActions: HomeMoreAction[] = [];
  activeSpotIndex = 0;
  profileOpen = false;

  constructor() {
    addIcons({
      airplaneOutline,
      appsOutline,
      book,
      bookOutline,
      calendarClearOutline,
      calendarOutline,
      callOutline,
      cardOutline,
      cash,
      cashOutline,
      checkboxOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      createOutline,
      // Explicit kebab key so Exam tile resolves even if camelCase map is missed.
      'document-text-outline': documentTextOutline,
      documentTextOutline,
      fingerPrintOutline,
      gridOutline,
      logOutOutline,
      megaphoneOutline,
      notificationsOutline,
      peopleOutline,
      schoolOutline,
      wallet,
      walletOutline,
    });
  }

  ngOnInit(): void {
    this.buildDashboard();
  }

  /** Ionic lifecycle — refresh when returning to home. */
  ionViewWillEnter(): void {
    this.buildDashboard();
  }

  onSpotScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el || !this.spotlight.length) return;
    const cardWidth = el.clientWidth * 0.86;
    const idx = Math.round(el.scrollLeft / Math.max(cardWidth, 1));
    this.activeSpotIndex = Math.max(0, Math.min(this.spotlight.length - 1, idx));
  }

  openSpotlight(card: HomeSpotlightCard): void {
    this.navigateOrToast(card.route, card.title);
  }

  openPrimary(action: HomePrimaryAction): void {
    this.navigateOrToast(action.route, action.title);
  }

  openMore(action: HomeMoreAction): void {
    this.navigateOrToast(action.route, action.title);
  }

  signOut(): void {
    this.profileOpen = false;
    this.auth.logout();
  }

  private buildDashboard(): void {
    const user = this.auth.currentUser;
    const userType = resolveHomeUserType(user);
    const config = buildHomeDashboardConfig(userType);
    const yearName = this.ay.currentYear()?.name;

    this.headerInfo = {
      greeting: this.timeGreeting(),
      displayName: this.greetingName(user?.name || user?.email || 'User'),
      dateLabel: this.formatDate(new Date()),
      contextLine: yearName ? `${config.contextLine} • ${yearName}` : config.contextLine,
      roleBadge: config.roleBadge,
      initials: this.initials(user?.name || user?.email || 'U'),
    };

    this.spotlight = config.spotlight.filter((c) => this.allowed(c.requiresMenu));
    this.primaryActions = config.primaryActions.filter((c) => this.allowed(c.requiresMenu));
    this.moreActionsTitle = config.moreActionsTitle ?? 'More Actions';
    this.moreActions = config.moreActions.filter((c) => this.allowed(c.requiresMenu));
    this.myActionsTitle = config.myActionsTitle ?? 'My Actions';
    this.myActions = (config.myActions ?? []).filter((c) => this.allowed(c.requiresMenu));
    this.activeSpotIndex = 0;

    if (userType === 'student') {
      this.loadStudentHeaderBadge();
    } else if (userType === 'teacher') {
      this.loadTeacherClassBadge();
    }
  }

  private loadStudentHeaderBadge(): void {
    this.students.getMyPortalSummary().subscribe({
      next: (summary) => {
        const badge = this.formatStudentClassRoll(summary.className, summary.section, summary.rollNumber);
        if (badge) {
          this.headerInfo = { ...this.headerInfo, roleBadge: badge };
        }
      },
      error: () => {
        /* keep empty badge — role label intentionally hidden */
      },
    });
  }

  private loadTeacherClassBadge(): void {
    this.classes.getMyClassTeacherAssignments().subscribe({
      next: (rows) => {
        const names = (rows ?? [])
          .map((r) => (r.name || '').trim())
          .filter(Boolean);
        if (!names.length) return;
        const badge = names.length <= 2 ? names.join(' · ') : `${names.slice(0, 2).join(' · ')} +${names.length - 2}`;
        this.headerInfo = { ...this.headerInfo, roleBadge: badge };
      },
      error: () => {
        /* keep config badge / empty */
      },
    });
  }

  private formatStudentClassRoll(
    className?: string | null,
    section?: string | null,
    rollNumber?: string | null,
  ): string {
    const cls = (className ?? '').trim();
    const sec = (section ?? '').trim();
    const roll = (rollNumber ?? '').trim();
    const classLabel = cls && sec ? `${cls} — ${sec}` : cls || sec;
    if (classLabel && roll) return `${classLabel} • Roll ${roll}`;
    if (classLabel) return classLabel;
    if (roll) return `Roll ${roll}`;
    return '';
  }

  private allowed(menuCode?: string): boolean {
    if (!menuCode) return true;
    return this.permissions.canView(menuCode);
  }

  private navigateOrToast(route: string | undefined, title: string): void {
    if (!route) {
      void this.showToast(`${title} is coming soon on mobile.`);
      return;
    }
    // Absolute URL from tabs shell (same pattern as /homework, /timetable).
    const url = route.startsWith('/') ? route : `/${route}`;
    void this.router.navigateByUrl(url);
  }

  private timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private greetingName(full: string): string {
    const cleaned = full.trim();
    if (!cleaned) return 'User';
    if (cleaned.includes('@')) {
      const local = cleaned.split('@')[0] || 'User';
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return cleaned;
  }

  private initials(full: string): string {
    const cleaned = full.replace(/@.*/, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase() || 'U';
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  private showToast(message: string): void {
    void this.toast.info(message);
  }
}
