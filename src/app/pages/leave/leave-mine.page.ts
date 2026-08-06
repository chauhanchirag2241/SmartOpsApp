import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonFab, IonFabButton, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, airplaneOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveBalanceDto, LeaveService } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-leave-mine',
  templateUrl: './leave-mine.page.html',
  styleUrls: ['./leave-mine.page.scss'],
  imports: [
    AppHeaderComponent,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class LeaveMinePage implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  readonly ayContext = inject(AcademicYearContextService);

  balances: LeaveBalanceDto[] = [];
  loading = false;

  constructor() {
    addIcons({ addOutline, airplaneOutline });
  }

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStaff);
  }

  ngOnInit(): void {
    this.load();
  }

  onRefresh(event: CustomEvent): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  openApply(): void {
    if (!this.canApply) {
      void this.toast.error('You cannot apply for leave', 2200);
      return;
    }
    void this.router.navigateByUrl('/leave/staff-apply');
  }

  private load(done?: () => void): void {
    this.loading = true;
    this.leave.getBalancesMine().pipe(catchError(() => of([] as LeaveBalanceDto[]))).subscribe({
      next: (rows) => {
        this.balances = (rows ?? []).map((r) => this.normalizeBalance(r));
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
}
