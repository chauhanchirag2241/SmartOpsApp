import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private _subdomain: string | null = null;

  get subdomain(): string | null {
    return this._subdomain;
  }

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

  init(): void {
    this._subdomain = this.resolveSubdomain();
  }
}
