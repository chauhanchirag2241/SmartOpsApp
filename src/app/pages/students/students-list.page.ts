import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { Subscription, debounceTime, distinctUntilChanged, skip } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  peopleOutline,
} from 'ionicons/icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { StudentFilter, StudentListItem } from '../../core/models/student.model';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { PermissionService } from '../../core/services/permission.service';
import { StudentService } from '../../core/services/student.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoAvatarComponent } from '../../shared/components/so-avatar/so-avatar.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoMultiSelectComponent } from '../../shared/components/so-multi-select/so-multi-select.component';
import { SoSelectOption } from '../../shared/components/so-select/so-select.model';
import { SoModuleShellComponent } from '../../shared/components/so-module-shell/so-module-shell.component';
import { SoPageToolbarComponent } from '../../shared/components/so-page-toolbar/so-page-toolbar.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-students-list',
  templateUrl: './students-list.page.html',
  styleUrls: ['./students-list.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoAvatarComponent,
    SoFilterPopoverComponent,
    SoMultiSelectComponent,
    SoModuleShellComponent,
    SoPageToolbarComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class StudentsListPage implements OnInit, OnDestroy {
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);
  private readonly permissions = inject(PermissionService);
  private readonly header = inject(AppHeaderService);
  private readonly router = inject(Router);
  private subs = new Subscription();
  private loadSub?: Subscription;

  students: StudentListItem[] = [];
  classes: ClassDropdownItem[] = [];
  classFilterIds: string[] = [];
  statusFilter: StudentFilter = StudentFilter.Active;
  filterOpen = false;
  searchQuery = '';
  totalCount = 0;
  pageIndex = 1;
  readonly pageSize = 20;
  loading = false;
  loadingMore = false;
  hasMore = true;

  readonly statusOptions = [
    { value: StudentFilter.All, label: 'All' },
    { value: StudentFilter.Active, label: 'Active' },
    { value: StudentFilter.Inactive, label: 'Inactive' },
  ];

  constructor() {
    addIcons({ peopleOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.loadClasses();
    // Single initial fetch — search$ is a BehaviorSubject and would replay '' immediately;
    // skip(1) ignores that so we don't double-load pageIndex=1 on open.
    this.loadStudents(true);
    this.subs.add(
      this.header.searchQuery$
        .pipe(skip(1), distinctUntilChanged(), debounceTime(300))
        .subscribe((q) => {
          this.searchQuery = q;
          this.loadStudents(true);
        }),
    );
    this.subs.add(
      this.header.filterClick$.subscribe(() => {
        this.filterOpen = true;
      }),
    );
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  get canView(): boolean {
    return this.permissions.canView(MenuCodes.Students);
  }

  get classOptions(): SoSelectOption[] {
    return this.classes.map((item) => ({ value: item.id, label: item.name }));
  }

  get classFilterLabel(): string {
    if (!this.classFilterIds.length) return 'All classes';
    if (this.classFilterIds.length === 1) {
      return this.classes.find((c) => c.id === this.classFilterIds[0])?.name ?? '1 class';
    }
    return `${this.classFilterIds.length} classes`;
  }

  get statusFilterLabel(): string {
    return this.statusOptions.find((o) => o.value === this.statusFilter)?.label ?? 'Status';
  }

  onRefresh(ev: CustomEvent): void {
    this.loadStudents(true, () => (ev.target as HTMLIonRefresherElement).complete());
  }

  onInfinite(ev: CustomEvent): void {
    if (!this.hasMore || this.loadingMore) {
      (ev.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
    this.pageIndex += 1;
    this.loadStudents(false, () => (ev.target as HTMLIonInfiniteScrollElement).complete());
  }

  applyFilters(): void {
    this.filterOpen = false;
    this.loadStudents(true);
  }

  clearFilters(): void {
    this.classFilterIds = [];
    this.statusFilter = StudentFilter.Active;
    this.loadStudents(true);
  }

  openStudent(student: StudentListItem): void {
    void this.router.navigate(['/students', student.id]);
  }

  statusClass(student: StudentListItem): string {
    const s = (student.status ?? '').toLowerCase();
    if (s.includes('inactive')) return 'inactive';
    if (s.includes('active') || student.isActive) return 'active';
    if (s.includes('overdue') || s.includes('due')) return 'warn';
    return 'neutral';
  }

  statusLabel(student: StudentListItem): string {
    const status = (student.status ?? '').trim();
    if (status) return status;
    return student.isActive ? 'Active' : 'Inactive';
  }

  private loadClasses(): void {
    this.classService.getClassDropdown().subscribe({
      next: (list) => (this.classes = list || []),
    });
  }

  private loadStudents(reset: boolean, done?: () => void): void {
    if (!this.canView) {
      done?.();
      return;
    }
    if (reset) {
      this.pageIndex = 1;
      this.hasMore = true;
      this.loading = true;
      this.students = [];
      // Cancel any in-flight list request so rapid resets don't stack identical pageIndex=1 calls.
      this.loadSub?.unsubscribe();
    } else {
      this.loadingMore = true;
    }

    const classIds = this.classFilterIds.length ? this.classFilterIds : null;
    this.loadSub = this.studentService
      .getStudents(
        this.pageIndex,
        this.pageSize,
        this.searchQuery,
        null,
        null,
        this.statusFilter,
        classIds,
      )
      .subscribe({
        next: (res) => {
          const raw = res as unknown as Record<string, unknown>;
          const rows = (raw['items'] ?? raw['Items'] ?? []) as Record<string, unknown>[];
          const mapped = rows.map((r) => this.studentService.mapListItem(r));
          this.students = reset ? mapped : [...this.students, ...mapped];
          this.totalCount = Number(raw['totalCount'] ?? raw['TotalCount'] ?? this.students.length);
          const totalPages = Number(raw['totalPages'] ?? raw['TotalPages'] ?? 1);
          this.hasMore = this.pageIndex < totalPages;
          this.loading = false;
          this.loadingMore = false;
          done?.();
        },
        error: () => {
          this.loading = false;
          this.loadingMore = false;
          done?.();
        },
      });
  }
}
