import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BranchDropdownItem {
  id: string;
  name: string;
  isHeadOffice: boolean;
  isDefault: boolean;
}

export interface MyBranchesResponse {
  branches: BranchDropdownItem[];
  canViewAllBranches: boolean;
}

@Injectable({ providedIn: 'root' })
export class BranchApiService {
  private readonly api = inject(ApiService);

  getMyBranches(): Observable<MyBranchesResponse> {
    return this.api.get<MyBranchesResponse>('branches/my');
  }
}
