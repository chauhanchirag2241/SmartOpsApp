import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import {
  HomeworkDetail,
  HomeworkSubmissionStatus,
  StudentHomeworkSubmissionItem,
} from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { HomeworkService } from '../../core/services/homework.service';
import { localDateString, normalizeHomeworkStatus } from '../../core/utils/api-mapper.util';

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
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class HomeworkDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly homeworkService = inject(HomeworkService);
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  HomeworkSubmissionStatus = HomeworkSubmissionStatus;

  homeworkId = '';
  detail: HomeworkDetail | null = null;
  studentRows: StudentRow[] = [];
  filteredStudents: StudentRow[] = [];
  studentFilter = 'all';
  progressPct = 0;
  loading = false;
  isSubmitting = false;
  loadError = '';

  constructor() {
    addIcons({ createOutline, trashOutline });
  }

  get canEdit(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canEdit(MenuCodes.Homework);
  }

  get canDelete(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canDelete(MenuCodes.Homework);
  }

  get isSubmissionsSubmitted(): boolean {
    return !!this.detail?.isSubmissionsSubmitted;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = (params.get('id') ?? '').trim();
      if (!id) {
        void this.router.navigate(['/tabs/homework']);
        return;
      }
      this.homeworkId = id;
      this.loadDetail();
    });
  }

  loadDetail(): void {
    this.loading = true;
    this.loadError = '';
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
        this.loadError = typeof err?.error === 'string' ? err.error : 'Failed to load';
      },
    });
  }

  setStudentFilter(f: string): void {
    this.studentFilter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredStudents = this.studentRows.filter((s) => {
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

  setStudentStatus(studentId: string, status: HomeworkSubmissionStatus): void {
    if (!this.canEdit) return;
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

  submitOrUpdate(): void {
    if (!this.canEdit || !this.homeworkId) return;
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
        void this.showToast(typeof err?.error === 'string' ? err.error : 'Save failed');
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
                void this.router.navigate(['/tabs/homework']);
              },
              error: () => void this.showToast('Delete failed'),
            });
          },
        },
      ],
    });
    await a.present();
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
