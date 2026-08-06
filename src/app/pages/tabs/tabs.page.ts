import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { clipboardOutline, homeOutline, megaphoneOutline, personOutline } from 'ionicons/icons';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  constructor() {
    addIcons({ homeOutline, clipboardOutline, megaphoneOutline, personOutline });
  }

  goHome(): void {
    void this.router.navigateByUrl('/tabs/home');
  }

  goAttendance(): void {
    void this.router.navigateByUrl('/attendance');
  }

  comingSoon(label: string): void {
    void this.toast.info(`${label} is coming soon on mobile.`, 2200);
  }
}
