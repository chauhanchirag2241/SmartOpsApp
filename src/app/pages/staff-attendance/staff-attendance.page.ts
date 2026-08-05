import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  checkmarkCircleOutline,
  fingerPrintOutline,
  logInOutline,
  logOutOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  EmployeeAttendanceSettings,
  StaffAttendanceRow,
  StaffPunchType,
} from '../../core/models/staff-attendance.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { StaffAttendanceService } from '../../core/services/staff-attendance.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { formatDisplayDate, localDateString } from '../../core/utils/api-mapper.util';

interface HistoryDay {
  date: string;
  displayDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  statusLabel: string;
  hasRecord: boolean;
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
  private readonly toast = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly permissions = inject(PermissionService);
  readonly ayContext = inject(AcademicYearContextService);

  settings: EmployeeAttendanceSettings | null = null;
  today: StaffAttendanceRow | null = null;
  history: HistoryDay[] = [];
  isLoading = false;
  isPunching = false;
  isEnrolling = false;
  faceMode: 'punch' | 'enroll' | null = null;

  constructor() {
    addIcons({
      cameraOutline,
      checkmarkCircleOutline,
      fingerPrintOutline,
      logInOutline,
      logOutOutline,
      timeOutline,
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

  ngOnInit(): void {
    this.loadAll();
  }

  onRefresh(event: CustomEvent): void {
    this.loadAll(() => {
      (event.target as HTMLIonRefresherElement)?.complete();
    });
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
        this.loadHistory(done);
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
        this.loadHistory();
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
        this.loadHistory();
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

  private loadHistory(done?: () => void): void {
    const employeeId = this.today?.employeeId;
    if (!employeeId) {
      this.history = [];
      done?.();
      this.cdr.markForCheck();
      return;
    }

    const dates = this.lastNDates(7);
    forkJoin(
      dates.map((date) =>
        this.service.listByDate(date).pipe(
          map((rows) => this.findMyRow(rows, employeeId, date)),
          catchError(() => of(this.emptyHistoryDay(date))),
        ),
      ),
    ).subscribe({
      next: (days) => {
        this.history = days;
        done?.();
        this.cdr.markForCheck();
      },
      error: () => {
        this.history = [];
        done?.();
        this.cdr.markForCheck();
      },
    });
  }

  private findMyRow(rows: StaffAttendanceRow[], employeeId: string, date: string): HistoryDay {
    const list = Array.isArray(rows) ? rows : [];
    const match = list
      .map((r) => this.mapRow(r))
      .find((r) => r.employeeId.toLowerCase() === employeeId.toLowerCase());
    if (!match) return this.emptyHistoryDay(date);
    const checkIn = this.pickTime(match, 'checkInTime', 'CheckInTime');
    const checkOut = this.pickTime(match, 'checkOutTime', 'CheckOutTime');
    return {
      date,
      displayDate: formatDisplayDate(date),
      checkInTime: checkIn,
      checkOutTime: checkOut,
      statusLabel: match.statusLabel || String(match.status || '—'),
      hasRecord: !!(checkIn || checkOut),
    };
  }

  private emptyHistoryDay(date: string): HistoryDay {
    return {
      date,
      displayDate: formatDisplayDate(date),
      checkInTime: null,
      checkOutTime: null,
      statusLabel: '—',
      hasRecord: false,
    };
  }

  private lastNDates(n: number): string[] {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(localDateString(d));
    }
    return out;
  }

  private mapSettings(raw: EmployeeAttendanceSettings | Record<string, unknown>): EmployeeAttendanceSettings {
    const r = raw as Record<string, unknown>;
    return {
      type: String(r['type'] ?? r['Type'] ?? 'both'),
      allowsManual: !!(r['allowsManual'] ?? r['AllowsManual']),
      allowsFace: !!(r['allowsFace'] ?? r['AllowsFace']),
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

  private async showToast(message: string, color?: string): Promise<void> {
    const t = await this.toast.create({
      message,
      duration: 2800,
      position: 'bottom',
      color,
    });
    await t.present();
  }
}
