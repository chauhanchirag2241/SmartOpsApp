import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StoredTenant } from '../models/school-bootstrap.model';
import { StorageService } from './storage.service';

export const TENANT_STORAGE_KEY = 'mobile_tenant';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly storage = inject(StorageService);
  private _subdomain: string | null = null;
  private _tenant: StoredTenant | null = null;

  get subdomain(): string | null {
    return this._subdomain;
  }

  get tenant(): StoredTenant | null {
    return this._tenant;
  }

  get hasTenant(): boolean {
    return !!this._subdomain;
  }

  init(): void {
    const stored = this.storage.get<StoredTenant>(TENANT_STORAGE_KEY);
    if (stored?.subdomain?.trim()) {
      this.applyTenant(stored);
      return;
    }

    const fromHostOrEnv = this.resolveSubdomain();
    if (fromHostOrEnv) {
      this._subdomain = fromHostOrEnv;
      this._tenant = null;
      return;
    }

    this._subdomain = null;
    this._tenant = null;
  }

  setTenant(tenant: StoredTenant): void {
    const normalized: StoredTenant = {
      id: tenant.id,
      name: tenant.name.trim(),
      subdomain: tenant.subdomain.trim().toLowerCase(),
      schoolCode: tenant.schoolCode.trim(),
    };
    this.storage.set(TENANT_STORAGE_KEY, normalized);
    this.applyTenant(normalized);
  }

  clearTenant(): void {
    this.storage.remove(TENANT_STORAGE_KEY);
    this._subdomain = null;
    this._tenant = null;
  }

  /** Host-based or local-dev env fallback (used only when nothing is stored). */
  resolveSubdomain(): string | null {
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    if (host === 'localhost' || host === '127.0.0.1') {
      return environment.tenantSubdomain?.trim() || null;
    }
    const parts = host.split('.');
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub === 'www' || sub === 'admin' || sub === 'api') {
        return null;
      }
      return sub;
    }
    return null;
  }

  private applyTenant(tenant: StoredTenant): void {
    this._tenant = tenant;
    this._subdomain = tenant.subdomain;
  }
}
