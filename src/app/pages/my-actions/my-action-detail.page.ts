import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { MyActionsService } from '../../core/services/my-actions.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { formatDisplayDate, pickStr } from '../../core/utils/api-mapper.util';

/** Matches API JsonStringEnumConverter / numeric values. */
const ItemType = {
  LeaveApproval: 1,
  NoticeResponse: 2,
  FormFill: 3,
} as const;

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
  saving = false;
  itemType = 0;
  title = '';
  remark = '';
  responseText = '';

  leavePerson = '';
  leaveClass = '';
  leaveType = '';
  leaveDates = '';
  leaveDays = '';
  leaveReason = '';

  noticeBody = '';

  get isLeave(): boolean {
    return this.itemType === ItemType.LeaveApproval;
  }

  get isNotice(): boolean {
    return this.itemType === ItemType.NoticeResponse || this.itemType === ItemType.FormFill;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/my-actions']);
      return;
    }
    this.actionsService.getById(id).subscribe({
      next: (d) => {
        const raw = d as Record<string, unknown>;
        this.title = pickStr(raw, 'title', 'Title') || 'Action';

        const lr = (raw['leaveRequest'] ?? raw['LeaveRequest']) as Record<string, unknown> | null | undefined;
        const n = (raw['notice'] ?? raw['Notice']) as Record<string, unknown> | null | undefined;

        this.itemType = this.resolveItemType(raw['itemType'] ?? raw['ItemType'], lr, n);

        if (lr && typeof lr === 'object') {
          const student = pickStr(lr, 'studentName', 'StudentName');
          const teacher =
            pickStr(lr, 'employeeName', 'EmployeeName') || pickStr(lr, 'teacherName', 'TeacherName');
          this.leavePerson = student || teacher || '—';
          this.leaveClass = pickStr(lr, 'className', 'ClassName');
          this.leaveType =
            pickStr(lr, 'leaveTypeName', 'LeaveTypeName') ||
            pickStr(lr, 'leaveTypeLabel', 'LeaveTypeLabel') ||
            'Leave';
          const fromRaw = pickStr(lr, 'fromDate', 'FromDate');
          const toRaw = pickStr(lr, 'toDate', 'ToDate');
          const from = formatDisplayDate(fromRaw);
          const to = formatDisplayDate(toRaw);
          this.leaveDates = from && to && from !== to ? `${from} → ${to}` : from || to || fromRaw || toRaw || '—';
          const days = Number(lr['dayCount'] ?? lr['DayCount'] ?? lr['totalDays'] ?? lr['TotalDays'] ?? 0);
          this.leaveDays = days > 0 ? `${days} day${days === 1 ? '' : 's'}` : '';
          this.leaveReason = pickStr(lr, 'reason', 'Reason');
        }

        if (n && typeof n === 'object') {
          this.noticeBody = pickStr(n, 'body', 'Body');
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        void this.toast.error('Could not load action', 2200);
        void this.router.navigate(['/my-actions']);
      },
    });
  }

  complete(code: string): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || this.saving) return;
    this.saving = true;
    this.actionsService
      .complete(id, {
        actionCode: code,
        comment: this.remark,
        payload: this.responseText,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          void this.toast.success('Done', 2000);
          void this.router.navigate(['/my-actions']);
        },
        error: (err) => {
          this.saving = false;
          const msg = getUserFacingApiError(err, 'Action failed');
          void this.toast.error(msg, 2500);
        },
      });
  }

  private resolveItemType(
    value: unknown,
    leave: Record<string, unknown> | null | undefined,
    notice: Record<string, unknown> | null | undefined,
  ): number {
    if (typeof value === 'number' && [1, 2, 3].includes(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const key = value.trim();
      const map: Record<string, number> = {
        LeaveApproval: ItemType.LeaveApproval,
        '1': ItemType.LeaveApproval,
        NoticeResponse: ItemType.NoticeResponse,
        '2': ItemType.NoticeResponse,
        FormFill: ItemType.FormFill,
        '3': ItemType.FormFill,
      };
      if (map[key] != null) return map[key];
    }
    if (leave && typeof leave === 'object') return ItemType.LeaveApproval;
    if (notice && typeof notice === 'object') return ItemType.NoticeResponse;
    return 0;
  }
}
