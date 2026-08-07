import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BulkCreateExamSchedulesRequest,
  BulkCreateExamSchedulesResult,
  ExamDetail,
  ExamGradeScale,
  ExamGroup,
  ExamListItem,
  ExamScheduleItem,
  SaveExamRequest,
} from '../models/exam.model';
import { ApiService } from './api.service';

/**
 * Exam APIs shared with SmartOpsUI (web). Same ASP.NET endpoints for web and mobile.
 */
@Injectable({ providedIn: 'root' })
export class ExamService {
  private readonly api = inject(ApiService);

  /** Shared with SmartOpsUI — used by web and mobile. GET /api/exam-groups */
  getGroups(): Observable<ExamGroup[]> {
    return this.api.get<ExamGroup[]>('exam-groups');
  }

  /** Shared with SmartOpsUI — used by web and mobile. GET /api/exam-grade-scales */
  getGradeScales(): Observable<ExamGradeScale[]> {
    return this.api.get<ExamGradeScale[]>('exam-grade-scales');
  }

  /** Shared with SmartOpsUI — used by web and mobile. GET /api/exams */
  getExams(filters?: {
    groupId?: string;
    classId?: string;
    status?: number;
    search?: string;
    /** Soft-deleted exams only (mobile Active/Deleted filter). */
    inactiveOnly?: boolean;
  }): Observable<ExamListItem[]> {
    let params = new HttpParams();
    if (filters?.groupId) params = params.set('groupId', filters.groupId);
    if (filters?.classId) params = params.set('classId', filters.classId);
    if (filters?.status !== undefined && filters.status !== null) {
      params = params.set('status', String(filters.status));
    }
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.inactiveOnly) params = params.set('inactiveOnly', 'true');
    return this.api.get<ExamListItem[]>('exams', params.keys().length ? params : undefined);
  }

  /** Shared with SmartOpsUI — used by web and mobile. GET /api/exams/{id} */
  getExam(id: string): Observable<ExamDetail> {
    return this.api.get<ExamDetail>(`exams/${id}`);
  }

  /** Shared with SmartOpsUI — used by web and mobile. POST /api/exams */
  createExam(data: SaveExamRequest): Observable<ExamDetail> {
    return this.api.post<ExamDetail>('exams', data);
  }

  /** Shared with SmartOpsUI — used by web and mobile. PUT /api/exams/{id} */
  updateExam(id: string, data: SaveExamRequest): Observable<ExamDetail> {
    return this.api.put<ExamDetail>(`exams/${id}`, data);
  }

  /** Shared with SmartOpsUI — used by web and mobile. DELETE /api/exams/{id} */
  deleteExam(id: string): Observable<void> {
    return this.api.delete<void>(`exams/${id}`);
  }

  /** Shared with SmartOpsUI — used by web and mobile. GET /api/exam-schedules */
  getSchedules(examId?: string, classId?: string): Observable<ExamScheduleItem[]> {
    let params = new HttpParams();
    if (examId) params = params.set('examId', examId);
    if (classId) params = params.set('classId', classId);
    return this.api.get<ExamScheduleItem[]>(
      'exam-schedules',
      params.keys().length ? params : undefined,
    );
  }

  /** Shared with SmartOpsUI — used by web and mobile. POST /api/exam-schedules/bulk */
  bulkCreateSchedules(
    data: BulkCreateExamSchedulesRequest,
  ): Observable<BulkCreateExamSchedulesResult> {
    return this.api.post<BulkCreateExamSchedulesResult>('exam-schedules/bulk', data);
  }
}
