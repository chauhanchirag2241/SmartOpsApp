import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonDatetime, IonIcon, IonModal } from '@ionic/angular/standalone';
import { formatDisplayDate } from '../../../core/utils/api-mapper.util';
import { SoIcons } from '../../icons/so-icons';

let soDateSeq = 0;

/**
 * Shared iOS-themed date field: calendar icon trigger + ion-datetime sheet.
 * Value is always `yyyy-MM-dd` (empty string when unset).
 */
@Component({
  selector: 'so-date-input',
  standalone: true,
  imports: [IonDatetime, IonIcon, IonModal],
  templateUrl: './so-date-input.component.html',
  styleUrls: ['./so-date-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoDateInputComponent),
      multi: true,
    },
  ],
})
export class SoDateInputComponent implements ControlValueAccessor {
  readonly calendarIcon = SoIcons.calendar;
  readonly datetimeId = `so-date-${++soDateSeq}`;

  @Input() placeholder = 'Select date';
  @Input() disabled = false;
  /** Max date as `yyyy-MM-dd`. */
  @Input() max = '';
  /** Min date as `yyyy-MM-dd`. */
  @Input() min = '';
  @Input() ariaLabel = '';

  @Output() valueChange = new EventEmitter<string>();

  value = '';
  isOpen = false;

  private suppressChange = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get displayLabel(): string {
    return this.value ? formatDisplayDate(this.value) : this.placeholder;
  }

  get isoValue(): string | undefined {
    return this.value ? `${this.value}T12:00:00` : undefined;
  }

  get maxIso(): string | undefined {
    return this.max ? `${this.max}T23:59:59` : undefined;
  }

  get minIso(): string | undefined {
    return this.min ? `${this.min}T00:00:00` : undefined;
  }

  writeValue(value: string | null): void {
    this.value = (value ?? '').slice(0, 10);
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

  open(): void {
    if (this.disabled) return;
    this.suppressChange = true;
    this.isOpen = true;
    // ion-datetime can emit ionChange on open with the current value — ignore that.
    setTimeout(() => (this.suppressChange = false), 350);
  }

  close(): void {
    this.isOpen = false;
    this.suppressChange = false;
    this.onTouched();
  }

  onDatetimeChange(ev: CustomEvent): void {
    if (!this.isOpen || this.suppressChange) return;
    const raw = (ev.detail as { value?: string | string[] | null })?.value;
    const next = Array.isArray(raw) ? raw[0] : raw;
    if (!next) return;
    const dateOnly = String(next).slice(0, 10);
    if (dateOnly !== this.value) {
      this.value = dateOnly;
      this.onChange(this.value);
      this.valueChange.emit(this.value);
    }
    this.close();
  }
}
