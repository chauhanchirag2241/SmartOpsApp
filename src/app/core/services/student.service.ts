import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { PagedStudentsResult, StudentFilter, StudentListItem } from '../models/student.model';
import { ApiService } from './api.service';

/** Chunk size for roster paging — not a hard cap on how many students load. */
const ROSTER_PAGE_SIZE = 100;

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

  /**
   * Class roster helper (attendance).
   * Loads every active student in the class by paging until complete — no static total cap.
   */
  getStudentsByClass(classId: string): Observable<PagedStudentsResult> {
    const fetchPage = (pageIndex: number) =>
      this.getStudents(pageIndex, ROSTER_PAGE_SIZE, '', null, null, StudentFilter.Active, [classId]).pipe(
        map((res) => this.normalizePagedResult(res)),
      );

    return fetchPage(1).pipe(
      expand((page) =>
        page.pageIndex < page.totalPages && page.items.length > 0
          ? fetchPage(page.pageIndex + 1)
          : EMPTY,
      ),
      reduce(
        (acc, page) => ({
          items: [...acc.items, ...page.items],
          totalCount: page.totalCount,
          pageIndex: 1,
          pageSize: acc.items.length + page.items.length,
          totalPages: 1,
        }),
        { items: [], totalCount: 0, pageIndex: 1, pageSize: 0, totalPages: 0 } as PagedStudentsResult,
      ),
      map((merged) => ({
        ...merged,
        pageSize: merged.items.length,
        totalCount: merged.totalCount || merged.items.length,
      })),
    );
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
      status: (raw['status'] ?? raw['Status']) as string | null,
      isActive: !!(raw['isActive'] ?? raw['IsActive']),
      enrollmentIsActive: !!(raw['enrollmentIsActive'] ?? raw['EnrollmentIsActive']),
    };
  }

  private normalizePagedResult(res: PagedStudentsResult | Record<string, unknown>): PagedStudentsResult {
    const raw = res as unknown as Record<string, unknown>;
    const items = (raw['items'] ?? raw['Items'] ?? []) as StudentListItem[];
    const totalCount = Number(raw['totalCount'] ?? raw['TotalCount'] ?? items.length);
    const pageIndex = Number(raw['pageIndex'] ?? raw['PageIndex'] ?? 1);
    const pageSize = Number(raw['pageSize'] ?? raw['PageSize'] ?? ROSTER_PAGE_SIZE) || ROSTER_PAGE_SIZE;
    const totalPages = Number(
      raw['totalPages'] ??
        raw['TotalPages'] ??
        (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0),
    );
    return { items, totalCount, pageIndex, pageSize, totalPages };
  }
}
