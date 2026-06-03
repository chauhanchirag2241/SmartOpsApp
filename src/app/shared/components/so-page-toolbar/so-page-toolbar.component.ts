import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'so-page-toolbar',
  templateUrl: './so-page-toolbar.component.html',
  styleUrls: ['./so-page-toolbar.component.scss'],
})
export class SoPageToolbarComponent {
  @Input() totalCount: number | null = null;
  @Input() totalLabel = 'Total';
  @Output() filterClick = new EventEmitter<void>();
}
