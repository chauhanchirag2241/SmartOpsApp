import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/** Matches SmartOps StudentFilter.Active */
const STUDENT_FILTER_ACTIVE = 1;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiService);

  getStudentsByClass(classId: string, pageSize = 200): Observable<{ items: unknown[] }> {
    let params = new HttpParams()
      .set('pageIndex', '1')
      .set('pageSize', pageSize.toString())
      .set('filter', STUDENT_FILTER_ACTIVE.toString())
      .append('classIds', classId);

    return this.api.get<{ items: unknown[] }>('students', params);
  }
}
