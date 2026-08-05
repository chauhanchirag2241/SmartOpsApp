import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonPopover,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  airplaneOutline,
  appsOutline,
  book,
  bookOutline,
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
import { PermissionService } from '../../core/services/permission.service';
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
  private readonly toast = inject(ToastController);
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
  moreActions: HomeMoreAction[] = [];
  activeSpotIndex = 0;
  profileOpen = false;

  constructor() {
    addIcons({
      airplaneOutline,
      appsOutline,
      book,
      bookOutline,
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
      displayName: this.firstName(user?.name || user?.email || 'User'),
      dateLabel: this.formatDate(new Date()),
      contextLine: yearName ? `${config.contextLine} • ${yearName}` : config.contextLine,
      roleBadge: config.roleBadge,
      initials: this.initials(user?.name || user?.email || 'U'),
    };

    this.spotlight = config.spotlight.filter((c) => this.allowed(c.requiresMenu));
    this.primaryActions = config.primaryActions.filter((c) => this.allowed(c.requiresMenu));
    this.moreActions = config.moreActions.filter((c) => this.allowed(c.requiresMenu));
    this.activeSpotIndex = 0;
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
    void this.router.navigateByUrl(route);
  }

  private timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  private firstName(full: string): string {
    const part = full.trim().split(/\s+/)[0] || 'User';
    if (part.includes('@')) return part.split('@')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
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

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
