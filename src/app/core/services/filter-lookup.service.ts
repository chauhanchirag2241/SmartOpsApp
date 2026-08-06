import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, tap } from 'rxjs';
import { ClassService } from './class.service';
import { SubjectService } from './subject.service';

/**
 * App-wide filter lookup store.
 * Preloads common dropdowns once (class sections, class groups, subjects);
 * every page then reads via ClassService / SubjectService cache — no repeat network.
 */
@Injectable({ providedIn: 'root' })
export class FilterLookupService {
  private readonly classes = inject(ClassService);
  private readonly subjects = inject(SubjectService);

  private lastLoadedAt = 0;
  private preload$?: Observable<void>;

  get isLoaded(): boolean {
    return this.lastLoadedAt > 0;
  }

  /**
   * Warm shared caches for all pages that use class / subject filters.
   * Safe to call multiple times — repeats only when `force` or after {@link clear}.
   */
  preload(options?: { force?: boolean }): Observable<void> {
    if (options?.force) {
      this.clear();
    }

    if (this.preload$ && this.lastLoadedAt > 0) {
      return this.preload$;
    }

    this.preload$ = forkJoin({
      sections: this.classes.getClassDropdown(),
      groups: this.classes.getClassDropdown('group'),
      subjects: this.subjects.getSubjectDropdown(),
    }).pipe(
      tap(() => {
        this.lastLoadedAt = Date.now();
      }),
      map(() => undefined),
      catchError(() => {
        // Do not block app start / login if a lookup fails.
        this.preload$ = undefined;
        this.lastLoadedAt = 0;
        return of(undefined);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.preload$;
  }

  clear(): void {
    this.classes.clearCache();
    this.subjects.clearCache();
    this.preload$ = undefined;
    this.lastLoadedAt = 0;
  }
}
