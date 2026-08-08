import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateHomeworkRequest,
  HomeworkDetail,
  HomeworkListItem,
  HomeworkStats,
  PagedStudentHomework,
  StudentHomeworkItem,
  StudentHomeworkSubmissionItem,
} from '../models/homework.model';
import { ApiService } from './api.service';
import { map } from 'rxjs/operators';

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

  /** Student portal list (own class + own status), page-wise. */
  getMyList(
    status?: string,
    search?: string,
    pageIndex = 1,
    pageSize = 10,
  ): Observable<PagedStudentHomework> {
    let params = new HttpParams()
      .set('pageIndex', String(pageIndex))
      .set('pageSize', String(pageSize));
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.api.get<PagedStudentHomework | Record<string, unknown>>('homework/my', params).pipe(
      map((res) => this.mapPagedStudent(res)),
    );
  }

  getMyById(id: string): Observable<StudentHomeworkItem> {
    return this.api
      .get<StudentHomeworkItem | Record<string, unknown>>(`homework/my/${id}`)
      .pipe(map((row) => this.mapStudentItem(row)));
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

  private mapPagedStudent(raw: PagedStudentHomework | Record<string, unknown>): PagedStudentHomework {
    const r = raw as Record<string, unknown>;
    const itemsRaw = (r['items'] ?? r['Items'] ?? []) as Array<StudentHomeworkItem | Record<string, unknown>>;
    const items = itemsRaw.map((row) => this.mapStudentItem(row));
    const totalCount = Number(r['totalCount'] ?? r['TotalCount'] ?? items.length);
    const pageIndex = Number(r['pageIndex'] ?? r['PageIndex'] ?? 1);
    const pageSize = Number(r['pageSize'] ?? r['PageSize'] ?? 10) || 10;
    const totalPages = Number(
      r['totalPages'] ??
        r['TotalPages'] ??
        (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0),
    );
    return { items, totalCount, pageIndex, pageSize, totalPages };
  }

  private mapStudentItem(raw: StudentHomeworkItem | Record<string, unknown>): StudentHomeworkItem {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      title: String(r['title'] ?? r['Title'] ?? ''),
      description: (r['description'] ?? r['Description']) as string | null,
      classId: String(r['classId'] ?? r['ClassId'] ?? ''),
      className: String(r['className'] ?? r['ClassName'] ?? ''),
      subjectId: String(r['subjectId'] ?? r['SubjectId'] ?? ''),
      subjectName: String(r['subjectName'] ?? r['SubjectName'] ?? ''),
      assignDate: String(r['assignDate'] ?? r['AssignDate'] ?? ''),
      dueDate: String(r['dueDate'] ?? r['DueDate'] ?? ''),
      marks: (r['marks'] ?? r['Marks']) as number | null,
      submissionType: Number(r['submissionType'] ?? r['SubmissionType'] ?? 0),
      submissionTypeLabel: String(r['submissionTypeLabel'] ?? r['SubmissionTypeLabel'] ?? ''),
      myStatus: String(r['myStatus'] ?? r['MyStatus'] ?? 'pending').toLowerCase(),
      submittedOn: (r['submittedOn'] ?? r['SubmittedOn']) as string | null,
      myMarks: (r['myMarks'] ?? r['MyMarks']) as number | null,
      remark: (r['remark'] ?? r['Remark']) as string | null,
    };
  }
}
