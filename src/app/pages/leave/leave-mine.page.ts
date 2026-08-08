import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, airplaneOutline, documentTextOutline, timeOutline } from 'ionicons/icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveBalanceDto, LeaveListItem, LeaveService } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDisplayDate } from '../../core/utils/api-mapper.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';

type LeaveTab = 'balance' | 'history';

@Component({
  selector: 'app-leave-mine',
  templateUrl: './leave-mine.page.html',
  styleUrls: ['./leave-mine.page.scss'],
  imports: [
    AppHeaderComponent,
    SoSegmentComponent,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class LeaveMinePage {
  private readonly leave = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  readonly ayContext = inject(AcademicYearContextService);

  readonly tabOptions: SoSegmentOption[] = [
    { value: 'balance', label: 'Balance' },
    { value: 'history', label: 'History' },
  ];

  activeTab: LeaveTab = 'balance';
  balances: LeaveBalanceDto[] = [];
  history: LeaveListItem[] = [];
  loading = false;

  constructor() {
    addIcons({ addOutline, airplaneOutline, documentTextOutline, timeOutline });
  }

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStaff);
  }

  /** First open + return from apply — load only the active tab. */
  ionViewWillEnter(): void {
    this.loadActiveTab();
  }

  onTabChange(value: string): void {
    this.activeTab = value === 'history' ? 'history' : 'balance';
    this.loadActiveTab();
  }

  onRefresh(event: CustomEvent): void {
    this.loadActiveTab(() => (event.target as HTMLIonRefresherElement).complete());
  }

  openApply(): void {
    if (!this.canApply) {
      void this.toast.error('You cannot apply for leave', 2200);
      return;
    }
    void this.router.navigateByUrl('/leave/staff-apply');
  }

  statusClass(item: LeaveListItem): string {
    const key = this.statusKey(item);
    if (key === 'approved') return 'status-approved';
    if (key === 'pending' || key === 'submitted') return 'status-pending';
    if (key === 'rejected') return 'status-rejected';
    if (key === 'cancelled') return 'status-cancelled';
    return 'status-draft';
  }

  statusText(item: LeaveListItem): string {
    const key = this.statusKey(item);
    if (key === 'submitted' || key === 'pending') return 'Pending';
    if (key === 'approved') return 'Approved';
    if (key === 'rejected') return 'Rejected';
    if (key === 'cancelled') return 'Cancelled';
    if (key === 'draft') return 'Draft';
    const label = item.statusLabel?.trim() || 'Unknown';
    return label.toLowerCase() === 'submitted' ? 'Pending' : label;
  }

  dateRangeLabel(item: LeaveListItem): string {
    const from = formatDisplayDate(item.fromDate);
    const to = formatDisplayDate(item.toDate);
    if (!from) return '—';
    if (!to || from === to) return from;
    return `${from} → ${to}`;
  }

  daysLabel(item: LeaveListItem): string {
    const days = item.dayCount ?? 0;
    const half = item.isHalfDay ? ' · Half day' : '';
    return `${days} day${days === 1 ? '' : 's'}${half}`;
  }

  balanceMeta(b: LeaveBalanceDto): string {
    const code = (b.leaveTypeCode || '').trim();
    const ay = this.ayContext.currentYear()?.name?.trim() || '';
    if (code && ay) return `${code} · ${ay}`;
    if (code) return code;
    if (ay) return ay;
    return 'Balance';
  }

  approvedLabel(item: LeaveListItem): string | null {
    const key = this.statusKey(item);
    if (key !== 'approved' && key !== 'rejected') return null;
    const name = item.approvedByName?.trim();
    if (!name) return null;
    const when = item.approvedOn ? formatDisplayDate(String(item.approvedOn).slice(0, 10)) : '';
    const verb = key === 'rejected' ? 'Rejected by' : 'Approved by';
    return when ? `${verb} ${name} · ${when}` : `${verb} ${name}`;
  }

  private statusKey(item: LeaveListItem): string {
    const label = String(item.statusLabel ?? item.status ?? '').trim().toLowerCase();
    if (label === '1' || label === 'submitted') return 'submitted';
    if (label === '2' || label === 'approved') return 'approved';
    if (label === '3' || label === 'rejected') return 'rejected';
    if (label === '4' || label === 'cancelled') return 'cancelled';
    if (label === '0' || label === 'draft') return 'draft';
    if (label === 'pending') return 'pending';
    return label;
  }

  private loadActiveTab(done?: () => void): void {
    if (this.activeTab === 'history') {
      this.loadHistory(done);
    } else {
      this.loadBalance(done);
    }
  }

  private loadBalance(done?: () => void): void {
    this.loading = true;
    this.leave.getBalancesMine().subscribe({
      next: (balances) => {
        this.balances = (balances ?? []).map((r) => this.normalizeBalance(r));
        this.loading = false;
        done?.();
      },
      error: () => {
        this.loading = false;
        done?.();
        void this.toast.error('Could not load leave balance', 2200);
      },
    });
  }

  private loadHistory(done?: () => void): void {
    this.loading = true;
    this.leave.getStaffMine().subscribe({
      next: (history) => {
        this.history = (history ?? []).map((r) => this.normalizeHistory(r));
        this.loading = false;
        done?.();
      },
      error: () => {
        this.loading = false;
        done?.();
        void this.toast.error('Could not load leave history', 2200);
      },
    });
  }

  private normalizeBalance(raw: LeaveBalanceDto | Record<string, unknown>): LeaveBalanceDto {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      employeeId: String(r['employeeId'] ?? r['EmployeeId'] ?? ''),
      employeeName: (r['employeeName'] ?? r['EmployeeName'] ?? null) as string | null,
      leaveTypeId: String(r['leaveTypeId'] ?? r['LeaveTypeId'] ?? ''),
      leaveTypeName: (r['leaveTypeName'] ?? r['LeaveTypeName'] ?? 'Leave') as string | null,
      leaveTypeCode: (r['leaveTypeCode'] ?? r['LeaveTypeCode'] ?? null) as string | null,
      academicYearId: String(r['academicYearId'] ?? r['AcademicYearId'] ?? ''),
      openingBalance: Number(r['openingBalance'] ?? r['OpeningBalance'] ?? 0),
      accrued: Number(r['accrued'] ?? r['Accrued'] ?? 0),
      used: Number(r['used'] ?? r['Used'] ?? 0),
      adjusted: Number(r['adjusted'] ?? r['Adjusted'] ?? 0),
      closingBalance: Number(r['closingBalance'] ?? r['ClosingBalance'] ?? 0),
    };
  }

  private normalizeHistory(raw: LeaveListItem | Record<string, unknown>): LeaveListItem {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      fromDate: String(r['fromDate'] ?? r['FromDate'] ?? ''),
      toDate: String(r['toDate'] ?? r['ToDate'] ?? ''),
      dayCount: Number(r['dayCount'] ?? r['DayCount'] ?? 0),
      leaveTypeLabel: (r['leaveTypeLabel'] ?? r['LeaveTypeLabel'] ?? null) as string | null,
      leaveTypeName: (r['leaveTypeName'] ?? r['LeaveTypeName'] ?? r['leaveTypeLabel'] ?? 'Leave') as string | null,
      status: (r['status'] ?? r['Status'] ?? '') as string | number,
      statusLabel: this.normalizeLeaveStatusLabel(
        (r['statusLabel'] ?? r['StatusLabel'] ?? '') as string,
        r['status'] ?? r['Status'],
      ),
      isHalfDay: Boolean(r['isHalfDay'] ?? r['IsHalfDay'] ?? false),
      reason: (r['reason'] ?? r['Reason'] ?? null) as string | null,
      approvedByName: (r['approvedByName'] ?? r['ApprovedByName'] ?? null) as string | null,
      approvedOn: (r['approvedOn'] ?? r['ApprovedOn'] ?? null) as string | null,
      createdOn: (r['createdOn'] ?? r['CreatedOn'] ?? undefined) as string | undefined,
    };
  }

  private normalizeLeaveStatusLabel(label: string, status: unknown): string {
    const key = String(label || status || '')
      .trim()
      .toLowerCase();
    if (key === '1' || key === 'submitted' || key === 'pending') return 'Pending';
    if (key === '2' || key === 'approved') return 'Approved';
    if (key === '3' || key === 'rejected') return 'Rejected';
    if (key === '4' || key === 'cancelled') return 'Cancelled';
    if (key === '0' || key === 'draft') return 'Draft';
    return label?.trim() || String(status ?? '').trim() || 'Unknown';
  }
}
