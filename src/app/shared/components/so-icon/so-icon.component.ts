import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { SoIconName } from '../../icons/so-icons';

/**
 * Shared Ionicon wrapper — use SoIcons / common names so screens stay consistent.
 */
@Component({
  selector: 'so-icon',
  standalone: true,
  imports: [IonIcon],
  template: `<ion-icon [name]="name" aria-hidden="true"></ion-icon>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      ion-icon {
        font-size: inherit;
        color: inherit;
      }
    `,
  ],
})
export class SoIconComponent {
  @Input({ required: true }) name!: SoIconName | string;
}
