import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonRefresher, IonRefresherContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { MyActionsService } from '../../core/services/my-actions.service';
import { pickStr } from '../../core/utils/api-mapper.util';

interface ActionItem {
  id: string;
  title: string;
  itemTypeLabel: string;
  summary?: string;
}

@Component({
  selector: 'app-my-actions-list',
  templateUrl: './my-actions-list.page.html',
  styleUrls: ['./my-actions-list.page.scss'],
  imports: [AppHeaderComponent, IonContent, IonSpinner, IonRefresher, IonRefresherContent],
})
export class MyActionsListPage implements OnInit {
  private readonly actionsService = inject(MyActionsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);

  items: ActionItem[] = [];
  pendingCount = 0;
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
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
            title: pickStr(r, 'title', 'Title'),
            itemTypeLabel: pickStr(r, 'itemTypeLabel', 'ItemTypeLabel'),
            summary: pickStr(r, 'summary', 'Summary') || undefined,
          };
        });
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        const t = await this.toast.create({ message: 'Failed to load actions', duration: 2000, color: 'danger' });
        await t.present();
      },
    });
  }

  open(id: string): void {
    void this.router.navigate(['/my-actions', id]);
  }

  onRefresh(ev: CustomEvent): void {
    this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }
}
