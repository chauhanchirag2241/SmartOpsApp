import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { HomeHeaderInfo } from '../../home-dashboard.models';

@Component({
  selector: 'app-hd-user-header',
  templateUrl: './hd-user-header.component.html',
  styleUrls: ['./hd-user-header.component.scss'],
  imports: [IonIcon],
})
export class HdUserHeaderComponent {
  @Input({ required: true }) info!: HomeHeaderInfo;
  @Output() notifications = new EventEmitter<void>();
  @Output() profile = new EventEmitter<void>();
}
