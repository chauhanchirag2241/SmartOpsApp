import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline, schoolOutline } from 'ionicons/icons';
import { HomeworkListItem, HomeworkStats } from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { HomeworkService } from '../../core/services/homework.service';
import { SubjectDropdownItem, SubjectService } from '../../core/services/subject.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { pickStr } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-homework-list',
  templateUrl: './homework-list.page.html',
  styleUrls: ['./homework-list.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class HomeworkListPage implements OnInit, OnDestroy {
  private readonly homeworkService = inject(HomeworkService);
  private readonly header = inject(AppHeaderService);
  private subs = new Subscription();
  private readonly classService = inject(ClassService);
  private readonly subjectService = inject(SubjectService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  items: HomeworkListItem[] = [];
  classes: ClassDropdownItem[] = [];
  subjects: SubjectDropdownItem[] = [];
  stats: HomeworkStats = { totalAssigned: 0, dueToday: 0, totalSubmissions: 0, overdue: 0 };

  classFilter = '';
  subjectFilter = '';
  chipFilter = 'all';
  filterOpen = false;
  searchQuery = '';
  loading = false;

  readonly chipOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'today', label: 'Due today' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'done', label: 'Done' },
  ];

  constructor() {
    addIcons({ addOutline, calendarOutline, schoolOutline });
  }

  get canManage(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.Homework);
  }

  get classFilterLabel(): string {
    if (!this.classFilter) return 'All classes';
    return this.classes.find((c) => c.id === this.classFilter)?.name ?? 'Class';
  }

  get subjectFilterLabel(): string {
    if (!this.subjectFilter) return 'All subjects';
    const s = this.subjects.find((x) => x.id === this.subjectFilter);
    return s ? this.subjectLabel(s) : 'Subject';
  }

  get chipFilterLabel(): string {
    return this.chipOptions.find((c) => c.value === this.chipFilter)?.label ?? this.chipFilter;
  }

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadStats();
    this.loadList();
    this.subs.add(
      this.header.searchQuery$.subscribe((q) => {
        this.searchQuery = q;
        this.loadList();
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

  loadDropdowns(): void {
    this.classService.getClassDropdown().subscribe({
      next: (c) => (this.classes = c || []),
    });
    this.subjectService.getSubjectDropdown().subscribe({
      next: (s) => (this.subjects = s || []),
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
    this.loading = true;
    const status = this.chipFilter === 'all' ? undefined : this.chipFilter;
    this.homeworkService
      .getList(this.classFilter || undefined, this.subjectFilter || undefined, status, this.searchQuery || undefined)
      .subscribe({
        next: (list) => {
          this.items = (list || []).map((item) => this.normalizeListItem(item));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          void this.showToast('Failed to load homework');
        },
      });
  }

  onRefresh(event: CustomEvent): void {
    this.loadStats();
    this.loadList();
    (event.target as HTMLIonRefresherElement).complete();
  }

  setChip(filter: string): void {
    this.chipFilter = filter;
    this.loadList();
  }

  applyFilters(): void {
    this.filterOpen = false;
    this.loadList();
  }

  clearFilters(): void {
    this.classFilter = '';
    this.subjectFilter = '';
    this.chipFilter = 'all';
    this.loadList();
  }

  openCreate(): void {
    void this.router.navigate(['/homework/new']);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/homework', id]);
  }

  subjectLabel(s: SubjectDropdownItem): string {
    return s.subjectName || s.name || '';
  }

  statusClass(status: string): string {
    return `status-${status}`;
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

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
