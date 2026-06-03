import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ClassDropdownItem {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly api = inject(ApiService);

  getClassDropdown(): Observable<ClassDropdownItem[]> {
    return this.api.get<ClassDropdownItem[]>('class/dropdown');
  }
}
