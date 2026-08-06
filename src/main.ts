import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { registerSoIcons } from './app/shared/icons/so-icons';

registerSoIcons();

bootstrapApplication(AppComponent, {
  providers: [
    ...appConfig.providers,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
});
