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

@Injectable({ providedIn: 'root' })
export class AcademicCalendarService {
  private readonly api = inject(ApiService);

  getWorkingDays(year: number, month: number, audience: 'Staff' | 'Students' = 'Staff'): Observable<WorkingDaysResponse> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month))
      .set('audience', audience);
    return this.api.get<WorkingDaysResponse>('academic-calendar/working-days', params);
  }
}
