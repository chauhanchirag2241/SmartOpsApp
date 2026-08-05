import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { HomeSpotlightCard } from '../../home-dashboard.models';

@Component({
  selector: 'app-hd-spotlight-card',
  templateUrl: './hd-spotlight-card.component.html',
  styleUrls: ['./hd-spotlight-card.component.scss'],
  imports: [IonIcon],
})
export class HdSpotlightCardComponent {
  @Input({ required: true }) card!: HomeSpotlightCard;
  @Output() cta = new EventEmitter<HomeSpotlightCard>();
  @Output() viewAll = new EventEmitter<HomeSpotlightCard>();

  get progressPct(): number {
    const p = this.card.progress;
    if (p == null || Number.isNaN(p)) return 0;
    return Math.max(0, Math.min(100, Math.round(p * 100)));
  }
}
