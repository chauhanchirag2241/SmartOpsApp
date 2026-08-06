import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export function menuPermissionGuard(menuCode: string): CanActivateFn {
  return anyMenuPermissionGuard(menuCode);
}

/** Allows access when the user can view any of the given menu codes. */
export function anyMenuPermissionGuard(...menuCodes: string[]): CanActivateFn {
  return () => {
    const permissions = inject(PermissionService);
    const router = inject(Router);

    if (menuCodes.some((code) => permissions.canView(code))) {
      return true;
    }

    return router.createUrlTree(['/tabs/home']);
  };
}
