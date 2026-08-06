import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { MyActionsService } from '../../core/services/my-actions.service';
import { ToastService } from '../../core/services/toast.service';
import { pickStr } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-my-action-detail',
  templateUrl: './my-action-detail.page.html',
  styleUrls: ['./my-action-detail.page.scss'],
  imports: [FormsModule, AppHeaderComponent, SoIconComponent, IonContent, IonSpinner],
})
export class MyActionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actionsService = inject(MyActionsService);
  private readonly toast = inject(ToastService);
  readonly approveIcon = SoIcons.approve;
  readonly rejectIcon = SoIcons.reject;
  readonly sendIcon = SoIcons.send;

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
      error: () => {
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
        next: () => {
          void this.toast.success('Done', 2000);
          void this.router.navigate(['/my-actions']);
        },
        error: (err) => {
          const msg = typeof err?.error === 'string' ? err.error : 'Action failed';
          void this.toast.error(msg, 2500);
        },
      });
  }
}
