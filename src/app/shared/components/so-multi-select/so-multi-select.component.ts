import { Component, EventEmitter, Input, Output, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { SoSelectOption } from '../so-select/so-select.model';
import { SoMultiSelectSheetComponent } from './so-multi-select-sheet.component';

/**
 * Shared themed multi-select for SmartOpsApp filters/forms.
 * Opens a searchable sheet through ModalController so it also works inside filter sheets.
 */
@Component({
  selector: 'so-multi-select',
  standalone: true,
  templateUrl: './so-multi-select.component.html',
  styleUrls: ['./so-multi-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoMultiSelectComponent),
      multi: true,
    },
  ],
})
export class SoMultiSelectComponent implements ControlValueAccessor {
  @Input() options: SoSelectOption[] = [];
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() searchPlaceholder = 'Search';

  @Output() valueChange = new EventEmitter<string[]>();

  value: string[] = [];
  isOpen = false;

  private readonly modalCtrl = inject(ModalController);

  private onChange: (value: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get selectedLabel(): string {
    if (!this.value.length) return '';
    if (this.value.length === 1) {
      return this.options.find((option) => option.value === this.value[0])?.label ?? '1 selected';
    }
    return `${this.value.length} selected`;
  }

  writeValue(value: string[] | null): void {
    this.value = Array.isArray(value) ? [...value] : [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
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
      const modal = await this.modalCtrl.create({
        component: SoMultiSelectSheetComponent,
        componentProps: {
          options: this.options,
          value: this.value,
          title: this.placeholder,
          searchPlaceholder: this.searchPlaceholder,
        },
        cssClass: 'so-search-select-modal',
        initialBreakpoint: 0.78,
        breakpoints: [0, 0.78, 0.95],
        handle: true,
        handleBehavior: 'cycle',
      });

      await modal.present();
      const { data, role } = await modal.onWillDismiss<string[]>();
      this.onTouched();

      if (role === 'selected' && Array.isArray(data)) {
        const next = [...data];
        const same =
          next.length === this.value.length && next.every((id) => this.value.includes(id));
        if (!same) {
          this.value = next;
          this.onChange(this.value);
          this.valueChange.emit(this.value);
        }
      }
    } finally {
      this.isOpen = false;
    }
  }
}
