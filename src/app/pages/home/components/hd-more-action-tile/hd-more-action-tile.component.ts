import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { HomeMoreAction } from '../../home-dashboard.models';

@Component({
  selector: 'app-hd-more-action-tile',
  templateUrl: './hd-more-action-tile.component.html',
  styleUrls: ['./hd-more-action-tile.component.scss'],
  imports: [IonIcon],
})
export class HdMoreActionTileComponent {
  @Input({ required: true }) action!: HomeMoreAction;
  @Output() open = new EventEmitter<HomeMoreAction>();
}
