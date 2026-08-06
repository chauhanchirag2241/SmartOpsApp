import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiService } from './api.service';

export interface SubjectDropdownItem {
  id: string;
  name?: string;
  subjectName?: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly api = inject(ApiService);
  private dropdown$?: Observable<SubjectDropdownItem[]>;

  getSubjectDropdown(): Observable<SubjectDropdownItem[]> {
    if (!this.dropdown$) {
      this.dropdown$ = this.api
        .get<SubjectDropdownItem[]>('subject/dropdown')
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.dropdown$;
  }

  clearCache(): void {
    this.dropdown$ = undefined;
  }
}
