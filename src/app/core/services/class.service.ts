import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface ClassDropdownItem {
  id: string;
  name: string;
}

export interface ClassGroupSubjectItem {
  id: string;
  subjectId: string;
  subjectName: string;
}

interface PagedClassesResponse {
  items?: Array<{
    id?: string;
    Id?: string;
    classGroupId?: string;
    ClassGroupId?: string;
    className?: string;
    ClassName?: string;
    section?: string;
    Section?: string;
  }>;
  Items?: Array<{
    id?: string;
    Id?: string;
    classGroupId?: string;
    ClassGroupId?: string;
    className?: string;
    ClassName?: string;
    section?: string;
    Section?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly api = inject(ApiService);

  /** Section-scoped by default (`Class 1 - A`). Pass `'group'` for class groups only. */
  getClassDropdown(scope?: 'group' | 'section'): Observable<ClassDropdownItem[]> {
    let params = new HttpParams();
    if (scope === 'group') {
      params = params.set('scope', 'group');
    }
    return this.api.get<ClassDropdownItem[]>(
      'class/dropdown',
      params.keys().length ? params : undefined,
    );
  }

  /** Sections (classes) for a class group, ascending by section name. */
  getSectionsByClassGroup(classGroupId: string): Observable<ClassDropdownItem[]> {
    const params = new HttpParams()
      .set('pageIndex', '1')
      .set('pageSize', '200')
      .set('filter', '1') // ClassFilter.Active
      .set('classGroupId', classGroupId)
      .set('sortColumn', 'section')
      .set('sortDirection', 'asc');

    return this.api.get<PagedClassesResponse>('classes', params).pipe(
      map((res) => {
        const rows = res?.items ?? res?.Items ?? [];
        return rows
          .map((row) => {
            const id = String(row.id ?? row.Id ?? '');
            const className = String(row.className ?? row.ClassName ?? '').trim();
            const section = String(row.section ?? row.Section ?? '').trim();
            const name =
              className && section ? `${className} - ${section}` : className || section || id;
            return { id, name, section };
          })
          .sort((a, b) =>
            (a.section || a.name).localeCompare(b.section || b.name, undefined, {
              numeric: true,
              sensitivity: 'base',
            }),
          )
          .map(({ id, name }) => ({ id, name }));
      }),
    );
  }

  getClassGroupSubjects(classGroupId: string): Observable<ClassGroupSubjectItem[]> {
    return this.api
      .get<
        Array<{
          id?: string;
          Id?: string;
          subjectId?: string;
          SubjectId?: string;
          subjectName?: string;
          SubjectName?: string;
        }>
      >(`classGroups/${classGroupId}/subjects`)
      .pipe(
        map((rows) =>
          (rows || []).map((row) => {
            const subjectId = String(row.subjectId ?? row.SubjectId ?? row.id ?? row.Id ?? '');
            return {
              id: subjectId,
              subjectId,
              subjectName: String(row.subjectName ?? row.SubjectName ?? ''),
            };
          }),
        ),
      );
  }
}
