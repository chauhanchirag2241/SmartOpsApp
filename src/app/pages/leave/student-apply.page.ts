import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import {
  CreateStudentLeaveRequest,
  LeaveService,
  LeaveType,
  StudentLeaveApplicant,
} from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { localDateString, pickStr } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-student-apply',
  templateUrl: './student-apply.page.html',
  styleUrls: ['./student-apply.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoDateInputComponent,
    SoIconComponent,
    SoSelectComponent,
    IonContent,
    IonSpinner,
  ],
})
export class StudentApplyPage implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);
  readonly sendIcon = SoIcons.send;

  loading = true;
  saving = false;
  applicant: StudentLeaveApplicant | null = null;
  fromDate = localDateString(new Date());
  toDate = localDateString(new Date());
  leaveType: LeaveType = LeaveType.Casual;
  reason = '';

  readonly leaveTypeOptions: SoSelectOption[] = [
    { label: 'Casual', value: String(LeaveType.Casual) },
    { label: 'Sick', value: String(LeaveType.Sick) },
    { label: 'Other', value: String(LeaveType.Other) },
  ];

  leaveTypeValue = String(LeaveType.Casual);

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStudent);
  }

  get studentName(): string {
    return this.applicant?.studentName?.trim() || '—';
  }

  get className(): string {
    return this.applicant?.className?.trim() || '—';
  }

  get classTeacherName(): string {
    return this.applicant?.classTeacher?.name?.trim() || 'Principal (default)';
  }

  get totalDaysPreview(): number {
    if (!this.fromDate || !this.toDate) return 0;
    const from = this.parseDay(this.fromDate);
    const to = this.parseDay(this.toDate);
    if (from == null || to == null || to < from) return 0;
    return to - from + 1;
  }

  ngOnInit(): void {
    this.loadApplicant();
  }

  onLeaveTypeChanged(value: string): void {
    const n = Number(value);
    if (n === LeaveType.Casual || n === LeaveType.Sick || n === LeaveType.Other) {
      this.leaveType = n;
      this.leaveTypeValue = String(n);
    }
  }

  submit(): void {
    if (!this.canApply || this.saving) return;

    const studentId = this.applicant?.studentId?.trim();
    if (!studentId) {
      void this.toast.error('Student profile not found', 2500);
      return;
    }
    if (!this.fromDate || !this.toDate) {
      void this.toast.error('Dates are required', 2500);
      return;
    }
    if (!this.reason.trim()) {
      void this.toast.error('Reason is required', 2500);
      return;
    }
    if (this.totalDaysPreview <= 0) {
      void this.toast.error('To date must be on or after From date', 2500);
      return;
    }

    this.saving = true;
    const body: CreateStudentLeaveRequest = {
      studentId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      leaveType: this.leaveType,
      reason: this.reason.trim(),
      submitImmediately: true,
    };

    this.leaveService.createStudent(body).subscribe({
      next: () => {
        this.saving = false;
        void this.toast.success('Leave submitted', 2000);
        void this.router.navigate(['/leave/student-mine']);
      },
      error: (err) => {
        this.saving = false;
        const msg = getUserFacingApiError(err, 'Submit failed');
        void this.toast.error(msg, 2500);
      },
    });
  }

  private loadApplicant(): void {
    this.loading = true;
    this.leaveService.getStudentApplicant().subscribe({
      next: (raw) => {
        this.applicant = this.normalizeApplicant(raw);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = getUserFacingApiError(err, 'Failed to load leave form');
        void this.toast.error(msg, 2500);
      },
    });
  }

  private normalizeApplicant(raw: StudentLeaveApplicant | Record<string, unknown>): StudentLeaveApplicant {
    const r = raw as Record<string, unknown>;
    const teacherRaw = (r['classTeacher'] ?? r['ClassTeacher']) as Record<string, unknown> | null | undefined;
    return {
      studentId: pickStr(r, 'studentId', 'StudentId'),
      studentName: pickStr(r, 'studentName', 'StudentName') || 'Student',
      className: pickStr(r, 'className', 'ClassName') || null,
      classTeacher: teacherRaw
        ? {
            id: pickStr(teacherRaw, 'id', 'Id'),
            name: pickStr(teacherRaw, 'name', 'Name'),
          }
        : null,
    };
  }

  private parseDay(value?: string | null): number | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(dt.getTime())) return null;
    return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
  }
}
