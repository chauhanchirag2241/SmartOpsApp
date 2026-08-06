import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  MyTimetableResponse,
  TimetableGrid,
  buildPeriodsByDay,
} from '../models/timetable.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private readonly api = inject(ApiService);

  getMyTimetable(academicYearId: string, asOf?: string): Observable<MyTimetableResponse> {
    let params = new HttpParams().set('academicYearId', academicYearId);
    if (asOf) params = params.set('asOf', asOf);
    return this.api.get<MyTimetableResponse>('timetables/my', params).pipe(
      map((res) => ({
        ...res,
        grid: this.normalizeGrid(res?.grid),
      })),
    );
  }

  getClassGrid(classId: string, academicYearId: string, asOf?: string): Observable<TimetableGrid> {
    let params = new HttpParams()
      .set('classId', classId)
      .set('academicYearId', academicYearId);
    if (asOf) params = params.set('asOf', asOf);
    return this.api
      .get<TimetableGrid>('timetables/class-grid', params)
      .pipe(map((grid) => this.normalizeGrid(grid)));
  }

  private normalizeGrid(grid: TimetableGrid | null | undefined): TimetableGrid {
    const periods = grid?.periods ?? [];
    const slots = grid?.slots ?? [];
    const periodsByDay =
      grid?.periodsByDay && Object.keys(grid.periodsByDay).length
        ? grid.periodsByDay
        : buildPeriodsByDay(periods);
    return {
      ...grid,
      periods,
      slots,
      periodsByDay,
      version: grid?.version ?? null,
    };
  }
}
