import { Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';

/** Host for /tabs/home — bottom nav is provided globally by app-bottom-nav. */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonRouterOutlet],
})
export class TabsPage {}
