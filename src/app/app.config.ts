import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { routes } from './app.routes';
import { academicYearInterceptor } from './core/interceptors/academic-year.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { branchInterceptor } from './core/interceptors/branch.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { AcademicYearContextService } from './core/services/academic-year-context.service';
import { AuthService } from './core/services/auth.service';
import { BranchContextService } from './core/services/branch-context.service';
import { FilterLookupService } from './core/services/filter-lookup.service';
import { TenantService } from './core/services/tenant.service';

function appInitializer(
  tenant: TenantService,
  auth: AuthService,
  branch: BranchContextService,
  ay: AcademicYearContextService,
  lookups: FilterLookupService,
): () => Promise<void> {
  return () => {
    tenant.init();
    if (!auth.isLoggedIn) {
      return Promise.resolve();
    }
    return firstValueFrom(
      branch.loadBranches().pipe(
        catchError(() => of([])),
        switchMap(() => ay.loadCurrentYear().pipe(catchError(() => of(null)))),
        switchMap(() => lookups.preload()),
      ),
    ).then(() => undefined);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideIonicAngular({ mode: 'ios' }),
    provideHttpClient(
      withInterceptors([
        tenantInterceptor,
        branchInterceptor,
        academicYearInterceptor,
        authTokenInterceptor,
      ]),
    ),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [
        TenantService,
        AuthService,
        BranchContextService,
        AcademicYearContextService,
        FilterLookupService,
      ],
      multi: true,
    },
  ],
};
