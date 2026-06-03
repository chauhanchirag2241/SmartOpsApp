import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export function menuPermissionGuard(menuCode: string): CanActivateFn {
  return () => {
    const permissions = inject(PermissionService);
    const router = inject(Router);

    if (permissions.canView(menuCode)) {
      return true;
    }

    return router.createUrlTree(['/tabs/home']);
  };
}
