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
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  callOutline,
  chevronForwardOutline,
  mailOutline,
  peopleOutline,
  schoolOutline,
} from 'ionicons/icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { StudentFilter, StudentListItem } from '../../core/models/student.model';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { PermissionService } from '../../core/services/permission.service';
import { StudentService } from '../../core/services/student.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
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
    SoFilterPopoverComponent,
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

  students: StudentListItem[] = [];
  classes: ClassDropdownItem[] = [];
  classFilter = '';
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
    addIcons({ peopleOutline, schoolOutline, mailOutline, callOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.loadClasses();
    this.loadStudents(true);
    this.subs.add(
      this.header.searchQuery$.subscribe((q) => {
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
    this.subs.unsubscribe();
  }

  get canView(): boolean {
    return this.permissions.canView(MenuCodes.Students);
  }

  get classFilterLabel(): string {
    if (!this.classFilter) return 'All classes';
    return this.classes.find((c) => c.id === this.classFilter)?.name ?? 'Class';
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

  onClassChange(): void {
    this.loadStudents(true);
  }

  onStatusChange(): void {
    this.loadStudents(true);
  }

  applyFilters(): void {
    this.filterOpen = false;
    this.loadStudents(true);
  }

  clearFilters(): void {
    this.classFilter = '';
    this.statusFilter = StudentFilter.Active;
    this.loadStudents(true);
  }

  openStudent(student: StudentListItem): void {
    void this.router.navigate(['/students', student.id]);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  statusClass(student: StudentListItem): string {
    const s = (student.status ?? '').toLowerCase();
    if (s.includes('active') || student.isActive) return 'active';
    if (s.includes('inactive')) return 'inactive';
    if (s.includes('overdue') || s.includes('due')) return 'warn';
    return 'neutral';
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
    } else {
      this.loadingMore = true;
    }

    const classIds = this.classFilter ? [this.classFilter] : null;
    this.studentService
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
