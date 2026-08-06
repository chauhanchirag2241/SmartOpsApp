import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

export interface AppHeaderConfig {
  title: string;
  showFilter?: boolean;
  showBack?: boolean;
  backHref?: string;
  searchPlaceholder?: string;
}

@Injectable({ providedIn: 'root' })
export class AppHeaderService {
  private readonly searchQuerySubject = new BehaviorSubject('');
  readonly searchQuery$ = this.searchQuerySubject.pipe(distinctUntilChanged());

  private readonly filterClickSubject = new Subject<void>();
  readonly filterClick$ = this.filterClickSubject.asObservable();

  title = 'SmartOps';
  showFilter = false;
  showBack = false;
  backHref = '/tabs/home';
  searchPlaceholder = 'Search...';
  searchExpanded = false;

  configure(config: AppHeaderConfig): void {
    this.title = config.title;
    this.showFilter = !!config.showFilter;
    this.showBack = !!config.showBack;
    this.backHref = config.backHref ?? '/tabs/home';
    this.searchPlaceholder = config.searchPlaceholder ?? 'Search...';
    this.searchExpanded = false;
    // Avoid re-emitting '' — BehaviorSubject.next always notifies even when unchanged.
    if (this.searchQuerySubject.value !== '') {
      this.searchQuerySubject.next('');
    }
  }

  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  toggleSearch(): void {
    this.searchExpanded = !this.searchExpanded;
    if (!this.searchExpanded) {
      this.setSearchQuery('');
    }
  }

  closeSearch(): void {
    this.searchExpanded = false;
    this.setSearchQuery('');
  }

  emitFilterClick(): void {
    this.filterClickSubject.next();
  }
}
