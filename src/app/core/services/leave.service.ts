import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/** @deprecated Prefer leaveTypeId for staff. Student apply still uses enum. */
export enum LeaveType {
  Casual = 1,
  Sick = 2,
  Other = 3,
}

export enum LeaveRequestStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

export type LeaveHalfDaySession = 'FirstHalf' | 'SecondHalf';

export interface LeaveHalfDay {
  date: string;
  session: LeaveHalfDaySession;
}

export interface CreateStaffLeaveRequest {
  fromDate: string;
  toDate: string;
  leaveTypeId: string;
  reason: string;
  submitImmediately?: boolean;
  isHalfDay?: boolean;
  halfDays?: LeaveHalfDay[];
}

export interface CreateStudentLeaveRequest {
  studentId: string;
  fromDate: string;
  toDate: string;
  leaveType: LeaveType;
  reason: string;
  submitImmediately?: boolean;
}

export interface LeaveApplicant {
  employeeId: string;
  employeeName: string;
  reportingManager?: { id: string; name: string } | null;
}

export interface StudentLeaveApplicant {
  studentId: string;
  studentName: string;
  className?: string | null;
  classTeacher?: { id: string; name: string } | null;
}

export interface LinkedStudent {
  id: string;
  name: string;
  className?: string | null;
}

export interface LeaveTypeDto {
  id: string;
  code: string;
  name: string;
  isPaid?: boolean;
  requiresBalance?: boolean;
  allowHalfDay?: boolean;
  carryForward?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface LeaveBalanceDto {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  leaveTypeId: string;
  leaveTypeName?: string | null;
  leaveTypeCode?: string | null;
  academicYearId: string;
  openingBalance: number;
  accrued: number;
  used: number;
  adjusted: number;
  closingBalance: number;
}

export interface LeaveListItem {
  id: string;
  fromDate: string;
  toDate: string;
  dayCount?: number;
  leaveTypeLabel?: string | null;
  leaveTypeName?: string | null;
  status: number | string;
  statusLabel?: string;
  isHalfDay?: boolean;
  reason?: string | null;
  approvedByName?: string | null;
  approvedOn?: string | null;
  createdOn?: string;
  studentName?: string | null;
  className?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly api = inject(ApiService);

  getStaffApplicant(): Observable<LeaveApplicant> {
    return this.api.get<LeaveApplicant>('leave/staff/applicant');
  }

  getActiveLeaveTypes(): Observable<LeaveTypeDto[]> {
    return this.api.get<LeaveTypeDto[]>('leave/types/active');
  }

  getStaffMine(): Observable<LeaveListItem[]> {
    return this.api.get<LeaveListItem[]>('leave/staff/mine');
  }

  getBalancesMine(): Observable<LeaveBalanceDto[]> {
    return this.api.get<LeaveBalanceDto[]>('leave/balances/mine');
  }

  createStaff(body: CreateStaffLeaveRequest): Observable<unknown> {
    return this.api.post('leave/staff', body);
  }

  submitStaff(id: string): Observable<unknown> {
    return this.api.post(`leave/staff/${id}/submit`, {});
  }

  getStudentMine(): Observable<LeaveListItem[]> {
    return this.api.get<LeaveListItem[]>('leave/students/mine');
  }

  getStudentApplicant(): Observable<StudentLeaveApplicant> {
    return this.api.get<StudentLeaveApplicant>('leave/students/applicant');
  }

  getLinkedStudents(): Observable<LinkedStudent[]> {
    return this.api.get<LinkedStudent[]>('leave/students/children');
  }

  createStudent(body: CreateStudentLeaveRequest): Observable<unknown> {
    return this.api.post('leave/students', body);
  }
}
