import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedStudentsResult, StudentFilter, StudentListItem } from '../models/student.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiService);

  getStudents(
    pageIndex = 1,
    pageSize = 20,
    searchTerm = '',
    sortColumn: string | null = null,
    sortDirection: string | null = null,
    filter: StudentFilter = StudentFilter.Active,
    classIds: string[] | null = null,
  ): Observable<PagedStudentsResult> {
    let params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString())
      .set('filter', filter.toString());

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    if (sortColumn) {
      params = params.set('sortColumn', sortColumn);
    }
    if (sortDirection) {
      params = params.set('sortDirection', sortDirection);
    }
    if (classIds?.length) {
      for (const id of classIds) {
        params = params.append('classIds', id);
      }
    }

    return this.api.get<PagedStudentsResult>('students', params);
  }

  getStudentById(id: string): Observable<unknown> {
    return this.api.get(`students/${id}`);
  }

  /** Class roster helper (attendance). */
  getStudentsByClass(classId: string, pageSize = 200): Observable<PagedStudentsResult> {
    return this.getStudents(1, pageSize, '', null, null, StudentFilter.Active, [classId]);
  }

  mapListItem(raw: Record<string, unknown>): StudentListItem {
    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      classId: (raw['classId'] ?? raw['ClassId']) as string | null,
      name: String(raw['name'] ?? raw['Name'] ?? ''),
      email: (raw['email'] ?? raw['Email']) as string | null,
      admNo: (raw['admNo'] ?? raw['AdmNo'] ?? raw['admissionNo'] ?? raw['AdmissionNo']) as string | null,
      rollNumber: (raw['rollNumber'] ?? raw['RollNumber']) as string | null,
      class: (raw['class'] ?? raw['Class']) as string | null,
      attendance: (raw['attendance'] ?? raw['Attendance']) as string | null,
      fees: (raw['fees'] ?? raw['Fees']) as string | null,
      status: (raw['status'] ?? raw['Status']) as string | null,
      isActive: !!(raw['isActive'] ?? raw['IsActive']),
      enrollmentIsActive: !!(raw['enrollmentIsActive'] ?? raw['EnrollmentIsActive']),
    };
  }
}
