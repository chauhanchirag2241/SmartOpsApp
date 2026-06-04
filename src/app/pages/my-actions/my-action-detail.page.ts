import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { MyActionsService } from '../../core/services/my-actions.service';
import { pickStr } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-my-action-detail',
  templateUrl: './my-action-detail.page.html',
  styleUrls: ['./my-action-detail.page.scss'],
  imports: [FormsModule, AppHeaderComponent, IonContent, IonSpinner],
})
export class MyActionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actionsService = inject(MyActionsService);
  private readonly toast = inject(ToastController);

  loading = true;
  itemType = 0;
  title = '';
  remark = '';
  responseText = '';
  leaveSummary = '';
  noticeBody = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/my-actions']);
      return;
    }
    this.actionsService.getById(id).subscribe({
      next: (d) => {
        const raw = d as Record<string, unknown>;
        this.title = pickStr(raw, 'title', 'Title');
        this.itemType = Number(raw['itemType'] ?? raw['ItemType'] ?? 0);
        const lr = (raw['leaveRequest'] ?? raw['LeaveRequest']) as Record<string, unknown> | undefined;
        if (lr) {
          this.leaveSummary = [
            pickStr(lr, 'studentName', 'StudentName'),
            pickStr(lr, 'teacherName', 'TeacherName'),
            `${pickStr(lr, 'fromDate', 'FromDate')} – ${pickStr(lr, 'toDate', 'ToDate')}`,
            pickStr(lr, 'reason', 'Reason'),
          ]
            .filter(Boolean)
            .join('\n');
        }
        const n = (raw['notice'] ?? raw['Notice']) as Record<string, unknown> | undefined;
        if (n) {
          this.noticeBody = pickStr(n, 'body', 'Body');
        }
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        void this.router.navigate(['/my-actions']);
      },
    });
  }

  complete(code: string): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.actionsService
      .complete(id, {
        actionCode: code,
        comment: this.remark,
        payload: this.responseText,
      })
      .subscribe({
        next: async () => {
          const t = await this.toast.create({ message: 'Done', duration: 2000, color: 'success' });
          await t.present();
          void this.router.navigate(['/my-actions']);
        },
        error: async (err) => {
          const msg = typeof err?.error === 'string' ? err.error : 'Action failed';
          const t = await this.toast.create({ message: msg, duration: 2500, color: 'danger' });
          await t.present();
        },
      });
  }
}
