import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  chevronForwardOutline,
  documentTextOutline,
  timeOutline,
} from 'ionicons/icons';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { MyActionsService } from '../../core/services/my-actions.service';
import { ToastService } from '../../core/services/toast.service';
import { pickStr } from '../../core/utils/api-mapper.util';

interface ActionItem {
  id: string;
  title: string;
  itemTypeLabel: string;
  itemType: number;
  summary?: string;
}

@Component({
  selector: 'app-my-actions-list',
  templateUrl: './my-actions-list.page.html',
  styleUrls: ['./my-actions-list.page.scss'],
  imports: [
    AppHeaderComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class MyActionsListPage implements OnInit {
  private readonly actionsService = inject(MyActionsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  items: ActionItem[] = [];
  pendingCount = 0;
  loading = false;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      chevronForwardOutline,
      documentTextOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.load();
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(done?: () => void): void {
    this.loading = true;
    this.actionsService.getStats().subscribe({
      next: (s) => {
        const raw = s as Record<string, unknown>;
        this.pendingCount = Number(raw['totalPending'] ?? raw['TotalPending'] ?? 0);
      },
    });
    this.actionsService.getList().subscribe({
      next: (list) => {
        this.items = (Array.isArray(list) ? list : []).map((row) => {
          const r = row as Record<string, unknown>;
          return {
            id: pickStr(r, 'id', 'Id'),
            title: pickStr(r, 'title', 'Title') || 'Action',
            itemTypeLabel: pickStr(r, 'itemTypeLabel', 'ItemTypeLabel') || 'Action',
            itemType: this.resolveItemType(r['itemType'] ?? r['ItemType']),
            summary: pickStr(r, 'summary', 'Summary') || undefined,
          };
        });
        this.loading = false;
        done?.();
      },
      error: () => {
        this.loading = false;
        done?.();
        void this.toast.error('Failed to load actions', 2000);
      },
    });
  }

  typeClass(item: ActionItem): string {
    if (item.itemType === 1 || /leave/i.test(item.itemTypeLabel)) return 'type-leave';
    if (item.itemType === 2 || item.itemType === 3 || /notice|form/i.test(item.itemTypeLabel)) {
      return 'type-notice';
    }
    return 'type-other';
  }

  typeIcon(item: ActionItem): string {
    if (item.itemType === 1 || /leave/i.test(item.itemTypeLabel)) return 'time-outline';
    if (item.itemType === 2 || item.itemType === 3 || /notice|form/i.test(item.itemTypeLabel)) {
      return 'document-text-outline';
    }
    return 'checkmark-circle-outline';
  }

  open(id: string): void {
    void this.router.navigate(['/my-actions', id]);
  }

  onRefresh(ev: CustomEvent): void {
    this.load(() => (ev.target as HTMLIonRefresherElement).complete());
  }

  private resolveItemType(value: unknown): number {
    if (typeof value === 'number' && [1, 2, 3].includes(value)) return value;
    if (typeof value === 'string') {
      const map: Record<string, number> = {
        LeaveApproval: 1,
        '1': 1,
        NoticeResponse: 2,
        '2': 2,
        FormFill: 3,
        '3': 3,
      };
      return map[value.trim()] ?? 0;
    }
    return 0;
  }
}
