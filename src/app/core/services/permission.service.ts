import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, tap } from 'rxjs';
import { APP_MENU_APPLICATION } from '../constants/app.constants';
import { MOBILE_MENU_ROUTES, MobileMenuRoute } from '../config/mobile-menu.config';
import { IMenu } from '../models/menu.model';
import { IMenuPermission, IUserPermissionResponse } from '../models/permission.model';
import { isUsableAccessToken } from '../utils/token.util';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

const PERMISSIONS_KEY = 'mobile_permissions';
const MENUS_KEY = 'mobile_menus';
const TOKEN_KEY = 'mobile_token';
const APP_QUERY = `app=${APP_MENU_APPLICATION}`;

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);

  private readonly permissionsSubject = new BehaviorSubject<IMenuPermission[]>(this.readCachedPermissions());
  private readonly menusSubject = new BehaviorSubject<IMenu[]>(this.readCachedMenus());

  readonly permissions$ = this.permissionsSubject.asObservable();
  readonly menus$ = this.menusSubject.asObservable();

  get permissions(): IMenuPermission[] {
    return this.permissionsSubject.value;
  }

  get menus(): IMenu[] {
    return this.menusSubject.value;
  }

  loadSession(): Observable<void> {
    return forkJoin({
      permissions: this.api.get<IUserPermissionResponse>(`auth/permissions?${APP_QUERY}`),
      menus: this.api.get<IMenu[]>(`menus/my?${APP_QUERY}`),
    }).pipe(
      tap(({ permissions, menus }) => {
        const perms = this.normalizePermissions(permissions);
        const menuTree = this.normalizeMenus(menus);
        this.setSession(perms, menuTree);
      }),
      map(() => void 0),
    );
  }

  setSession(permissions: IMenuPermission[], menus: IMenu[]): void {
    this.storage.set(PERMISSIONS_KEY, permissions);
    this.storage.set(MENUS_KEY, menus);
    this.permissionsSubject.next(permissions);
    this.menusSubject.next(menus);
  }

  clear(): void {
    this.storage.remove(PERMISSIONS_KEY);
    this.storage.remove(MENUS_KEY);
    this.permissionsSubject.next([]);
    this.menusSubject.next([]);
  }

  getPermission(menuCode: string): IMenuPermission | undefined {
    return this.permissions.find((p) => p.menuCode === menuCode);
  }

  canView(menuCode: string): boolean {
    return this.getPermission(menuCode)?.canView ?? false;
  }

  canAdd(menuCode: string): boolean {
    return this.getPermission(menuCode)?.canAdd ?? false;
  }

  canEdit(menuCode: string): boolean {
    return this.getPermission(menuCode)?.canEdit ?? false;
  }

  canDelete(menuCode: string): boolean {
    return this.getPermission(menuCode)?.canDelete ?? false;
  }

  /** Flatten API menu tree to codes the user can open on mobile. */
  getMobileEntries(): MobileMenuRoute[] {
    const flat = this.flattenMenuCodes(this.menus);
    const seen = new Set<string>();
    const entries: MobileMenuRoute[] = [];

    for (const code of flat) {
      if (seen.has(code) || !this.canView(code)) {
        continue;
      }
      const route = MOBILE_MENU_ROUTES[code];
      if (route) {
        seen.add(code);
        entries.push(route);
      }
    }

    if (!entries.length && (this.canView('DASHBOARD') || this.permissions.length === 0)) {
      const dash = MOBILE_MENU_ROUTES['DASHBOARD'];
      if (dash) {
        entries.push(dash);
      }
    }

    return entries.sort((a, b) => {
      const order = ['DASHBOARD', 'ATTENDANCE', 'HOMEWORK'];
      return order.indexOf(a.menuCode) - order.indexOf(b.menuCode);
    });
  }

  hasTab(tab: string): boolean {
    return this.getMobileEntries().some((e) => e.tab === tab);
  }

  private flattenMenuCodes(menus: IMenu[]): string[] {
    const codes: string[] = [];
    const walk = (items: IMenu[]) => {
      for (const m of items) {
        if (m.code) {
          codes.push(m.code);
        }
        if (m.children?.length) {
          walk(m.children);
        }
      }
    };
    walk(menus);
    return codes;
  }

  private normalizePermissions(raw: IUserPermissionResponse | Record<string, unknown>): IMenuPermission[] {
    const r = raw as Record<string, unknown>;
    const list = (r['permissions'] ?? r['Permissions'] ?? []) as Record<string, unknown>[];
    return list.map((p) => ({
      menuCode: String(p['menuCode'] ?? p['MenuCode'] ?? ''),
      canView: !!(p['canView'] ?? p['CanView']),
      canAdd: !!(p['canAdd'] ?? p['CanAdd']),
      canEdit: !!(p['canEdit'] ?? p['CanEdit']),
      canDelete: !!(p['canDelete'] ?? p['CanDelete']),
      canExport: !!(p['canExport'] ?? p['CanExport']),
    }));
  }

  private normalizeMenus(raw: unknown): IMenu[] {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((item) => this.normalizeMenu(item as Record<string, unknown>));
  }

  private normalizeMenu(raw: Record<string, unknown>): IMenu {
    const children = (raw['children'] ?? raw['Children'] ?? []) as Record<string, unknown>[];
    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      name: String(raw['name'] ?? raw['Name'] ?? ''),
      code: String(raw['code'] ?? raw['Code'] ?? ''),
      route: (raw['route'] ?? raw['Route']) as string | null,
      icon: (raw['icon'] ?? raw['Icon']) as string | null,
      displayOrder: Number(raw['displayOrder'] ?? raw['DisplayOrder'] ?? 0),
      children: children.map((c) => this.normalizeMenu(c)),
    };
  }

  private readCachedPermissions(): IMenuPermission[] {
    return this.hasStoredToken() ? (this.storage.get<IMenuPermission[]>(PERMISSIONS_KEY) ?? []) : [];
  }

  private readCachedMenus(): IMenu[] {
    return this.hasStoredToken() ? (this.storage.get<IMenu[]>(MENUS_KEY) ?? []) : [];
  }

  private hasStoredToken(): boolean {
    return isUsableAccessToken(this.storage.get<string>(TOKEN_KEY));
  }
}
