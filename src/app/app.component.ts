import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { AppBottomNavComponent } from './shared/components/app-bottom-nav/app-bottom-nav.component';

const AUTH_PATH_PREFIXES = ['/login', '/school-code', '/change-password'];

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, AppBottomNavComponent],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  get showBottomNav(): boolean {
    if (!this.auth.isLoggedIn || this.auth.mustChangePassword) return false;
    const u = (this.url() || '').split('?')[0];
    return !AUTH_PATH_PREFIXES.some((p) => u === p || u.startsWith(`${p}/`));
  }
}
