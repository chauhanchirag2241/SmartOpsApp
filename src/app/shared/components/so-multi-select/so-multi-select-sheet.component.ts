import { Component, Input, OnInit } from '@angular/core';
import {
  IonContent,
  IonFooter,
  IonIcon,
  IonSearchbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { SoSelectOption } from '../so-select/so-select.model';

/** Searchable multi-select sheet opened by so-multi-select through ModalController. */
@Component({
  selector: 'so-multi-select-sheet',
  standalone: true,
  imports: [IonContent, IonFooter, IonIcon, IonSearchbar],
  templateUrl: './so-multi-select-sheet.component.html',
  styleUrls: ['./so-multi-select-sheet.component.scss'],
})
export class SoMultiSelectSheetComponent implements OnInit {
  @Input() options: SoSelectOption[] = [];
  @Input() value: string[] = [];
  @Input() title = 'Select';
  @Input() searchPlaceholder = 'Search';
  /**
   * Shared bag with the parent so selection survives Close / backdrop dismiss
   * (not only the Done button).
   */
  @Input() selectionBag?: { ids: string[] };

  searchQuery = '';
  selected = new Set<string>();

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ checkmarkOutline });
  }

  ngOnInit(): void {
    this.selected = new Set((this.value ?? []).filter(Boolean));
    this.syncBag();
  }

  get filteredOptions(): SoSelectOption[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    if (!query) return this.options;
    return this.options.filter((option) => option.label.toLocaleLowerCase().includes(query));
  }

  get selectedCount(): number {
    return this.selected.size;
  }

  get filteredSelectedCount(): number {
    return this.filteredOptions.reduce(
      (count, option) => count + (this.selected.has(option.value) ? 1 : 0),
      0,
    );
  }

  get allFilteredSelected(): boolean {
    const filtered = this.filteredOptions;
    return filtered.length > 0 && filtered.every((option) => this.selected.has(option.value));
  }

  onSearch(event: Event): void {
    this.searchQuery = (event as CustomEvent<{ value?: string }>).detail?.value ?? '';
  }

  isSelected(value: string): boolean {
    return this.selected.has(value);
  }

  toggle(option: SoSelectOption): void {
    if (this.selected.has(option.value)) {
      this.selected.delete(option.value);
    } else {
      this.selected.add(option.value);
    }
    this.syncBag();
  }

  selectAllFiltered(): void {
    for (const option of this.filteredOptions) {
      this.selected.add(option.value);
    }
    this.syncBag();
  }

  clearSelection(): void {
    const filtered = this.filteredOptions;
    if (this.searchQuery.trim() && filtered.length) {
      for (const option of filtered) {
        this.selected.delete(option.value);
      }
    } else {
      this.selected.clear();
    }
    this.syncBag();
  }

  confirm(): void {
    this.syncBag();
    void this.modalCtrl.dismiss([...this.selected], 'selected');
  }

  /** Close keeps current selection (same as Done) — user expects picks to persist. */
  close(): void {
    this.confirm();
  }

  private syncBag(): void {
    if (this.selectionBag) {
      this.selectionBag.ids = [...this.selected];
    }
  }
}
