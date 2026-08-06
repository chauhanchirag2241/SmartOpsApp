import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/** @deprecated Prefer leaveTypeId. Kept for older student apply. */
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

export interface LeaveApplicant {
  employeeId: string;
  employeeName: string;
  reportingManager?: { id: string; name: string } | null;
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

  getStudentMine(): Observable<unknown[]> {
    return this.api.get('leave/students/mine');
  }

  getLinkedStudents(): Observable<unknown[]> {
    return this.api.get('leave/students/children');
  }

  createStudent(body: unknown): Observable<unknown> {
    return this.api.post('leave/students', body);
  }
}
