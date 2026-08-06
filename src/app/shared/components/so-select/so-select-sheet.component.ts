import { Component, Input } from '@angular/core';
import { IonContent, IonIcon, IonSearchbar, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline } from 'ionicons/icons';
import { SoSelectOption } from './so-select.model';

/** Searchable single-select sheet opened by so-select through ModalController. */
@Component({
  selector: 'so-select-sheet',
  standalone: true,
  imports: [IonContent, IonIcon, IonSearchbar],
  templateUrl: './so-select-sheet.component.html',
  styleUrls: ['./so-select-sheet.component.scss'],
})
export class SoSelectSheetComponent {
  @Input() options: SoSelectOption[] = [];
  @Input() value = '';
  @Input() title = 'Select';
  @Input() searchPlaceholder = 'Search';

  searchQuery = '';

  constructor(private readonly modalCtrl: ModalController) {
    addIcons({ checkmarkOutline });
  }

  get filteredOptions(): SoSelectOption[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    if (!query) return this.options;
    return this.options.filter((option) => option.label.toLocaleLowerCase().includes(query));
  }

  onSearch(event: Event): void {
    this.searchQuery = (event as CustomEvent<{ value?: string }>).detail?.value ?? '';
  }

  select(option: SoSelectOption): void {
    void this.modalCtrl.dismiss(option.value, 'selected');
  }

  close(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }
}
