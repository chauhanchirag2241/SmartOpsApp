import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SubjectDropdownItem {
  id: string;
  name?: string;
  subjectName?: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly api = inject(ApiService);

  getSubjectDropdown(): Observable<SubjectDropdownItem[]> {
    return this.api.get<SubjectDropdownItem[]>('subject/dropdown');
  }
}
