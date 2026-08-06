import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { BranchApiService, BranchDropdownItem, MyBranchesResponse } from './branch-api.service';
import { StorageService } from './storage.service';

const ACTIVE_BRANCH_KEY = 'mobile_active_branch';
const SELECTED_BRANCHES_KEY = 'mobile_selected_branches';

@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly branchApi = inject(BranchApiService);
  private readonly storage = inject(StorageService);

  private readonly _branches = signal<BranchDropdownItem[]>([]);
  private readonly _activeBranchId = signal<string | null>(this.readStoredActiveBranchId());
  private readonly _selectedBranchIds = signal<string[]>(this.readStoredSelectedBranchIds());

  readonly branches = this._branches.asReadonly();
  readonly activeBranchId = this._activeBranchId.asReadonly();
  readonly selectedBranchIds = this._selectedBranchIds.asReadonly();

  /** Load user branches and set default active branch (sends X-Branch-Id via interceptor). */
  loadBranches(): Observable<BranchDropdownItem[]> {
    return this.branchApi.getMyBranches().pipe(
      tap((response) => {
        const list = this.normalizeBranches(response);
        this._branches.set(list);
        this.ensureValidActiveBranch(list);
      }),
      map(() => this._branches()),
      catchError((err) => {
        console.warn('[BranchContext] Failed to load branches', err);
        // Keep any previously stored active branch so X-Branch-Id can still be sent.
        return of(this._branches());
      }),
    );
  }

  switchBranch(branchId: string): void {
    if (!branchId || !this._branches().some((b) => b.id === branchId)) {
      return;
    }
    this._activeBranchId.set(branchId);
    this.storage.set(ACTIVE_BRANCH_KEY, branchId);
    if (!this._selectedBranchIds().includes(branchId)) {
      this.setSelectedBranches([branchId]);
    }
  }

  setSelectedBranches(branchIds: string[]): void {
    const allowed = new Set(this._branches().map((b) => b.id));
    const filtered = branchIds.filter((id) => allowed.has(id));
    const resolved =
      filtered.length > 0 ? filtered : this._activeBranchId() ? [this._activeBranchId()!] : [];
    this._selectedBranchIds.set(resolved);
    this.storage.set(SELECTED_BRANCHES_KEY, resolved);
  }

  clear(): void {
    this._branches.set([]);
    this._activeBranchId.set(null);
    this._selectedBranchIds.set([]);
    this.storage.remove(ACTIVE_BRANCH_KEY);
    this.storage.remove(SELECTED_BRANCHES_KEY);
  }

  private ensureValidActiveBranch(list: BranchDropdownItem[]): void {
    if (list.length === 0) {
      this._activeBranchId.set(null);
      return;
    }

    const stored = this._activeBranchId();
    if (stored && list.some((b) => b.id === stored)) {
      if (this._selectedBranchIds().length === 0) {
        this.setSelectedBranches([stored]);
      }
      return;
    }

    const defaultBranch = list.find((b) => b.isDefault) ?? list.find((b) => b.isHeadOffice) ?? list[0];
    this.switchBranch(defaultBranch.id);
    if (this._selectedBranchIds().length === 0) {
      this.setSelectedBranches([defaultBranch.id]);
    }
  }

  private normalizeBranches(raw: MyBranchesResponse | Record<string, unknown>): BranchDropdownItem[] {
    const r = raw as Record<string, unknown>;
    const list = (r['branches'] ?? r['Branches'] ?? []) as Array<BranchDropdownItem | Record<string, unknown>>;
    return (list ?? []).map((row) => {
      const b = row as Record<string, unknown>;
      return {
        id: String(b['id'] ?? b['Id'] ?? ''),
        name: String(b['name'] ?? b['Name'] ?? ''),
        isHeadOffice: !!(b['isHeadOffice'] ?? b['IsHeadOffice']),
        isDefault: !!(b['isDefault'] ?? b['IsDefault']),
      };
    }).filter((b) => !!b.id);
  }

  private readStoredActiveBranchId(): string | null {
    const raw = this.storage.get<string>(ACTIVE_BRANCH_KEY);
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }

  private readStoredSelectedBranchIds(): string[] {
    const raw = this.storage.get<string[]>(SELECTED_BRANCHES_KEY);
    return Array.isArray(raw) ? raw : [];
  }
}
