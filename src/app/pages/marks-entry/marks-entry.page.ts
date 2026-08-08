import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, createOutline } from 'ionicons/icons';
import { Subscription, debounceTime, distinctUntilChanged, skip } from 'rxjs';
import {
  ExamListItem,
  ExamMarksGrid,
  ExamSubjectProgress,
} from '../../core/models/exam.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ExamService } from '../../core/services/exam.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';

interface MarkCell {
  componentId: string;
  value: number | null;
}

interface StudentMarksDraft {
  studentId: string;
  studentName: string;
  rollNo: string;
  isAbsent: boolean;
  remark: string;
  cells: MarkCell[];
}

@Component({
  selector: 'app-marks-entry',
  templateUrl: './marks-entry.page.html',
  styleUrls: ['./marks-entry.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoSelectComponent,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonIcon,
  ],
})
export class MarksEntryPage implements OnInit, OnDestroy {
  private readonly examService = inject(ExamService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  private readonly alert = inject(AlertController);
  private readonly header = inject(AppHeaderService);
  readonly ayContext = inject(AcademicYearContextService);
  private subs = new Subscription();

  exams: ExamListItem[] = [];
  examId = '';
  classId = '';
  /** When opened from exam list, exam is locked (no Exam filter). */
  examLocked = false;
  subjectProgress: ExamSubjectProgress[] = [];
  selectedScheduleId = '';
  grid: ExamMarksGrid | null = null;
  rows: StudentMarksDraft[] = [];
  searchQuery = '';
  openRemarkIds = new Set<string>();

  loadingExams = false;
  loadingSubjects = false;
  loadingGrid = false;
  saving = false;
  dirty = false;

  constructor() {
    addIcons({ checkmarkCircleOutline, createOutline });
  }

  get canEdit(): boolean {
    if (this.ayContext.isReadOnlyScope()) return false;
    return (
      this.permissions.canAdd(MenuCodes.ExamMarksEntry) ||
      this.permissions.canEdit(MenuCodes.ExamMarksEntry)
    );
  }

  get selectedExam(): ExamListItem | undefined {
    return this.exams.find((e) => e.id === this.examId);
  }

  get examLabel(): string {
    const e = this.selectedExam;
    if (!e) return '—';
    return `${e.name} (${e.examGroupName || e.examType})`;
  }

  get classOptions(): SoSelectOption[] {
    return (this.selectedExam?.classes ?? []).map((c) => ({
      label: c.className,
      value: c.classId,
    }));
  }

  get maxTotal(): number {
    return (this.grid?.components ?? []).reduce((sum, c) => sum + (c.maxMarks || 0), 0);
  }

  get filteredRows(): StudentMarksDraft[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        String(r.rollNo || '').toLowerCase().includes(q),
    );
  }

  get enteredCount(): number {
    return this.rows.filter((r) => r.isAbsent || this.total(r) !== null).length;
  }

  ngOnInit(): void {
    const examId = String(this.route.snapshot.queryParamMap.get('examId') ?? '').trim();
    const classId = String(this.route.snapshot.queryParamMap.get('classId') ?? '').trim();
    this.examLocked = !!examId;
    this.loadExams(examId, classId);

    // Header search filters students by roll / name (client-side).
    this.subs.add(
      this.header.searchQuery$
        .pipe(skip(1), distinctUntilChanged(), debounceTime(200))
        .subscribe((q) => {
          this.searchQuery = q;
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onRefresh(event: CustomEvent): void {
    const done = () => (event.target as HTMLIonRefresherElement).complete();
    if (this.selectedScheduleId) {
      this.loadGrid(done);
      return;
    }
    if (this.examId && this.classId) {
      this.loadSubjects(done);
      return;
    }
    this.loadExams(this.examId, this.classId, done);
  }

  onClassChange(): void {
    this.resetGrid();
    if (this.examId && this.classId) {
      this.loadSubjects();
    }
  }

  async selectSubject(subject: ExamSubjectProgress): Promise<void> {
    if (subject.examScheduleId === this.selectedScheduleId) return;
    if (this.dirty) {
      const a = await this.alert.create({
        header: 'Discard unsaved marks?',
        message: 'You have unsaved changes for the current subject.',
        buttons: [
          { text: 'Stay', role: 'cancel' },
          {
            text: 'Discard',
            role: 'destructive',
            handler: () => {
              this.selectedScheduleId = subject.examScheduleId;
              this.loadGrid();
            },
          },
        ],
      });
      await a.present();
      return;
    }
    this.selectedScheduleId = subject.examScheduleId;
    this.loadGrid();
  }

  markDirty(): void {
    this.dirty = true;
  }

  toggleAbsent(row: StudentMarksDraft): void {
    if (row.isAbsent) {
      row.cells.forEach((cell) => (cell.value = null));
    }
    this.dirty = true;
  }

  onMarkInput(row: StudentMarksDraft, index: number, raw: string): void {
    const max = this.grid?.components?.[index]?.maxMarks ?? 0;
    if (raw === '' || raw === null || raw === undefined) {
      row.cells[index].value = null;
    } else {
      let n = Number(raw);
      if (Number.isNaN(n)) n = 0;
      n = Math.max(0, Math.min(n, max));
      row.cells[index].value = n;
    }
    this.dirty = true;
  }

  isOverMax(row: StudentMarksDraft, index: number): boolean {
    const max = this.grid?.components?.[index]?.maxMarks ?? 0;
    const value = row.cells[index]?.value;
    return value !== null && value !== undefined && (value < 0 || value > max);
  }

  total(row: StudentMarksDraft): number | null {
    if (row.isAbsent) return null;
    if (row.cells.every((c) => c.value === null || c.value === undefined)) return null;
    return row.cells.reduce((sum, c) => sum + (c.value ?? 0), 0);
  }

  percent(row: StudentMarksDraft): number | null {
    const total = this.total(row);
    if (total === null || this.maxTotal === 0) return null;
    return Math.round((total / this.maxTotal) * 1000) / 10;
  }

  resultKey(row: StudentMarksDraft): 'absent' | 'pending' | 'pass' | 'fail' {
    if (row.isAbsent) return 'absent';
    const pct = this.percent(row);
    if (pct === null || !this.grid) return 'pending';
    for (let i = 0; i < row.cells.length; i++) {
      const passing = this.grid.components[i]?.passingMarks;
      if (passing !== null && passing !== undefined && (row.cells[i].value ?? 0) < passing) {
        return 'fail';
      }
    }
    return pct >= this.grid.minPassPercent ? 'pass' : 'fail';
  }

  resultLabel(row: StudentMarksDraft): string {
    const key = this.resultKey(row);
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  initials(name: string): string {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  toggleRemark(studentId: string): void {
    const next = new Set(this.openRemarkIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    this.openRemarkIds = next;
  }

  isRemarkOpen(studentId: string): boolean {
    return this.openRemarkIds.has(studentId);
  }

  save(): void {
    if (!this.canEdit) {
      void this.toast.error('You do not have permission to save marks.');
      return;
    }
    if (!this.grid) return;

    for (const row of this.rows) {
      for (let i = 0; i < row.cells.length; i++) {
        if (this.isOverMax(row, i)) {
          void this.toast.error(
            `${row.studentName}: marks exceed max for ${this.grid.components[i].name}`,
          );
          return;
        }
      }
    }

    const payload = {
      examScheduleId: this.grid.examScheduleId,
      students: this.rows.map((row) => ({
        studentId: row.studentId,
        isAbsent: row.isAbsent,
        remark: row.remark.trim() || null,
        marks: row.cells.map((cell) => ({
          componentId: cell.componentId,
          marksObtained: row.isAbsent ? null : cell.value,
        })),
      })),
    };

    this.saving = true;
    // Shared with SmartOpsUI — used by web and mobile. POST /api/exam-marks/save
    this.examService.saveMarks(payload).subscribe({
      next: () => {
        this.saving = false;
        this.dirty = false;
        void this.toast.success(`Marks saved for ${this.grid?.subjectName ?? 'subject'}`);
        this.refreshProgress();
      },
      error: (err) => {
        this.saving = false;
        void this.toast.error(getUserFacingApiError(err, 'Failed to save marks'));
      },
    });
  }

  private loadExams(preferredExamId?: string, preferredClassId?: string, done?: () => void): void {
    this.loadingExams = true;
    // Shared with SmartOpsUI — used by web and mobile. GET /api/exams
    this.examService.getExams({ inactiveOnly: false }).subscribe({
      next: (rows) => {
        this.exams = (rows ?? []).filter((e) => e.isActive !== false);
        this.loadingExams = false;
        if (preferredExamId && this.exams.some((e) => e.id === preferredExamId)) {
          this.examId = preferredExamId;
        } else if (!this.examId && this.exams.length) {
          this.examId = this.exams[0].id;
        }
        const classes = this.selectedExam?.classes ?? [];
        if (preferredClassId && classes.some((c) => c.classId === preferredClassId)) {
          this.classId = preferredClassId;
        } else {
          this.classId = classes[0]?.classId ?? '';
        }
        if (this.examId && this.classId) {
          this.loadSubjects(done);
        } else {
          done?.();
        }
      },
      error: () => {
        this.loadingExams = false;
        void this.toast.error('Failed to load exams');
        done?.();
      },
    });
  }

  private loadSubjects(done?: () => void): void {
    this.loadingSubjects = true;
    this.subjectProgress = [];
    this.selectedScheduleId = '';
    this.grid = null;
    this.rows = [];
    // Shared with SmartOpsUI — used by web and mobile. GET /api/exam-marks/subject-progress
    this.examService.getSubjectProgress(this.examId, this.classId).subscribe({
      next: (progress) => {
        this.subjectProgress = progress ?? [];
        this.loadingSubjects = false;
        if (this.subjectProgress.length) {
          this.selectedScheduleId = this.subjectProgress[0].examScheduleId;
          this.loadGrid(done);
        } else {
          done?.();
        }
      },
      error: () => {
        this.loadingSubjects = false;
        void this.toast.error('Failed to load subjects for this exam/class');
        done?.();
      },
    });
  }

  private loadGrid(done?: () => void): void {
    if (!this.selectedScheduleId) {
      done?.();
      return;
    }
    this.loadingGrid = true;
    this.openRemarkIds = new Set();
    // Shared with SmartOpsUI — used by web and mobile. GET /api/exam-marks/grid/{scheduleId}
    this.examService.getMarksGrid(this.selectedScheduleId).subscribe({
      next: (grid) => {
        this.grid = grid;
        this.rows = (grid.students ?? []).map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          rollNo: s.rollNo,
          isAbsent: s.isAbsent,
          remark: s.remark ?? '',
          cells: (grid.components ?? []).map((c) => ({
            componentId: String(c.id ?? ''),
            value: s.marks?.find((m) => m.componentId === c.id)?.marksObtained ?? null,
          })),
        }));
        this.dirty = false;
        this.loadingGrid = false;
        done?.();
      },
      error: () => {
        this.loadingGrid = false;
        this.grid = null;
        this.rows = [];
        void this.toast.error('Failed to load marks grid');
        done?.();
      },
    });
  }

  private refreshProgress(): void {
    this.examService.getSubjectProgress(this.examId, this.classId).subscribe({
      next: (progress) => {
        this.subjectProgress = progress ?? [];
      },
    });
  }

  private resetGrid(): void {
    this.subjectProgress = [];
    this.selectedScheduleId = '';
    this.grid = null;
    this.rows = [];
    this.dirty = false;
    this.openRemarkIds = new Set();
  }
}
