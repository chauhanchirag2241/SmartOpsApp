import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { catchError, firstValueFrom, of } from 'rxjs';
import { routes } from './app.routes';
import { academicYearInterceptor } from './core/interceptors/academic-year.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { AcademicYearContextService } from './core/services/academic-year-context.service';
import { AuthService } from './core/services/auth.service';
import { TenantService } from './core/services/tenant.service';

function appInitializer(
  tenant: TenantService,
  auth: AuthService,
  ay: AcademicYearContextService,
): () => Promise<void> {
  return () => {
    tenant.init();
    if (!auth.isLoggedIn) {
      return Promise.resolve();
    }
    return firstValueFrom(ay.loadCurrentYear().pipe(catchError(() => of(null)))).then(() => undefined);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideIonicAngular({ mode: 'ios' }),
    provideHttpClient(withInterceptors([tenantInterceptor, academicYearInterceptor, authTokenInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [TenantService, AuthService, AcademicYearContextService],
      multi: true,
    },
  ],
};
