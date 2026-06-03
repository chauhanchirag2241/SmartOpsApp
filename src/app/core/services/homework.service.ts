import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateHomeworkRequest,
  HomeworkDetail,
  HomeworkListItem,
  HomeworkStats,
  StudentHomeworkSubmissionItem,
} from '../models/homework.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HomeworkService {
  private readonly api = inject(ApiService);

  getList(
    classId?: string,
    subjectId?: string,
    status?: string,
    search?: string,
  ): Observable<HomeworkListItem[]> {
    let params = new HttpParams();
    if (classId) params = params.set('classId', classId);
    if (subjectId) params = params.set('subjectId', subjectId);
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.api.get<HomeworkListItem[]>('homework', params);
  }

  getStats(): Observable<HomeworkStats> {
    return this.api.get<HomeworkStats>('homework/stats');
  }

  getById(id: string): Observable<HomeworkDetail> {
    return this.api.get<HomeworkDetail>(`homework/${id}`);
  }

  create(request: CreateHomeworkRequest): Observable<HomeworkDetail> {
    return this.api.post<HomeworkDetail>('homework', request);
  }

  update(id: string, request: CreateHomeworkRequest): Observable<HomeworkDetail> {
    return this.api.put<HomeworkDetail>(`homework/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`homework/${id}`);
  }

  submitSubmissions(id: string, students: StudentHomeworkSubmissionItem[]): Observable<HomeworkDetail> {
    return this.api.post<HomeworkDetail>(`homework/${id}/submit-submissions`, { students });
  }

  updateSubmissions(id: string, students: StudentHomeworkSubmissionItem[]): Observable<HomeworkDetail> {
    return this.api.put<HomeworkDetail>(`homework/${id}/submissions`, { students });
  }
}
