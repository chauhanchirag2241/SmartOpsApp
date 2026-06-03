import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonModal } from '@ionic/angular/standalone';

@Component({
  selector: 'so-filter-popover',
  templateUrl: './so-filter-popover.component.html',
  styleUrls: ['./so-filter-popover.component.scss'],
  imports: [IonModal],
})
export class SoFilterPopoverComponent {
  @Input() isOpen = false;
  @Input() title = 'Filters';
  @Input() showClear = true;
  /** Bottom sheet open height (0–1). Tune per page if needed. */
  @Input() initialBreakpoint = 0.55;
  @Input() maxBreakpoint = 0.85;
  @Output() closed = new EventEmitter<void>();
  @Output() cleared = new EventEmitter<void>();
  @Output() applied = new EventEmitter<void>();

  onDismiss(): void {
    this.closed.emit();
  }

  onClear(): void {
    this.cleared.emit();
  }

  onApply(): void {
    this.applied.emit();
    this.closed.emit();
  }
}
