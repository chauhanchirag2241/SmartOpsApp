import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

export interface CurrentAcademicYear {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AcademicYearContextService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly yearKey = 'mobile_academic_year_id';

  private readonly _currentYear = signal<CurrentAcademicYear | null>(null);
  readonly currentYear = this._currentYear.asReadonly();

  effectiveYearId(): string | null {
    return this._currentYear()?.id ?? this.storage.get<string>(this.yearKey);
  }

  isReadOnlyScope(): boolean {
    return false;
  }

  loadCurrentYear(): Observable<CurrentAcademicYear> {
    return this.api.get<CurrentAcademicYear>('academic-year/current').pipe(
      tap((year) => {
        const normalized = this.normalizeYear(year);
        this._currentYear.set(normalized);
        if (normalized.id) {
          this.storage.set(this.yearKey, normalized.id);
        }
      }),
    );
  }

  private normalizeYear(raw: CurrentAcademicYear | Record<string, unknown>): CurrentAcademicYear {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      name: String(r['name'] ?? r['Name'] ?? ''),
      startDate: (r['startDate'] ?? r['StartDate']) as string | undefined,
      endDate: (r['endDate'] ?? r['EndDate']) as string | undefined,
      isCurrent: !!(r['isCurrent'] ?? r['IsCurrent']),
    };
  }
}
