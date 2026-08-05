import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';

/** Requires a resolved tenant (stored school or host/env fallback). */
export const tenantGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (tenant.hasTenant) {
    return true;
  }

  return router.createUrlTree(['/school-code']);
};
