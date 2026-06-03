import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClassAttendanceResponse, SubmitAttendanceRequest } from '../models/attendance.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiService);

  getClassAttendance(classId: string, date: string): Observable<ClassAttendanceResponse> {
    const params = new HttpParams().set('classId', classId).set('date', date);
    return this.api.get<ClassAttendanceResponse>('attendance', params);
  }

  submitAttendance(request: SubmitAttendanceRequest): Observable<ClassAttendanceResponse> {
    return this.api.post<ClassAttendanceResponse>('attendance/submit', request);
  }
}
