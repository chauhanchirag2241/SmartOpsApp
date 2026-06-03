import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonPopover,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  funnelOutline,
  logOutOutline,
  mailOutline,
  notificationsOutline,
  personCircleOutline,
  searchOutline,
  shieldOutline,
} from 'ionicons/icons';
import { AppHeaderService } from '../../../core/services/app-header.service';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicYearContextService } from '../../../core/services/academic-year-context.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonBackButton,
    IonPopover,
  ],
})
export class AppHeaderComponent implements OnInit {
  private readonly header = inject(AppHeaderService);
  private readonly auth = inject(AuthService);
  readonly ay = inject(AcademicYearContextService);

  @ViewChild('searchBar') searchBar?: IonSearchbar;

  @Input() title = '';
  @Input() showFilter = false;
  @Input() showBack = false;
  @Input() backHref = '/tabs/home';
  @Input() searchPlaceholder = 'Search...';

  profileOpen = false;
  notificationsOpen = false;

  constructor() {
    addIcons({
      searchOutline,
      notificationsOutline,
      funnelOutline,
      personCircleOutline,
      logOutOutline,
      mailOutline,
      shieldOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.header.configure({
      title: this.title,
      showFilter: this.showFilter,
      showBack: this.showBack,
      backHref: this.backHref,
      searchPlaceholder: this.searchPlaceholder,
    });
  }

  get searchExpanded(): boolean {
    return this.header.searchExpanded;
  }

  get displayTitle(): string {
    return this.title || this.header.title;
  }

  get userName(): string {
    return this.auth.currentUser?.name ?? 'User';
  }

  get userEmail(): string {
    return this.auth.currentUser?.email ?? '';
  }

  get userRole(): string {
    const u = this.auth.currentUser;
    return u?.roles?.[0] ?? u?.role ?? '';
  }

  toggleSearch(): void {
    this.header.toggleSearch();
  }

  openSearch(): void {
    if (!this.header.searchExpanded) {
      this.header.toggleSearch();
    }
    setTimeout(() => void this.searchBar?.setFocus(), 80);
  }

  closeSearch(): void {
    this.header.closeSearch();
  }

  onSearchInput(ev: CustomEvent): void {
    const value = (ev.detail as { value?: string })?.value ?? '';
    this.header.setSearchQuery(value);
  }

  onFilter(): void {
    this.header.emitFilterClick();
  }

  signOut(): void {
    this.profileOpen = false;
    this.auth.logout();
  }
}
