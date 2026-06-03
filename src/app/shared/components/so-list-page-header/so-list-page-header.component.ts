import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'so-list-page-header',
  templateUrl: './so-list-page-header.component.html',
  styleUrls: ['./so-list-page-header.component.scss'],
  imports: [IonButton, IonIcon],
})
export class SoListPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showPrimary = false;
  @Input() primaryLabel = '';
  @Input() primaryIcon = 'add-outline';
  @Output() primaryClick = new EventEmitter<void>();
}
