import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { HomePrimaryAction } from '../../home-dashboard.models';

@Component({
  selector: 'app-hd-primary-action-card',
  templateUrl: './hd-primary-action-card.component.html',
  styleUrls: ['./hd-primary-action-card.component.scss'],
  imports: [IonIcon],
})
export class HdPrimaryActionCardComponent {
  @Input({ required: true }) action!: HomePrimaryAction;
  @Output() open = new EventEmitter<HomePrimaryAction>();
}
