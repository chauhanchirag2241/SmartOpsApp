import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveService, LeaveType } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { localDateString } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-staff-apply',
  templateUrl: './staff-apply.page.html',
  styleUrls: ['./staff-apply.page.scss'],
  imports: [FormsModule, AppHeaderComponent, IonContent, IonSpinner],
})
export class StaffApplyPage implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

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
        next: async () => {
          this.saving = false;
          const t = await this.toast.create({ message: 'Leave submitted', duration: 2000, color: 'success' });
          await t.present();
          void this.router.navigate(['/my-actions']);
        },
        error: async (err) => {
          this.saving = false;
          const msg = typeof err?.error === 'string' ? err.error : 'Submit failed';
          const t = await this.toast.create({ message: msg, duration: 2500, color: 'danger' });
          await t.present();
        },
      });
  }
}
