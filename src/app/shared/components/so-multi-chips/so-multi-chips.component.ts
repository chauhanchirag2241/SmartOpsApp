import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SoMultiChipOption {
  value: string;
  label: string;
}

/**
 * Shared multi-select chip group for filter sheets.
 * Empty selection = All. Selecting every option also collapses back to All.
 */
@Component({
  selector: 'so-multi-chips',
  standalone: true,
  templateUrl: './so-multi-chips.component.html',
  styleUrls: ['./so-multi-chips.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SoMultiChipsComponent),
      multi: true,
    },
  ],
})
export class SoMultiChipsComponent implements ControlValueAccessor {
  @Input() options: SoMultiChipOption[] = [];
  @Input() disabled = false;
  @Input() allLabel = 'All';
  @Input() emptyHint = '';

  @Output() selectedValuesChange = new EventEmitter<string[]>();

  selectedValues: string[] = [];

  private onChange: (value: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get isAllSelected(): boolean {
    return this.selectedValues.length === 0;
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  selectAll(): void {
    if (this.disabled) return;
    this.commit([]);
  }

  toggle(value: string): void {
    if (this.disabled) return;
    const next = this.selectedValues.includes(value)
      ? this.selectedValues.filter((v) => v !== value)
      : [...this.selectedValues, value];

    // Selecting every option means All
    if (this.options.length > 0 && next.length >= this.options.length) {
      this.commit([]);
      return;
    }
    this.commit(next);
  }

  writeValue(value: string[] | null): void {
    this.selectedValues = Array.isArray(value) ? [...value] : [];
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

  private commit(values: string[]): void {
    this.selectedValues = values;
    this.onChange([...this.selectedValues]);
    this.selectedValuesChange.emit([...this.selectedValues]);
    this.onTouched();
  }
}
