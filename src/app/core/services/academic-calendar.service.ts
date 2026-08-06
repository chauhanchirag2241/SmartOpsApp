import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface WorkingDaysResponse {
  year: number;
  month: number;
  totalWorkingDays: number;
  nonWorkingDays: number[];
}

export type MyCalendarItemKind =
  | 'holiday'
  | 'event'
  | 'exam'
  | 'weekend'
  | 'present'
  | 'leave'
  | 'late'
  | 'halfday'
  | 'absent';

export interface MyCalendarItem {
  kind: MyCalendarItemKind | string;
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  color?: string | null;
  eventTypeName?: string | null;
  isNonWorkingDay?: boolean;
  classNames?: string[];
  subjectName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  roomNo?: string | null;
  invigilatorName?: string | null;
  examName?: string | null;
  statusLabel?: string | null;
}

export interface MyCalendarMonth {
  year: number;
  month: number;
  items: MyCalendarItem[];
}

@Injectable({ providedIn: 'root' })
export class AcademicCalendarService {
  private readonly api = inject(ApiService);
  private readonly base = 'AcademicCalendar';

  getWorkingDays(year: number, month: number, audience: 'Staff' | 'Students' = 'Staff'): Observable<WorkingDaysResponse> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month))
      .set('audience', audience);
    return this.api.get<WorkingDaysResponse>(`${this.base}/working-days`, params);
  }

  getMyMonth(year: number, month: number, branchId?: string | null): Observable<MyCalendarMonth> {
    let params = new HttpParams().set('year', String(year)).set('month', String(month));
    if (branchId) {
      params = params.set('branchId', branchId);
    }
    return this.api.get<MyCalendarMonth>(`${this.base}/my-month`, params);
  }
}
