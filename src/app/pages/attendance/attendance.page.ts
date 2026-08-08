import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  chevronDownOutline,
  closeOutline,
  documentTextOutline,
  refreshOutline,
  schoolOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  AttendanceStatus,
  AttendanceStatusKey,
} from '../../core/models/attendance.model';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { StudentService } from '../../core/services/student.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';
import { SoIcons } from '../../shared/icons/so-icons';
import {
  attendanceStatusToApi,
  formatDisplayDate,
  localDateString,
  parseAttendanceStatusFromApi,
} from '../../core/utils/api-mapper.util';

interface StudentRow {
  id: string;
  roll: string;
  name: string;
}

type StatusFilter = 'all' | AttendanceStatusKey | 'unmarked';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    SoDateInputComponent,
    SoIconComponent,
    SoSelectComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonModal,
    IonTextarea,
  ],
})
export class AttendancePage implements OnInit, OnDestroy {
  private readonly classService = inject(ClassService);
  private readonly header = inject(AppHeaderService);
  private subs = new Subscription();
  private readonly studentService = inject(StudentService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly ayContext = inject(AcademicYearContextService);
  readonly saveIcon = SoIcons.save;

  classes: ClassDropdownItem[] = [];
  students: StudentRow[] = [];
  status: Record<string, AttendanceStatusKey> = {};
  notes: Record<string, string> = {};
  leaveLocked: Record<string, boolean> = {};
  private initialStatus: Record<string, AttendanceStatusKey> = {};
  private initialNotes: Record<string, string> = {};

  selectedClassId = '';
  selectedDate = localDateString();
  searchQuery = '';
  curFilter: StatusFilter = 'all';
  filterOpen = false;
  isSubmitting = false;
  isLoading = false;
  isSubmitted = false;
  submittedBannerDate = '';

  remarksOpen = false;
  remarkTargetId: string | null = null;
  tempRemark = '';

  readonly statusFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Late' },
  ];

  constructor() {
    addIcons({
      documentTextOutline,
      checkmarkCircleOutline,
      chevronDownOutline,
      closeOutline,
      refreshOutline,
      schoolOutline,
      warningOutline,
    });
  }

  /** Same as SmartOpsUI: only block when academic year is read-only. */
  get canEdit(): boolean {
    return !this.ayContext.isReadOnlyScope();
  }

  get selectedClassName(): string {
    return this.classes.find((c) => c.id === this.selectedClassId)?.name ?? 'Select class';
  }

  get classOptions(): SoSelectOption[] {
    return this.classes.map((item) => ({ value: item.id, label: item.name }));
  }

  get displaySelectedDate(): string {
    return formatDisplayDate(this.selectedDate);
  }

  get maxDate(): string {
    return localDateString();
  }

  get visibleStudents(): StudentRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.students.filter((s) => {
      const mq = !q || s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
      const st = this.status[s.id] || '';
      const mf =
        this.curFilter === 'all' ||
        st === this.curFilter ||
        (this.curFilter === 'unmarked' && st === '');
      return mq && mf;
    });
  }

  get stats() {
    const vals = this.students.map((s) => this.status[s.id] || '');
    const present = vals.filter((s) => s === 'present').length;
    const absent = vals.filter((s) => s === 'absent').length;
    const late = vals.filter((s) => s === 'late').length;
    const total = this.students.length;
    const marked = present + absent + late;
    const presentRate = total ? Math.round((present / total) * 100) : 0;
    const presentPct = total ? (present / total) * 100 : 0;
    const absentPct = total ? (absent / total) * 100 : 0;
    const latePct = total ? (late / total) * 100 : 0;
    return { total, present, absent, late, marked, presentRate, presentPct, absentPct, latePct };
  }

  get hasChanges(): boolean {
    return this.students.some(
      (s) =>
        (this.status[s.id] || '') !== (this.initialStatus[s.id] || '') ||
        (this.notes[s.id] || '') !== (this.initialNotes[s.id] || ''),
    );
  }

  ngOnInit(): void {
    this.loadClasses();
    this.subs.add(
      this.header.searchQuery$.subscribe((q) => {
        this.searchQuery = q;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.header.filterClick$.subscribe(() => {
        this.filterOpen = true;
        this.cdr.markForCheck();
      }),
    );
  }

  statusFilterLabel(filter: StatusFilter): string {
    return this.statusFilterOptions.find((o) => o.value === filter)?.label ?? filter;
  }

  clearFilters(): void {
    this.curFilter = 'all';
    if (this.classes.length) {
      this.selectedClassId = this.classes[0].id;
    }
    this.selectedDate = localDateString();
    this.searchQuery = '';
    this.header.setSearchQuery('');
    this.loadSavedAttendance();
  }

  applySheetFilters(): void {
    this.filterOpen = false;
    this.loadSavedAttendance();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadClasses(): void {
    this.classService.getClassDropdown().subscribe({
      next: (list) => {
        this.classes = (list || []).map((c) => {
          const r = c as unknown as Record<string, unknown>;
          return {
            id: String(r['id'] ?? r['Id'] ?? ''),
            name: String(r['name'] ?? r['Name'] ?? ''),
          };
        });
        if (this.classes.length) {
          this.selectedClassId = this.classes[0].id;
          this.loadSavedAttendance();
        }
        this.cdr.markForCheck();
      },
      error: () => void this.showToast('Failed to load classes'),
    });
  }

  onClassChange(): void {
    this.loadSavedAttendance();
  }

  onDateChange(): void {
    this.loadSavedAttendance();
  }

  loadSavedAttendance(): void {
    if (!this.selectedClassId || !this.selectedDate) return;
    this.isLoading = true;
    this.students = [];
    this.cdr.markForCheck();

    forkJoin({
      roster: this.studentService.getStudentsByClass(this.selectedClassId),
      attendance: this.attendanceService.getClassAttendance(this.selectedClassId, this.selectedDate),
    }).subscribe({
      next: ({ roster, attendance }) => {
        const attRaw = attendance as unknown as Record<string, unknown>;
        const attRows = (attRaw['students'] ?? attRaw['Students'] ?? []) as Record<string, unknown>[];
        const attByStudent = new Map<string, Record<string, unknown>>();
        for (const row of attRows) {
          const sid = String(row['studentId'] ?? row['StudentId'] ?? '').toLowerCase();
          if (sid) attByStudent.set(sid, row);
        }

        const rosterItems = (roster?.items ?? []) as unknown as Record<string, unknown>[];
        this.students = rosterItems
          .map((item) => this.mapRosterStudent(item))
          .filter((s) => !!s.id)
          .sort((a, b) => this.compareRoll(a.roll, b.roll));

        if (!this.students.length && attRows.length) {
          this.students = attRows
            .map((item) => ({
              id: String(item['studentId'] ?? item['StudentId'] ?? ''),
              roll: String(item['rollNo'] ?? item['RollNo'] ?? '').trim(),
              name: String(item['studentName'] ?? item['StudentName'] ?? 'Student').trim(),
            }))
            .filter((s) => !!s.id);
        }

        this.status = {};
        this.notes = {};
        this.leaveLocked = {};
        for (const s of this.students) {
          const saved = attByStudent.get(s.id.toLowerCase());
          this.status[s.id] = saved
            ? parseAttendanceStatusFromApi(saved['status'] ?? saved['Status'])
            : '';
          this.notes[s.id] = saved ? String(saved['remarks'] ?? saved['Remarks'] ?? '') : '';
          this.leaveLocked[s.id] = !!(saved?.['isLeaveLocked'] ?? saved?.['IsLeaveLocked']);
        }

        this.isSubmitted = !!(attRaw['isSubmitted'] ?? attRaw['IsSubmitted']);
        this.submittedBannerDate = this.isSubmitted ? this.displaySelectedDate : '';
        this.initialStatus = { ...this.status };
        this.initialNotes = { ...this.notes };
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        void this.showToast('Error loading students');
        this.cdr.markForCheck();
      },
    });
  }

  setStatus(studentId: string, key: AttendanceStatusKey): void {
    if (!this.canEdit || !studentId || this.leaveLocked[studentId]) return;
    const prev = this.status[studentId];
    this.status = {
      ...this.status,
      [studentId]: prev === key ? '' : key,
    };
    this.cdr.markForCheck();
  }

  cycleStatus(studentId: string): void {
    if (!this.canEdit || !studentId || this.leaveLocked[studentId]) return;
    const current = this.status[studentId] || '';
    const next: Record<AttendanceStatusKey, AttendanceStatusKey> = {
      '': 'present',
      present: 'absent',
      absent: 'late',
      late: '',
    };
    this.status = { ...this.status, [studentId]: next[current] };
    this.cdr.markForCheck();
  }

  onStatusClick(event: Event, studentId: string, key: AttendanceStatusKey): void {
    event.stopPropagation();
    this.setStatus(studentId, key);
  }

  markAllPresent(): void {
    if (!this.canEdit) return;
    const next = { ...this.status };
    this.visibleStudents.forEach((student) => {
      if (!this.leaveLocked[student.id]) {
        next[student.id] = 'present';
      }
    });
    this.status = next;
    this.cdr.markForCheck();
  }

  resetVisible(): void {
    if (!this.canEdit) return;
    const next = { ...this.status };
    this.visibleStudents.forEach((student) => {
      if (!this.leaveLocked[student.id]) {
        next[student.id] = '';
      }
    });
    this.status = next;
    this.cdr.markForCheck();
  }

  isStatusActive(studentId: string, key: AttendanceStatusKey): boolean {
    return this.status[studentId] === key;
  }

  isLeaveLocked(studentId: string): boolean {
    return !!this.leaveLocked[studentId];
  }

  filterBy(f: StatusFilter): void {
    this.curFilter = f;
    this.cdr.markForCheck();
  }

  openRemarks(studentId: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.canEdit || !studentId || this.leaveLocked[studentId]) return;
    this.remarkTargetId = studentId;
    this.tempRemark = this.notes[studentId] || '';
    this.remarksOpen = true;
  }

  closeRemarks(): void {
    this.remarksOpen = false;
    this.remarkTargetId = null;
    this.tempRemark = '';
  }

  saveRemark(): void {
    if (this.remarkTargetId) {
      this.notes = { ...this.notes, [this.remarkTargetId]: this.tempRemark.trim() };
    }
    this.closeRemarks();
    this.cdr.markForCheck();
  }

  dismissBanner(): void {
    this.isSubmitted = false;
    this.submittedBannerDate = '';
    this.cdr.markForCheck();
  }

  async submitAttendance(): Promise<void> {
    if (!this.canEdit) return;
    const unmarked = this.stats.total - this.stats.marked;
    if (unmarked > 0) {
      const alert = await this.alert.create({
        header: 'Unmarked students',
        message: `${unmarked} students are still unmarked. Submit anyway?`,
        buttons: [
          { text: 'Continue marking', role: 'cancel' },
          { text: 'Submit anyway', handler: () => this.doSubmit() },
        ],
      });
      await alert.present();
      return;
    }
    await this.doSubmit();
  }

  private async doSubmit(): Promise<void> {
    const markedStudents = this.students
      .filter((s) => {
        const hasStatus = !!this.status[s.id];
        if (!hasStatus) return false;
        const statusChanged = this.status[s.id] !== (this.initialStatus[s.id] || '');
        const noteChanged = (this.notes[s.id] || '') !== (this.initialNotes[s.id] || '');
        return statusChanged || noteChanged;
      })
      .map((s) => {
        const apiStatus = attendanceStatusToApi(this.status[s.id]);
        return {
          studentId: s.id,
          status: apiStatus ?? AttendanceStatus.Present,
          remarks: this.notes[s.id] || null,
        };
      });

    if (!markedStudents.length) {
      void this.showToast('Mark at least one student before submitting');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();
    this.attendanceService
      .submitAttendance({
        classId: this.selectedClassId,
        attendanceDate: this.selectedDate,
        students: markedStudents,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          void this.showToast('Attendance submitted successfully');
          this.loadSavedAttendance();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg =
            err?.status === 403
              ? 'No permission for this class'
              : getUserFacingApiError(err, 'Submit failed');
          void this.showToast(msg);
          this.cdr.markForCheck();
        },
      });
  }

  avatarInitials(name: string, roll: string): string {
    if (roll) return roll.slice(0, 2);
    return name.slice(0, 2).toUpperCase() || '?';
  }

  private mapRosterStudent(item: Record<string, unknown>): StudentRow {
    const id = String(item['id'] ?? item['Id'] ?? '');
    const roll = String(item['rollNumber'] ?? item['RollNumber'] ?? '').trim();
    const name = String(item['name'] ?? item['Name'] ?? '').trim()
      || [item['firstName'], item['middleName'], item['lastName']]
          .filter(Boolean)
          .map(String)
          .join(' ')
          .trim();
    return { id, roll, name: name || 'Student' };
  }

  private compareRoll(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true });
  }

  private showToast(message: string): void {
    const lower = message.toLowerCase();
    if (lower.includes('success') || lower.includes('submitted') || lower.includes('updated') || lower.includes('saved')) {
      void this.toast.success(message);
      return;
    }
    if (lower.includes('fail') || lower.includes('error') || lower.includes('at least')) {
      void this.toast.error(message);
      return;
    }
    void this.toast.show(message);
  }
}
