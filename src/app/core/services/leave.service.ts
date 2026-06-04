import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export enum LeaveType {
  Casual = 1,
  Sick = 2,
  Other = 3,
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly api = inject(ApiService);

  getStaffMine(): Observable<unknown[]> {
    return this.api.get('leave/staff/mine');
  }

  createStaff(body: unknown): Observable<unknown> {
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
