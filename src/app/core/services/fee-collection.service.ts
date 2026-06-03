import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class FeeCollectionService {
  private readonly api = inject(ApiService);

  getStudents(
    classId?: string,
    academicYearId?: string,
    search?: string,
    status?: string,
  ): Observable<unknown[]> {
    let params = new HttpParams();
    if (classId) params = params.set('classId', classId);
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.api.get<unknown[]>('fees/collection/students', params);
  }

  getStudentDetail(studentId: string, academicYearId?: string): Observable<unknown> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.api.get(`fees/collection/students/${studentId}`, params);
  }

  collectFee(body: unknown): Observable<unknown> {
    return this.api.post('fees/collection/collect', body);
  }
}
