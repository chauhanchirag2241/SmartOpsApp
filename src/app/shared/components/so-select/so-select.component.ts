import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';

export interface SoSelectOption {
  label: string;
  value: string;
}

/**
 * Shared themed select for SmartOpsApp filters/forms.
 * Uses Ionic ion-select so highlight/focus follow --so-primary / --ion-color-primary.
 */
@Component({
  selector: 'so-select',
  standalone: true,
  imports: [FormsModule, IonSelect, IonSelectOption],
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
  /** Ionic select interface: action-sheet works reliably inside filter modals. */
  @Input() interface: 'action-sheet' | 'popover' | 'alert' = 'action-sheet';
  @Input() ariaLabel = '';

  @Output() valueChange = new EventEmitter<string>();

  value = '';

  get interfaceOpts(): Record<string, unknown> {
    return { cssClass: 'so-select-interface', header: this.placeholder };
  }

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

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

  onValueChange(next: string): void {
    this.value = next ?? '';
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.onTouched();
  }
}
