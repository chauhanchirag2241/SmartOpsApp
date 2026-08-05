import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { clipboardOutline, homeOutline, megaphoneOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  constructor() {
    addIcons({ homeOutline, clipboardOutline, megaphoneOutline, personOutline });
  }

  goHome(): void {
    void this.router.navigateByUrl('/tabs/home');
  }

  goAttendance(): void {
    void this.router.navigateByUrl('/attendance');
  }

  async comingSoon(label: string): Promise<void> {
    const t = await this.toast.create({
      message: `${label} is coming soon on mobile.`,
      duration: 2200,
      position: 'bottom',
    });
    await t.present();
  }
}
