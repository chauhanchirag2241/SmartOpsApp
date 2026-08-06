import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoIcons } from '../../shared/icons/so-icons';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveService, LeaveType } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { localDateString } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-staff-apply',
  templateUrl: './staff-apply.page.html',
  styleUrls: ['./staff-apply.page.scss'],
  imports: [FormsModule, AppHeaderComponent, SoDateInputComponent, SoIconComponent, IonContent, IonSpinner],
})
export class StaffApplyPage implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);
  readonly sendIcon = SoIcons.send;

  LeaveType = LeaveType;
  saving = false;
  fromDate = localDateString(new Date());
  toDate = localDateString(new Date());
  leaveType = LeaveType.Casual;
  reason = '';

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStaff);
  }

  ngOnInit(): void {}

  submit(): void {
    if (!this.canApply) return;
    this.saving = true;
    this.leaveService
      .createStaff({
        fromDate: this.fromDate,
        toDate: this.toDate,
        leaveType: this.leaveType,
        reason: this.reason,
        submitImmediately: true,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          void this.toast.success('Leave submitted', 2000);
          void this.router.navigate(['/leave/mine']);
        },
        error: (err) => {
          this.saving = false;
          const msg = typeof err?.error === 'string' ? err.error : 'Submit failed';
          void this.toast.error(msg, 2500);
        },
      });
  }
}
