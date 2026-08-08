import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, debounceTime, distinctUntilChanged, skip } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  bookOutline,
  calendarOutline,
  checkmarkDoneCircleOutline,
  clipboardOutline,
  schoolOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  HomeworkListItem,
  HomeworkStats,
  StudentHomeworkItem,
} from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import {
  ClassDropdownItem,
  ClassGroupSubjectItem,
  ClassService,
} from '../../core/services/class.service';
import { HomeworkService } from '../../core/services/homework.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ToastService } from '../../core/services/toast.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';
import {
  SoMultiChipOption,
  SoMultiChipsComponent,
} from '../../shared/components/so-multi-chips/so-multi-chips.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';
import { pickStr, formatDisplayDate } from '../../core/utils/api-mapper.util';
import { resolveHomeUserType } from '../home/home-dashboard.config';

@Component({
  selector: 'app-homework-list',
  templateUrl: './homework-list.page.html',
  styleUrls: ['./homework-list.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    SoSelectComponent,
    SoMultiChipsComponent,
    SoSegmentComponent,
    IonCard,
    IonCardContent,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class HomeworkListPage implements OnInit, OnDestroy {
  private readonly homeworkService = inject(HomeworkService);
  private readonly header = inject(AppHeaderService);
  private subs = new Subscription();
  private studentLoadSub: Subscription | null = null;
  private readonly classService = inject(ClassService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  readonly isStudent = resolveHomeUserType(this.auth.currentUser) === 'student';

  items: HomeworkListItem[] = [];
  studentItems: StudentHomeworkItem[] = [];
  studentPageIndex = 1;
  readonly studentPageSize = 10;
  studentHasMore = false;
  studentLoadingMore = false;
  classGroups: ClassDropdownItem[] = [];
  sections: ClassDropdownItem[] = [];
  groupSubjects: ClassGroupSubjectItem[] = [];
  private allSections: ClassDropdownItem[] = [];
  stats: HomeworkStats = { totalAssigned: 0, dueToday: 0, totalSubmissions: 0, overdue: 0 };

  classGroupFilter = '';
  sectionFilterIds: string[] = [];
  subjectFilterIds: string[] = [];
  chipFilter = 'all';
  studentTab = 'all';
  filterOpen = false;
  searchQuery = '';
  loading = false;
  studentClassLabel = '';

  readonly chipOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'today', label: 'Due today' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'done', label: 'Done' },
  ];

  readonly studentTabOptions: SoSegmentOption[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Done' },
    { value: 'overdue', label: 'Overdue' },
  ];

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      bookOutline,
      calendarOutline,
      checkmarkDoneCircleOutline,
      clipboardOutline,
      schoolOutline,
      timeOutline,
    });
  }

  get canManage(): boolean {
    if (this.isStudent) return false;
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.Homework);
  }

  get classGroupOptions(): SoSelectOption[] {
    return [
      { value: '', label: 'All class groups' },
      ...this.classGroups.map((g) => ({ value: g.id, label: g.name })),
    ];
  }

  get sectionOptions(): SoMultiChipOption[] {
    return this.sections.map((s) => ({
      value: s.id,
      label: this.sectionChipLabel(s),
    }));
  }

  get subjectOptions(): SoMultiChipOption[] {
    return this.groupSubjects.map((s) => ({
      value: s.subjectId,
      label: s.subjectName || 'Subject',
    }));
  }

  get classGroupFilterLabel(): string {
    if (!this.classGroupFilter) return 'All class groups';
    return this.classGroups.find((g) => g.id === this.classGroupFilter)?.name ?? 'Class group';
  }

  get sectionFilterLabel(): string {
    if (!this.classGroupFilter) return 'All sections';
    if (!this.sectionFilterIds.length || this.sectionFilterIds.length >= this.sections.length) {
      return 'All sections';
    }
    if (this.sectionFilterIds.length === 1) {
      const s = this.sections.find((x) => x.id === this.sectionFilterIds[0]);
      return s ? this.sectionChipLabel(s) : '1 section';
    }
    return `${this.sectionFilterIds.length} sections`;
  }

  get subjectFilterLabel(): string {
    if (!this.classGroupFilter) return 'All subjects';
    if (!this.subjectFilterIds.length || this.subjectFilterIds.length >= this.groupSubjects.length) {
      return 'All subjects';
    }
    if (this.subjectFilterIds.length === 1) {
      return (
        this.groupSubjects.find((s) => s.subjectId === this.subjectFilterIds[0])?.subjectName ??
        '1 subject'
      );
    }
    return `${this.subjectFilterIds.length} subjects`;
  }

  get chipFilterLabel(): string {
    return this.chipOptions.find((c) => c.value === this.chipFilter)?.label ?? this.chipFilter;
  }

  ngOnInit(): void {
    if (!this.isStudent) {
      this.loadDropdowns();
      this.loadStats();
    }
    this.loadList();
    this.subs.add(
      this.header.searchQuery$
        .pipe(skip(1), distinctUntilChanged(), debounceTime(300))
        .subscribe((q) => {
          this.searchQuery = q;
          this.loadList();
        }),
    );
    if (!this.isStudent) {
      this.subs.add(
        this.header.filterClick$.subscribe(() => {
          this.filterOpen = true;
        }),
      );
    }
  }

  ngOnDestroy(): void {
    this.studentLoadSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  loadDropdowns(): void {
    this.classService.getClassDropdown('group').subscribe({
      next: (groups) => (this.classGroups = groups || []),
    });
    this.classService.getClassDropdown().subscribe({
      next: (sections) => (this.allSections = sections || []),
    });
  }

  onClassGroupChange(groupId: string): void {
    this.classGroupFilter = groupId ?? '';
    this.sectionFilterIds = [];
    this.subjectFilterIds = [];
    this.sections = [];
    this.groupSubjects = [];

    if (!this.classGroupFilter) return;

    this.loadSectionsForGroup(this.classGroupFilter);
    this.classService.getClassGroupSubjects(this.classGroupFilter).subscribe({
      next: (subjects) => (this.groupSubjects = subjects || []),
      error: () => (this.groupSubjects = []),
    });
  }

  loadStats(): void {
    this.homeworkService.getStats().subscribe({
      next: (s) => {
        const raw = s as unknown as Record<string, unknown>;
        this.stats = {
          totalAssigned: Number(raw['totalAssigned'] ?? raw['TotalAssigned'] ?? 0),
          dueToday: Number(raw['dueToday'] ?? raw['DueToday'] ?? 0),
          totalSubmissions: Number(raw['totalSubmissions'] ?? raw['TotalSubmissions'] ?? 0),
          overdue: Number(raw['overdue'] ?? raw['Overdue'] ?? 0),
        };
      },
    });
  }

  loadList(): void {
    if (this.isStudent) {
      this.loadStudentList(true);
      return;
    }

    this.loading = true;
    const status = this.chipFilter === 'all' ? undefined : this.chipFilter;
    const effectiveClassIds = this.resolveEffectiveClassIds();
    const effectiveSubjectIds = this.resolveEffectiveSubjectIds();

    const apiClassId = effectiveClassIds?.length === 1 ? effectiveClassIds[0] : undefined;
    const apiSubjectId = effectiveSubjectIds?.length === 1 ? effectiveSubjectIds[0] : undefined;

    this.homeworkService
      .getList(apiClassId, apiSubjectId, status, this.searchQuery || undefined)
      .subscribe({
        next: (list) => {
          let items = (list || []).map((item) => this.normalizeListItem(item));
          if (effectiveClassIds !== null) {
            const allowed = new Set(effectiveClassIds);
            items = items.filter((item) => allowed.has(item.classId));
          }
          if (effectiveSubjectIds !== null) {
            const allowed = new Set(effectiveSubjectIds);
            items = items.filter((item) => allowed.has(item.subjectId));
          }
          this.items = items;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          void this.showToast('Failed to load homework');
        },
      });
  }

  onStudentTabChange(value: string): void {
    this.studentTab = value || 'all';
    this.loadStudentList(true);
  }

  onStudentInfinite(ev: CustomEvent): void {
    if (!this.studentHasMore || this.studentLoadingMore) {
      (ev.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
    this.studentPageIndex += 1;
    this.loadStudentList(false, () => (ev.target as HTMLIonInfiniteScrollElement).complete());
  }

  private loadStudentList(reset: boolean, done?: () => void): void {
    if (reset) {
      this.studentPageIndex = 1;
      this.studentHasMore = true;
      this.loading = true;
      this.studentItems = [];
      this.studentLoadSub?.unsubscribe();
    } else {
      this.studentLoadingMore = true;
    }

    const status = this.studentTab === 'all' ? undefined : this.studentTab;
    this.studentLoadSub = this.homeworkService
      .getMyList(status, this.searchQuery || undefined, this.studentPageIndex, this.studentPageSize)
      .subscribe({
        next: (page) => {
          const rows = page.items || [];
          this.studentItems = reset ? rows : [...this.studentItems, ...rows];
          if (!this.studentClassLabel) {
            this.studentClassLabel = this.studentItems[0]?.className?.trim() || '';
          }
          this.studentHasMore = page.pageIndex < page.totalPages;
          this.loading = false;
          this.studentLoadingMore = false;
          done?.();
        },
        error: () => {
          this.loading = false;
          this.studentLoadingMore = false;
          if (reset) this.studentItems = [];
          void this.showToast('Failed to load homework');
          done?.();
        },
      });
  }

  onRefresh(event: CustomEvent): void {
    if (!this.isStudent) this.loadStats();
    if (this.isStudent) {
      this.loadStudentList(true, () => (event.target as HTMLIonRefresherElement).complete());
      return;
    }
    this.loadList();
    (event.target as HTMLIonRefresherElement).complete();
  }

  applyFilters(): void {
    this.filterOpen = false;
    this.loadList();
  }

  clearFilters(): void {
    this.classGroupFilter = '';
    this.sectionFilterIds = [];
    this.subjectFilterIds = [];
    this.sections = [];
    this.groupSubjects = [];
    this.chipFilter = 'all';
    this.loadList();
  }

  openCreate(): void {
    void this.router.navigate(['/homework/new']);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/homework', id]);
  }

  formatDue(iso: string): string {
    if (!iso) return '';
    const day = iso.includes('T') ? iso.slice(0, 10) : iso;
    return formatDisplayDate(day);
  }

  stampLabel(status: string): string {
    if (status === 'submitted' || status === 'late') return 'Submitted';
    if (status === 'overdue') return 'Overdue';
    return 'Pending';
  }

  private loadSectionsForGroup(classGroupId: string): void {
    this.classService.getSectionsByClassGroup(classGroupId).subscribe({
      next: (sections) => {
        this.sections = sections || [];
        if (!this.sections.length) {
          this.sections = this.sectionsFromNameFallback(classGroupId);
        }
      },
      error: () => {
        this.sections = this.sectionsFromNameFallback(classGroupId);
      },
    });
  }

  private sectionsFromNameFallback(classGroupId: string): ClassDropdownItem[] {
    const groupName = this.classGroups.find((g) => g.id === classGroupId)?.name?.trim();
    if (!groupName) return [];
    const prefix = `${groupName} - `;
    return this.allSections.filter((s) => (s.name || '').startsWith(prefix));
  }

  private sectionChipLabel(section: ClassDropdownItem): string {
    const name = section.name || '';
    const idx = name.lastIndexOf(' - ');
    return idx >= 0 ? name.slice(idx + 3) : name;
  }

  private resolveEffectiveClassIds(): string[] | null {
    if (!this.classGroupFilter) return null;
    if (!this.sections.length) return [];
    if (!this.sectionFilterIds.length || this.sectionFilterIds.length >= this.sections.length) {
      return this.sections.map((s) => s.id);
    }
    return [...this.sectionFilterIds];
  }

  private resolveEffectiveSubjectIds(): string[] | null {
    if (!this.classGroupFilter) return null;
    if (!this.groupSubjects.length) return null;
    if (
      !this.subjectFilterIds.length ||
      this.subjectFilterIds.length >= this.groupSubjects.length
    ) {
      return null;
    }
    return [...this.subjectFilterIds];
  }

  progressPct(item: HomeworkListItem): number {
    return item.total ? Math.min(100, Math.round((item.submitted / item.total) * 100)) : 0;
  }

  private normalizeListItem(raw: HomeworkListItem | Record<string, unknown>): HomeworkListItem {
    const r = raw as Record<string, unknown>;
    return {
      id: pickStr(r, 'id', 'Id'),
      title: pickStr(r, 'title', 'Title'),
      description: (r['description'] ?? r['Description']) as string | null,
      classId: pickStr(r, 'classId', 'ClassId'),
      className: pickStr(r, 'className', 'ClassName'),
      subjectId: pickStr(r, 'subjectId', 'SubjectId'),
      subjectName: pickStr(r, 'subjectName', 'SubjectName'),
      assignDate: pickStr(r, 'assignDate', 'AssignDate'),
      dueDate: pickStr(r, 'dueDate', 'DueDate'),
      priority: Number(r['priority'] ?? r['Priority'] ?? 0),
      priorityLabel: pickStr(r, 'priorityLabel', 'PriorityLabel') || 'Normal',
      marks: (r['marks'] ?? r['Marks']) as number | null,
      submissionType: Number(r['submissionType'] ?? r['SubmissionType'] ?? 0),
      submissionTypeLabel: pickStr(r, 'submissionTypeLabel', 'SubmissionTypeLabel'),
      status: pickStr(r, 'status', 'Status') || 'active',
      submitted: Number(r['submitted'] ?? r['Submitted'] ?? 0),
      pending: Number(r['pending'] ?? r['Pending'] ?? 0),
      late: Number(r['late'] ?? r['Late'] ?? 0),
      total: Number(r['total'] ?? r['Total'] ?? 0),
    };
  }

  private showToast(message: string): void {
    void this.toast.error(message);
  }
}
