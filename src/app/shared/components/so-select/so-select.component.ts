import { Component, EventEmitter, Input, Output, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { SoSelectSheetComponent } from './so-select-sheet.component';
import { SoSelectOption } from './so-select.model';

export { SoSelectOption } from './so-select.model';

/**
 * Shared themed single-select for SmartOpsApp filters/forms.
 * Opens a searchable sheet through ModalController so it also works when
 * rendered inside another sheet (filter popover).
 */
@Component({
  selector: 'so-select',
  standalone: true,
  templateUrl: './so-select.component.html',
  styleUrls: ['./so-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoSelectComponent),
      multi: true,
    },
  ],
})
export class SoSelectComponent implements ControlValueAccessor {
  @Input() options: SoSelectOption[] = [];
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() searchPlaceholder = 'Search';
  /** When false, the sheet hides the search bar (useful for short lists). */
  @Input() showSearch = true;

  @Output() valueChange = new EventEmitter<string>();

  value = '';
  isOpen = false;

  private readonly modalCtrl = inject(ModalController);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label ?? '';
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  async open(): Promise<void> {
    if (this.disabled || this.isOpen) return;

    this.isOpen = true;
    try {
      const compact = !this.showSearch && this.options.length <= 6;
      const modal = await this.modalCtrl.create({
        component: SoSelectSheetComponent,
        componentProps: {
          options: this.options,
          value: this.value,
          title: this.placeholder,
          searchPlaceholder: this.searchPlaceholder,
          showSearch: this.showSearch,
        },
        cssClass: 'so-search-select-modal',
        initialBreakpoint: compact ? 0.42 : 0.72,
        breakpoints: compact ? [0, 0.42, 0.72] : [0, 0.72, 0.95],
        handle: true,
        handleBehavior: 'cycle',
      });

      await modal.present();
      const { data, role } = await modal.onWillDismiss<string>();
      this.onTouched();

      if (role === 'selected' && data !== undefined && data !== this.value) {
        this.value = data ?? '';
        this.onChange(this.value);
        this.valueChange.emit(this.value);
      }
    } finally {
      this.isOpen = false;
    }
  }
}
