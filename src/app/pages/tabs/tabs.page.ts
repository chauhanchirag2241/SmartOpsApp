import { Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, homeOutline, checkboxOutline } from 'ionicons/icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  private readonly permissions = inject(PermissionService);

  showAttendance = this.permissions.hasTab('attendance') || this.permissions.canView(MenuCodes.Attendance);
  showHomework = this.permissions.hasTab('homework') || this.permissions.canView(MenuCodes.Homework);

  constructor() {
    addIcons({ homeOutline, checkboxOutline, bookOutline });
  }
}
