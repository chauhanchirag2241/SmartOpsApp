import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EmployeeAttendanceSettings,
  ManualPunchRequest,
  MyMonthAttendance,
  StaffAttendanceReport,
  StaffAttendanceRow,
} from '../models/staff-attendance.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StaffAttendanceService {
  private readonly api = inject(ApiService);
  private readonly base = 'staff-attendance';

  getSettings(): Observable<EmployeeAttendanceSettings> {
    return this.api.get<EmployeeAttendanceSettings>(`${this.base}/settings`);
  }

  getMyToday(): Observable<StaffAttendanceRow | null> {
    return this.api.get<StaffAttendanceRow | null>(`${this.base}/my-today`);
  }

  listByDate(date: string): Observable<StaffAttendanceRow[]> {
    const params = new HttpParams().set('date', date);
    return this.api.get<StaffAttendanceRow[]>(this.base, params);
  }

  /** Own month attendance (no staff-report permission needed). */
  getMyMonth(month: number, year: number): Observable<MyMonthAttendance> {
    const params = new HttpParams().set('month', String(month)).set('year', String(year));
    return this.api.get<MyMonthAttendance>(`${this.base}/my-month`, params);
  }

  getReport(month: number, year: number, departmentId?: string): Observable<StaffAttendanceReport> {
    let params = new HttpParams().set('month', String(month)).set('year', String(year));
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }
    return this.api.get<StaffAttendanceReport>(`${this.base}/report`, params);
  }

  manualPunch(request: ManualPunchRequest): Observable<StaffAttendanceRow> {
    return this.api.post<StaffAttendanceRow>(`${this.base}/manual`, request);
  }

  facePunch(image: Blob, fileName = 'punch.jpg'): Observable<StaffAttendanceRow> {
    const form = new FormData();
    form.append('image', image, fileName);
    return this.api.post<StaffAttendanceRow>(`${this.base}/face/punch`, form);
  }

  enrollFace(image: Blob, employeeId?: string | null, fileName = 'enroll.jpg'): Observable<{ message?: string }> {
    const form = new FormData();
    form.append('image', image, fileName);
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return this.api.post<{ message?: string }>(`${this.base}/face/enroll${query}`, form);
  }
}
