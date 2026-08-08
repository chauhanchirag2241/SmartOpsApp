import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonIcon,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  createOutline,
  hourglass,
  trashOutline,
  warning,
} from 'ionicons/icons';
import {
  HomeworkDetail,
  HomeworkSubmissionStatus,
  StudentHomeworkItem,
  StudentHomeworkSubmissionItem,
} from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { HomeworkService } from '../../core/services/homework.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { formatDisplayDate, localDateString, normalizeHomeworkStatus } from '../../core/utils/api-mapper.util';
import { resolveHomeUserType } from '../home/home-dashboard.config';

interface StudentRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  status: HomeworkSubmissionStatus;
  submittedOn: string;
  marks: number | null;
  remark: string;
}

@Component({
  selector: 'app-homework-detail',
  templateUrl: './homework-detail.page.html',
  styleUrls: ['./homework-detail.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    SoDateInputComponent,
    SoIconComponent,
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonFooter,
    IonIcon,
    IonInput,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
})
export class HomeworkDetailPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly homeworkService = inject(HomeworkService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AlertController);
  private readonly auth = inject(AuthService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);
  private readonly header = inject(AppHeaderService);
  private subs = new Subscription();
  headerSearch = '';
  readonly saveIcon = SoIcons.save;
  readonly isStudent = resolveHomeUserType(this.auth.currentUser) === 'student';

  HomeworkSubmissionStatus = HomeworkSubmissionStatus;
  readonly studentFilterOptions = ['all', 'submitted', 'pending', 'late'] as const;

  homeworkId = '';
  detail: HomeworkDetail | null = null;
  studentDetail: StudentHomeworkItem | null = null;
  studentRows: StudentRow[] = [];
  filteredStudents: StudentRow[] = [];
  studentFilter = 'all';
  filterOpen = false;
  progressPct = 0;
  loading = false;
  isSubmitting = false;
  loadError = '';

  constructor() {
    addIcons({ createOutline, trashOutline, checkmarkCircle, hourglass, warning });
  }

  filterLabel(filter: string): string {
    if (filter === 'all') return 'All';
    return filter.charAt(0).toUpperCase() + filter.slice(1);
  }

  statusLabel(status: HomeworkSubmissionStatus): string {
    if (status === HomeworkSubmissionStatus.Submitted) return 'Submitted';
    if (status === HomeworkSubmissionStatus.Late) return 'Late';
    return 'Pending';
  }

  statusBadgeClass(status: HomeworkSubmissionStatus): string {
    if (status === HomeworkSubmissionStatus.Submitted) return 'submitted';
    if (status === HomeworkSubmissionStatus.Late) return 'late';
    return 'pending';
  }

  get canEdit(): boolean {
    if (this.isStudent) return false;
    return !this.ayContext.isReadOnlyScope() && this.permissions.canEdit(MenuCodes.Homework);
  }

  get canDelete(): boolean {
    if (this.isStudent) return false;
    return !this.ayContext.isReadOnlyScope() && this.permissions.canDelete(MenuCodes.Homework);
  }

  get isSubmissionsSubmitted(): boolean {
    return !!this.detail?.isSubmissionsSubmitted;
  }

  ngOnInit(): void {
    if (!this.isStudent) {
      this.subs.add(
        this.header.searchQuery$.subscribe((q) => {
          this.headerSearch = q.trim().toLowerCase();
          this.applyFilter();
        }),
      );
      this.subs.add(
        this.header.filterClick$.subscribe(() => {
          this.filterOpen = true;
        }),
      );
    }
    this.route.paramMap.subscribe((params) => {
      const id = (params.get('id') ?? '').trim();
      if (!id) {
        void this.router.navigate(['/homework']);
        return;
      }
      this.homeworkId = id;
      this.loadDetail();
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadDetail(): void {
    this.loading = true;
    this.loadError = '';
    if (this.isStudent) {
      this.homeworkService.getMyById(this.homeworkId).subscribe({
        next: (item) => {
          this.studentDetail = item;
          this.detail = null;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.loadError = getUserFacingApiError(err, 'Failed to load');
        },
      });
      return;
    }

    this.homeworkService.getById(this.homeworkId).subscribe({
      next: (d) => {
        const raw = d as unknown as Record<string, unknown>;
        this.detail = {
          id: String(raw['id'] ?? raw['Id'] ?? ''),
          title: String(raw['title'] ?? raw['Title'] ?? ''),
          description: (raw['description'] ?? raw['Description']) as string | null,
          classId: String(raw['classId'] ?? raw['ClassId'] ?? ''),
          className: String(raw['className'] ?? raw['ClassName'] ?? ''),
          subjectId: String(raw['subjectId'] ?? raw['SubjectId'] ?? ''),
          subjectName: String(raw['subjectName'] ?? raw['SubjectName'] ?? ''),
          assignDate: String(raw['assignDate'] ?? raw['AssignDate'] ?? ''),
          dueDate: String(raw['dueDate'] ?? raw['DueDate'] ?? ''),
          priority: Number(raw['priority'] ?? raw['Priority'] ?? 0),
          priorityLabel: String(raw['priorityLabel'] ?? raw['PriorityLabel'] ?? ''),
          marks: (raw['marks'] ?? raw['Marks']) as number | null,
          submissionType: Number(raw['submissionType'] ?? raw['SubmissionType'] ?? 0),
          submissionTypeLabel: String(raw['submissionTypeLabel'] ?? raw['SubmissionTypeLabel'] ?? ''),
          status: String(raw['status'] ?? raw['Status'] ?? ''),
          submitted: Number(raw['submitted'] ?? raw['Submitted'] ?? 0),
          pending: Number(raw['pending'] ?? raw['Pending'] ?? 0),
          late: Number(raw['late'] ?? raw['Late'] ?? 0),
          total: Number(raw['total'] ?? raw['Total'] ?? 0),
          isSubmissionsSubmitted: !!(raw['isSubmissionsSubmitted'] ?? raw['IsSubmissionsSubmitted']),
          students: [],
        };
        const students = (raw['students'] ?? raw['Students'] ?? []) as Record<string, unknown>[];
        this.studentRows = students.map((s) => ({
          studentId: String(s['studentId'] ?? s['StudentId'] ?? ''),
          studentName: String(s['studentName'] ?? s['StudentName'] ?? ''),
          rollNo: String(s['rollNo'] ?? s['RollNo'] ?? ''),
          status: normalizeHomeworkStatus(s['status'] ?? s['Status']),
          submittedOn: String(s['submittedOn'] ?? s['SubmittedOn'] ?? '').slice(0, 10),
          marks: (s['marks'] ?? s['Marks']) as number | null,
          remark: String(s['remark'] ?? s['Remark'] ?? ''),
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = getUserFacingApiError(err, 'Failed to load');
      },
    });
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const day = iso.includes('T') ? iso.slice(0, 10) : iso;
    return formatDisplayDate(day);
  }

  studentStatusBanner(): string {
    const d = this.studentDetail;
    if (!d) return '';
    const due = this.formatDate(d.dueDate);
    if (d.myStatus === 'submitted' || d.myStatus === 'late') {
      return d.myStatus === 'late' ? `Submitted late · due was ${due}` : 'Submitted';
    }
    if (d.myStatus === 'overdue') return `Overdue · was due ${due}`;
    return `Pending · due ${due}`;
  }

  setStudentFilter(f: string): void {
    this.studentFilter = f;
    this.applyFilter();
  }

  clearFilters(): void {
    this.studentFilter = 'all';
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.headerSearch;
    this.filteredStudents = this.studentRows.filter((s) => {
      const matchesSearch =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (this.studentFilter === 'all') return true;
      if (this.studentFilter === 'submitted') return s.status === HomeworkSubmissionStatus.Submitted;
      if (this.studentFilter === 'pending') return s.status === HomeworkSubmissionStatus.Pending;
      if (this.studentFilter === 'late') return s.status === HomeworkSubmissionStatus.Late;
      return true;
    });
    const total = this.studentRows.length;
    const submitted = this.studentRows.filter((s) => s.status === HomeworkSubmissionStatus.Submitted).length;
    this.progressPct = total ? Math.round((submitted / total) * 100) : 0;
    if (this.detail) {
      this.detail = {
        ...this.detail,
        submitted,
        pending: this.studentRows.filter((s) => s.status === HomeworkSubmissionStatus.Pending).length,
        late: this.studentRows.filter((s) => s.status === HomeworkSubmissionStatus.Late).length,
        total,
      };
    }
  }

  setStudentStatus(studentId: string, value: HomeworkSubmissionStatus | string): void {
    if (!this.canEdit) return;
    const status = Number(value) as HomeworkSubmissionStatus;
    this.studentRows = this.studentRows.map((row) => {
      if (row.studentId !== studentId) return row;
      if (status === HomeworkSubmissionStatus.Submitted || status === HomeworkSubmissionStatus.Late) {
        return {
          ...row,
          status,
          submittedOn: row.submittedOn || localDateString(),
        };
      }
      return { ...row, status, submittedOn: '', marks: null, remark: '' };
    });
    this.applyFilter();
  }

  isStudentStatus(row: StudentRow, status: HomeworkSubmissionStatus): boolean {
    return row.status === status;
  }

  buildPayload(): StudentHomeworkSubmissionItem[] {
    return this.studentRows.map((s) => ({
      studentId: s.studentId,
      status: s.status,
      submittedOn:
        s.status === HomeworkSubmissionStatus.Submitted || s.status === HomeworkSubmissionStatus.Late
          ? s.submittedOn || localDateString()
          : null,
      marks: s.marks,
      remark: s.remark?.trim() || null,
    }));
  }

  get maxMarks(): number | null {
    const marks = this.detail?.marks;
    return marks != null && Number(marks) > 0 ? Number(marks) : null;
  }

  onMarksChange(row: StudentRow, value: number | string | null): void {
    const parsed = value === '' || value == null ? null : Number(value);
    if (parsed == null || Number.isNaN(parsed)) {
      row.marks = null;
      return;
    }
    const max = this.maxMarks;
    if (parsed < 0) {
      row.marks = 0;
      return;
    }
    row.marks = max != null && parsed > max ? max : parsed;
  }

  private validateMarksAgainstHomeworkMax(): string | null {
    const max = this.maxMarks;
    for (const row of this.studentRows) {
      if (row.marks == null || row.marks === ('' as unknown as number)) continue;
      const marks = Number(row.marks);
      if (Number.isNaN(marks)) continue;
      if (marks < 0) return 'Marks cannot be negative.';
      if (max != null && marks > max) {
        return `Marks cannot exceed homework maximum (${max}).`;
      }
    }
    return null;
  }

  submitOrUpdate(): void {
    if (!this.canEdit || !this.homeworkId) return;
    const marksError = this.validateMarksAgainstHomeworkMax();
    if (marksError) {
      void this.showToast(marksError);
      return;
    }
    this.isSubmitting = true;
    const payload = this.buildPayload();
    const call = this.isSubmissionsSubmitted
      ? this.homeworkService.updateSubmissions(this.homeworkId, payload)
      : this.homeworkService.submitSubmissions(this.homeworkId, payload);

    call.subscribe({
      next: () => {
        this.isSubmitting = false;
        void this.showToast(this.isSubmissionsSubmitted ? 'Submissions updated' : 'Submissions saved');
        this.loadDetail();
      },
      error: (err) => {
        this.isSubmitting = false;
        void this.showToast(getUserFacingApiError(err, 'Save failed'));
      },
    });
  }

  editHomework(): void {
    void this.router.navigate(['/homework', this.homeworkId, 'edit']);
  }

  async deleteHomework(): Promise<void> {
    const a = await this.alert.create({
      header: 'Delete homework',
      message: 'This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.homeworkService.delete(this.homeworkId).subscribe({
              next: () => {
                void this.showToast('Deleted');
                void this.router.navigate(['/homework']);
              },
              error: () => void this.showToast('Delete failed'),
            });
          },
        },
      ],
    });
    await a.present();
  }

  private showToast(message: string): void {
    const lower = message.toLowerCase();
    if (lower.includes('fail') || lower.includes('error')) {
      void this.toast.error(message);
      return;
    }
    if (lower.includes('saved') || lower.includes('updated') || lower.includes('deleted')) {
      void this.toast.success(message);
      return;
    }
    void this.toast.show(message);
  }
}
