import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
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

  /** Session-scoped caches — shared across homework / students / attendance / timetable. */
  private readonly dropdownCache = new Map<string, Observable<ClassDropdownItem[]>>();
  private readonly sectionsByGroupCache = new Map<string, Observable<ClassDropdownItem[]>>();
  private readonly subjectsByGroupCache = new Map<string, Observable<ClassGroupSubjectItem[]>>();

  /** Section-scoped by default (`Class 1 - A`). Pass `'group'` for class groups only. */
  getClassDropdown(scope?: 'group' | 'section'): Observable<ClassDropdownItem[]> {
    const key = scope === 'group' ? 'group' : 'section';
    let cached = this.dropdownCache.get(key);
    if (!cached) {
      let params = new HttpParams();
      if (scope === 'group') {
        params = params.set('scope', 'group');
      }
      cached = this.api
        .get<ClassDropdownItem[]>('class/dropdown', params.keys().length ? params : undefined)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.dropdownCache.set(key, cached);
    }
    return cached;
  }

  /** Sections (classes) for a class group, ascending by section name. */
  getSectionsByClassGroup(classGroupId: string): Observable<ClassDropdownItem[]> {
    const id = (classGroupId || '').trim();
    if (!id) {
      return of([]);
    }

    let cached = this.sectionsByGroupCache.get(id);
    if (!cached) {
      const params = new HttpParams()
        .set('pageIndex', '1')
        .set('pageSize', '200')
        .set('filter', '1') // ClassFilter.Active
        .set('classGroupId', id)
        .set('sortColumn', 'section')
        .set('sortDirection', 'asc');

      cached = this.api.get<PagedClassesResponse>('classes', params).pipe(
        map((res) => {
          const rows = res?.items ?? res?.Items ?? [];
          return rows
            .map((row) => {
              const rowId = String(row.id ?? row.Id ?? '');
              const className = String(row.className ?? row.ClassName ?? '').trim();
              const section = String(row.section ?? row.Section ?? '').trim();
              const name =
                className && section ? `${className} - ${section}` : className || section || rowId;
              return { id: rowId, name, section };
            })
            .sort((a, b) =>
              (a.section || a.name).localeCompare(b.section || b.name, undefined, {
                numeric: true,
                sensitivity: 'base',
              }),
            )
            .map(({ id: rowId, name }) => ({ id: rowId, name }));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.sectionsByGroupCache.set(id, cached);
    }
    return cached;
  }

  getClassGroupSubjects(classGroupId: string): Observable<ClassGroupSubjectItem[]> {
    const id = (classGroupId || '').trim();
    if (!id) {
      return of([]);
    }

    let cached = this.subjectsByGroupCache.get(id);
    if (!cached) {
      cached = this.api
        .get<
          Array<{
            id?: string;
            Id?: string;
            subjectId?: string;
            SubjectId?: string;
            subjectName?: string;
            SubjectName?: string;
          }>
        >(`classGroups/${id}/subjects`)
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
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.subjectsByGroupCache.set(id, cached);
    }
    return cached;
  }

  /** Call on logout / school change so the next session does not see stale lookups. */
  clearCache(): void {
    this.dropdownCache.clear();
    this.sectionsByGroupCache.clear();
    this.subjectsByGroupCache.clear();
  }
}
