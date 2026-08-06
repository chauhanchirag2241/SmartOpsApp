import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, IonToggle } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import {
  CreateStaffLeaveRequest,
  LeaveApplicant,
  LeaveBalanceDto,
  LeaveHalfDay,
  LeaveHalfDaySession,
  LeaveService,
  LeaveTypeDto,
} from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { localDateString } from '../../core/utils/api-mapper.util';

interface HalfDayRow {
  date: string;
  selected: boolean;
  session: LeaveHalfDaySession;
}

@Component({
  selector: 'app-staff-apply',
  templateUrl: './staff-apply.page.html',
  styleUrls: ['./staff-apply.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoDateInputComponent,
    SoIconComponent,
    SoSelectComponent,
    IonContent,
    IonSpinner,
    IonToggle,
  ],
})
export class StaffApplyPage implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);
  readonly sendIcon = SoIcons.send;

  loading = true;
  saving = false;
  applicant: LeaveApplicant | null = null;
  leaveTypes: LeaveTypeDto[] = [];
  leaveTypeOptions: SoSelectOption[] = [];
  balances: LeaveBalanceDto[] = [];
  leaveTypeId = '';
  fromDate = localDateString(new Date());
  toDate = localDateString(new Date());
  reason = '';
  isHalfDay = false;
  halfDayRows: HalfDayRow[] = [];
  sessionOptions: SoSelectOption[] = [
    { label: 'First half', value: 'FirstHalf' },
    { label: 'Second half', value: 'SecondHalf' },
  ];

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStaff);
  }

  get employeeName(): string {
    return this.applicant?.employeeName?.trim() || '—';
  }

  get reportingManagerName(): string {
    return this.applicant?.reportingManager?.name?.trim() || 'Principal (default)';
  }

  get selectedLeaveType(): LeaveTypeDto | null {
    if (!this.leaveTypeId) return null;
    return this.leaveTypes.find((t) => t.id === this.leaveTypeId) ?? null;
  }

  get allowHalfDay(): boolean {
    return this.selectedLeaveType?.allowHalfDay !== false;
  }

  get remainingBalanceLabel(): string | null {
    const type = this.selectedLeaveType;
    if (!type || type.requiresBalance === false) return null;
    const bal = this.balances.find((b) => b.leaveTypeId === this.leaveTypeId);
    if (!bal) return null;
    return `${bal.closingBalance} day(s) remaining`;
  }

  get totalDaysPreview(): number {
    if (!this.fromDate || !this.toDate) return 0;
    const from = this.parseDay(this.fromDate);
    const to = this.parseDay(this.toDate);
    if (from == null || to == null || to < from) return 0;

    if (!this.isHalfDay) {
      return to - from + 1;
    }

    let total = 0;
    for (let d = from; d <= to; d++) {
      const iso = this.dayToIso(d);
      const row = this.halfDayRows.find((r) => r.date === iso);
      total += row?.selected ? 0.5 : 1;
    }
    return total;
  }

  ngOnInit(): void {
    this.rebuildHalfDayRows();
    this.loadFormData();
  }

  onDatesChanged(): void {
    this.rebuildHalfDayRows();
  }

  onLeaveTypeChanged(): void {
    if (!this.allowHalfDay && this.isHalfDay) {
      this.onHalfDayToggle(false);
    }
  }

  onHalfDayToggle(enabled: boolean): void {
    if (enabled && !this.allowHalfDay) {
      this.isHalfDay = false;
      return;
    }
    this.isHalfDay = enabled;
    if (!enabled) {
      for (const row of this.halfDayRows) {
        row.selected = false;
      }
    } else if (this.halfDayRows.length === 1) {
      this.halfDayRows[0].selected = true;
    }
  }

  submit(): void {
    if (!this.canApply || this.saving) return;

    if (!this.fromDate || !this.toDate) {
      void this.toast.error('Dates are required', 2500);
      return;
    }
    if (!this.leaveTypeId) {
      void this.toast.error('Leave type is required', 2500);
      return;
    }
    if (!this.reason.trim()) {
      void this.toast.error('Reason is required', 2500);
      return;
    }

    const halfDays: LeaveHalfDay[] = this.isHalfDay
      ? this.halfDayRows
          .filter((r) => r.selected)
          .map((r) => ({ date: r.date, session: r.session }))
      : [];

    if (this.isHalfDay && halfDays.length === 0) {
      void this.toast.error('Select at least one half-day date', 2500);
      return;
    }

    this.saving = true;
    const body: CreateStaffLeaveRequest = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      leaveTypeId: this.leaveTypeId,
      reason: this.reason.trim(),
      submitImmediately: true,
      isHalfDay: this.isHalfDay,
      halfDays,
    };

    this.leaveService.createStaff(body).subscribe({
      next: () => {
        this.saving = false;
        void this.toast.success('Leave submitted', 2000);
        void this.router.navigate(['/leave/mine']);
      },
      error: (err) => {
        this.saving = false;
        const msg = typeof err?.error === 'string' ? err.error : 'Submit failed';
        void this.toast.error(msg, 2500);
      },
    });
  }

  private loadFormData(): void {
    this.loading = true;
    forkJoin({
      applicant: this.leaveService.getStaffApplicant(),
      types: this.leaveService.getActiveLeaveTypes(),
      balances: this.leaveService.getBalancesMine(),
    }).subscribe({
      next: ({ applicant, types, balances }) => {
        this.applicant = applicant;
        this.leaveTypes = (Array.isArray(types) ? types : []).filter((t) => t.isActive !== false);
        this.leaveTypeOptions = this.leaveTypes.map((t) => ({
          label: `${t.code} — ${t.name}`,
          value: t.id,
        }));
        this.balances = Array.isArray(balances) ? balances : [];
        if (!this.leaveTypeId && this.leaveTypes.length) {
          this.leaveTypeId = this.leaveTypes[0].id;
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err?.error === 'string' ? err.error : 'Failed to load leave form';
        void this.toast.error(msg, 2500);
      },
    });
  }

  private rebuildHalfDayRows(): void {
    const from = this.parseDay(this.fromDate);
    const to = this.parseDay(this.toDate);
    if (from == null || to == null || to < from) {
      this.halfDayRows = [];
      return;
    }

    const prev = new Map(this.halfDayRows.map((r) => [r.date, r]));
    const rows: HalfDayRow[] = [];
    for (let d = from; d <= to; d++) {
      const iso = this.dayToIso(d);
      const existing = prev.get(iso);
      rows.push({
        date: iso,
        selected: existing?.selected ?? false,
        session: existing?.session ?? 'FirstHalf',
      });
    }
    this.halfDayRows = rows;
  }

  private parseDay(value?: string | null): number | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(dt.getTime())) return null;
    return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
  }

  private dayToIso(dayNumber: number): string {
    const ms = dayNumber * 86400000;
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
