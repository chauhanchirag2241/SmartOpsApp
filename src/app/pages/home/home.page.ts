import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  checkboxOutline,
  homeOutline,
  logOutOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { MobileMenuRoute } from '../../core/config/mobile-menu.config';
import { AuthService } from '../../core/services/auth.service';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
  ],
})
export class HomePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionService);
  readonly ay = inject(AcademicYearContextService);

  userName = '';
  roleLabel = '';
  menuEntries: MobileMenuRoute[] = [];

  constructor() {
    addIcons({ homeOutline, checkboxOutline, bookOutline, logOutOutline, personCircleOutline });
  }

  ngOnInit(): void {
    const user = this.auth.currentUser;
    this.userName = user?.name ?? 'User';
    this.roleLabel = user?.roles?.[0] ?? user?.role ?? '';
    this.menuEntries = this.permissions.getMobileEntries().filter((m) => m.menuCode !== 'DASHBOARD');
  }

  openMenu(entry: MobileMenuRoute): void {
    void this.router.navigate([entry.route]);
  }

  logout(): void {
    this.auth.logout();
  }

  iconFor(entry: MobileMenuRoute): string {
    return entry.icon;
  }
}
