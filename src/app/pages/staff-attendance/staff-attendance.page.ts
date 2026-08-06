import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  fingerPrintOutline,
  logInOutline,
  logOutOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  EmployeeAttendanceSettings,
  MyMonthAttendance,
  StaffAttendanceRow,
  StaffPunchType,
} from '../../core/models/staff-attendance.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveListItem, LeaveRequestStatus, LeaveService } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { StaffAttendanceService } from '../../core/services/staff-attendance.service';
import { ToastService } from '../../core/services/toast.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { formatDisplayDate, localDateString } from '../../core/utils/api-mapper.util';
import { SoToastTone } from '../../shared/icons/so-icons';

export type DayTone = 'present' | 'absent' | 'leave' | 'holiday' | 'late' | 'half' | 'empty';

interface CalendarCell {
  day: number | null;
  tone: DayTone;
  label: string;
}

@Component({
  selector: 'app-staff-attendance',
  templateUrl: './staff-attendance.page.html',
  styleUrls: ['./staff-attendance.page.scss'],
  imports: [
    AppHeaderComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class StaffAttendancePage implements OnInit {
  @ViewChild('faceInput') faceInput?: ElementRef<HTMLInputElement>;
  @ViewChild('enrollInput') enrollInput?: ElementRef<HTMLInputElement>;

  private readonly service = inject(StaffAttendanceService);
  private readonly leaveService = inject(LeaveService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly permissions = inject(PermissionService);
  readonly ayContext = inject(AcademicYearContextService);

  settings: EmployeeAttendanceSettings | null = null;
  today: StaffAttendanceRow | null = null;
  isLoading = false;
  isPunching = false;
  isEnrolling = false;
  faceMode: 'punch' | 'enroll' | null = null;

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth() + 1;
  calendarCells: CalendarCell[] = [];
  calendarLoading = false;
  private dailyStatus: Record<number, string> = {};
  private leaveDays = new Set<number>();
  private holidayDays = new Set<number>();

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  constructor() {
    addIcons({
      cameraOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      fingerPrintOutline,
      logInOutline,
      logOutOutline,
      warningOutline,
    });
  }

  get canEdit(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canEdit(MenuCodes.StaffAttendance);
  }

  get allowsManual(): boolean {
    return !!this.settings?.allowsManual;
  }

  get allowsFace(): boolean {
    return !!this.settings?.allowsFace;
  }

  get isFaceEnrolled(): boolean {
    return !!(this.today?.isFaceEnrolled ?? (this.today as unknown as Record<string, unknown>)?.['IsFaceEnrolled']);
  }

  get hasCheckIn(): boolean {
    return !!this.pickTime(this.today, 'checkInTime', 'CheckInTime');
  }

  get hasCheckOut(): boolean {
    return !!this.pickTime(this.today, 'checkOutTime', 'CheckOutTime');
  }

  get nextManualPunch(): StaffPunchType | null {
    if (!this.allowsManual || !this.canEdit) return null;
    if (!this.hasCheckIn) return 'checkin';
    if (!this.hasCheckOut) return 'checkout';
    return null;
  }

  get employeeName(): string {
    if (!this.today) return '';
    const r = this.today as unknown as Record<string, unknown>;
    return String(r['employeeName'] ?? r['EmployeeName'] ?? '');
  }

  get statusLabel(): string {
    if (!this.today) return '—';
    const r = this.today as unknown as Record<string, unknown>;
    return String(r['statusLabel'] ?? r['StatusLabel'] ?? r['status'] ?? r['Status'] ?? '—');
  }

  get checkInDisplay(): string {
    return this.formatTime(this.pickTime(this.today, 'checkInTime', 'CheckInTime'));
  }

  get checkOutDisplay(): string {
    return this.formatTime(this.pickTime(this.today, 'checkOutTime', 'CheckOutTime'));
  }

  get todayLabel(): string {
    return formatDisplayDate(localDateString());
  }

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth - 1, 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  onRefresh(event: CustomEvent): void {
    this.loadAll(() => {
      (event.target as HTMLIonRefresherElement)?.complete();
    });
  }

  prevMonth(): void {
    if (this.viewMonth === 1) {
      this.viewMonth = 12;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
    this.loadCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 12) {
      this.viewMonth = 1;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
    this.loadCalendar();
  }

  loadAll(done?: () => void): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      settings: this.service.getSettings().pipe(
        catchError(() => of({ type: 'both', allowsManual: true, allowsFace: true } as EmployeeAttendanceSettings)),
      ),
      today: this.service.getMyToday().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ settings, today }) => {
        this.settings = this.mapSettings(settings);
        this.today = today ? this.mapRow(today) : null;
        this.isLoading = false;
        this.loadCalendar(done);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        void this.showToast('Failed to load attendance');
        done?.();
        this.cdr.markForCheck();
      },
    });
  }

  manualPunch(punchType: StaffPunchType): void {
    if (!this.canEdit || !this.allowsManual || this.isPunching) return;
    this.isPunching = true;
    this.cdr.markForCheck();
    this.service.manualPunch({ punchType }).subscribe({
      next: (row) => {
        this.today = this.mapRow(row);
        this.isPunching = false;
        void this.showToast(punchType === 'checkin' ? 'Checked in' : 'Checked out', 'success');
        this.loadCalendar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isPunching = false;
        void this.showToast(this.errorMessage(err, 'Punch failed'));
        this.cdr.markForCheck();
      },
    });
  }

  openFacePunch(): void {
    if (!this.canEdit || !this.allowsFace || this.isPunching) return;
    if (!this.isFaceEnrolled) {
      void this.showToast('Enroll your face first');
      return;
    }
    this.faceMode = 'punch';
    this.faceInput?.nativeElement.click();
  }

  openFaceEnroll(): void {
    if (!this.canEdit || !this.allowsFace || this.isEnrolling) return;
    this.faceMode = 'enroll';
    this.enrollInput?.nativeElement.click();
  }

  onFaceSelected(event: Event, mode: 'punch' | 'enroll'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.faceMode = null;
    if (!file) return;

    if (mode === 'enroll') {
      this.submitEnroll(file);
    } else {
      this.submitFacePunch(file);
    }
  }

  private submitFacePunch(file: File): void {
    this.isPunching = true;
    this.cdr.markForCheck();
    this.service.facePunch(file, file.name || 'punch.jpg').subscribe({
      next: (row) => {
        this.today = this.mapRow(row);
        this.isPunching = false;
        void this.showToast('Face punch recorded', 'success');
        this.loadCalendar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isPunching = false;
        void this.showToast(this.errorMessage(err, 'Face punch failed'));
        this.cdr.markForCheck();
      },
    });
  }

  private submitEnroll(file: File): void {
    const employeeId = this.today?.employeeId || null;
    this.isEnrolling = true;
    this.cdr.markForCheck();
    this.service.enrollFace(file, employeeId, file.name || 'enroll.jpg').subscribe({
      next: () => {
        this.isEnrolling = false;
        if (this.today) {
          this.today = { ...this.today, isFaceEnrolled: true };
        }
        void this.showToast('Face enrolled successfully', 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isEnrolling = false;
        void this.showToast(this.errorMessage(err, 'Enrollment failed'));
        this.cdr.markForCheck();
      },
    });
  }

  private loadCalendar(done?: () => void): void {
    this.calendarLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      month: this.service.getMyMonth(this.viewMonth, this.viewYear).pipe(
        catchError(() => of(null as MyMonthAttendance | null)),
      ),
      leaves: this.leaveService.getStaffMine().pipe(catchError(() => of([] as LeaveListItem[]))),
    }).subscribe({
      next: ({ month, leaves }) => {
        this.dailyStatus = this.extractDailyStatus(month);
        this.holidayDays = this.extractHolidayDays(month);
        this.leaveDays = this.extractLeaveDays(leaves ?? []);
        this.rebuildCalendarCells();
        this.calendarLoading = false;
        done?.();
        this.cdr.markForCheck();
      },
      error: () => {
        this.dailyStatus = {};
        this.leaveDays = new Set();
        this.holidayDays = new Set();
        this.rebuildCalendarCells();
        this.calendarLoading = false;
        done?.();
        this.cdr.markForCheck();
      },
    });
  }

  private extractDailyStatus(month: MyMonthAttendance | Record<string, unknown> | null): Record<number, string> {
    if (!month) return {};
    const r = month as Record<string, unknown>;
    const daily = (r['dailyStatus'] ?? r['DailyStatus'] ?? {}) as Record<string, string>;
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(daily ?? {})) {
      const day = Number(k);
      if (day > 0) out[day] = String(v).toUpperCase();
    }
    return out;
  }

  private extractHolidayDays(month: MyMonthAttendance | Record<string, unknown> | null): Set<number> {
    if (!month) return new Set();
    const r = month as Record<string, unknown>;
    const days = (r['nonWorkingDays'] ?? r['NonWorkingDays'] ?? []) as number[];
    return new Set((days ?? []).map((d) => Number(d)).filter((d) => d > 0));
  }

  private extractLeaveDays(leaves: LeaveListItem[]): Set<number> {
    const set = new Set<number>();
    for (const raw of leaves ?? []) {
      const item = this.normalizeLeave(raw);
      if (!this.isApprovedOrSubmittedLeave(item.status)) continue;
      const from = this.parseDateOnly(item.fromDate);
      const to = this.parseDateOnly(item.toDate);
      if (!from || !to) continue;
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === this.viewYear && d.getMonth() + 1 === this.viewMonth) {
          set.add(d.getDate());
        }
      }
    }
    return set;
  }

  private isApprovedOrSubmittedLeave(status: number | string): boolean {
    if (typeof status === 'number') {
      return status === LeaveRequestStatus.Approved || status === LeaveRequestStatus.Submitted;
    }
    const s = String(status).toLowerCase();
    return s === 'approved' || s === '2' || s === 'submitted' || s === '1';
  }

  private normalizeLeave(raw: LeaveListItem | Record<string, unknown>): LeaveListItem {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      fromDate: String(r['fromDate'] ?? r['FromDate'] ?? ''),
      toDate: String(r['toDate'] ?? r['ToDate'] ?? ''),
      status: (r['status'] ?? r['Status'] ?? '') as number | string,
      statusLabel: String(r['statusLabel'] ?? r['StatusLabel'] ?? ''),
    };
  }

  private parseDateOnly(value: string): Date | null {
    if (!value) return null;
    const iso = value.length >= 10 ? value.slice(0, 10) : value;
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private rebuildCalendarCells(): void {
    const first = new Date(this.viewYear, this.viewMonth - 1, 1);
    const daysInMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();
    const startPad = first.getDay();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, tone: 'empty', label: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(this.toneForDay(day));
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, tone: 'empty', label: '' });
    }

    this.calendarCells = cells;
  }

  private toneForDay(day: number): CalendarCell {
    if (this.leaveDays.has(day)) {
      return { day, tone: 'leave', label: 'Leave' };
    }

    const code = this.dailyStatus[day];
    if (code === 'P') return { day, tone: 'present', label: 'Present' };
    if (code === 'A') return { day, tone: 'absent', label: 'Absent' };
    if (code === 'L') return { day, tone: 'late', label: 'Late' };
    if (code === 'H') return { day, tone: 'half', label: 'Half day' };

    if (this.holidayDays.has(day)) {
      return { day, tone: 'holiday', label: 'Holiday' };
    }

    return { day, tone: 'empty', label: '' };
  }

  private mapSettings(raw: EmployeeAttendanceSettings | Record<string, unknown>): EmployeeAttendanceSettings {
    const r = raw as Record<string, unknown>;
    return {
      type: String(r['type'] ?? r['Type'] ?? 'both'),
      allowsManual: !!(r['allowsManual'] ?? r['AllowsManual']),
      allowsFace: !!(r['allowsFace'] ?? r['AllowsFace']),
      defaultWorkingHours: Number(r['defaultWorkingHours'] ?? r['DefaultWorkingHours'] ?? 8) || 8,
    };
  }

  private mapRow(raw: StaffAttendanceRow | Record<string, unknown>): StaffAttendanceRow {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      employeeId: String(r['employeeId'] ?? r['EmployeeId'] ?? ''),
      employeeName: String(r['employeeName'] ?? r['EmployeeName'] ?? ''),
      departmentId: (r['departmentId'] ?? r['DepartmentId']) as string | null,
      departmentName: (r['departmentName'] ?? r['DepartmentName']) as string | null,
      attendanceDate: String(r['attendanceDate'] ?? r['AttendanceDate'] ?? localDateString()),
      checkInTime: (r['checkInTime'] ?? r['CheckInTime']) as string | null,
      checkOutTime: (r['checkOutTime'] ?? r['CheckOutTime']) as string | null,
      checkInSource: (r['checkInSource'] ?? r['CheckInSource']) as string | null,
      checkOutSource: (r['checkOutSource'] ?? r['CheckOutSource']) as string | null,
      status: (r['status'] ?? r['Status'] ?? '') as string | number,
      statusLabel: String(r['statusLabel'] ?? r['StatusLabel'] ?? ''),
      remarks: (r['remarks'] ?? r['Remarks']) as string | null,
      checkInConfidence: (r['checkInConfidence'] ?? r['CheckInConfidence']) as number | null,
      checkOutConfidence: (r['checkOutConfidence'] ?? r['CheckOutConfidence']) as number | null,
      isFaceEnrolled: !!(r['isFaceEnrolled'] ?? r['IsFaceEnrolled']),
      photoUrl: (r['photoUrl'] ?? r['PhotoUrl']) as string | null,
      shiftStartTime: (r['shiftStartTime'] ?? r['ShiftStartTime']) as string | null,
    };
  }

  private pickTime(
    row: StaffAttendanceRow | null,
    camel: 'checkInTime' | 'checkOutTime',
    pascal: string,
  ): string | null {
    if (!row) return null;
    const r = row as unknown as Record<string, unknown>;
    const v = r[camel] ?? r[pascal];
    return v != null && v !== '' ? String(v) : null;
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  private errorMessage(err: unknown, fallback: string): string {
    const e = err as { error?: unknown; status?: number };
    if (e?.status === 403) return 'No permission to punch';
    if (typeof e?.error === 'string' && e.error.trim()) return e.error;
    if (e?.error && typeof e.error === 'object') {
      const o = e.error as Record<string, unknown>;
      const msg = o['message'] ?? o['Message'] ?? o['title'] ?? o['Title'];
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    return fallback;
  }

  private showToast(message: string, color?: string): void {
    const tone: SoToastTone =
      color === 'success' ? 'success' : color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'default';
    void this.toast.show({ message, tone });
  }
}
