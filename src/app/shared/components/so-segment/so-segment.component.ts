import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SoSegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Shared iOS-style segmented control for toolbar / in-page view toggles.
 * Uses SmartOps theme tokens so it stays consistent across modules.
 */
@Component({
  selector: 'so-segment',
  standalone: true,
  templateUrl: './so-segment.component.html',
  styleUrls: ['./so-segment.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoSegmentComponent),
      multi: true,
    },
  ],
})
export class SoSegmentComponent implements ControlValueAccessor {
  @Input() options: SoSegmentOption[] = [];
  @Input() disabled = false;
  @Input() ariaLabel = 'Segments';
  /** full = stretch to container width; hug = shrink to content (centered). */
  @Input() layout: 'full' | 'hug' = 'full';

  @Input()
  set value(v: string | null) {
    this._value = v ?? '';
  }
  get value(): string {
    return this._value;
  }

  @Output() valueChange = new EventEmitter<string>();

  private _value = '';

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  select(next: string): void {
    if (this.disabled) return;
    const opt = this.options.find((o) => o.value === next);
    if (!opt || opt.disabled || next === this.value) return;
    this._value = next;
    this.onChange(this._value);
    this.valueChange.emit(this._value);
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this._value = value ?? '';
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

  isActive(value: string): boolean {
    return this.value === value;
  }
}
