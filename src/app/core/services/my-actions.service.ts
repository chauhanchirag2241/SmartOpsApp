import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MyActionsService {
  private readonly api = inject(ApiService);

  getList(): Observable<unknown[]> {
    return this.api.get('my-actions');
  }

  getStats(): Observable<unknown> {
    return this.api.get('my-actions/stats');
  }

  getById(id: string): Observable<unknown> {
    return this.api.get(`my-actions/${id}`);
  }

  complete(id: string, body: { actionCode: string; comment?: string; payload?: string }): Observable<unknown> {
    return this.api.post(`my-actions/${id}/complete`, body);
  }
}
