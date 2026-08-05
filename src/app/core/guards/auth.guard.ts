import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (!tenant.hasTenant) {
    return router.createUrlTree(['/school-code']);
  }

  if (!auth.isLoggedIn) {
    auth.ensureValidSessionOrClear();
    return router.createUrlTree(['/login']);
  }

  if (auth.mustChangePassword) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
