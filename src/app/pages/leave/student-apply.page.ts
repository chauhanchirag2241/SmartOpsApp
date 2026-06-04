import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { LeaveService, LeaveType } from '../../core/services/leave.service';
import { PermissionService } from '../../core/services/permission.service';
import { localDateString, pickStr } from '../../core/utils/api-mapper.util';

interface ChildOption {
  id: string;
  name: string;
  className?: string;
}

@Component({
  selector: 'app-student-apply',
  templateUrl: './student-apply.page.html',
  styleUrls: ['./student-apply.page.scss'],
  imports: [FormsModule, AppHeaderComponent, IonContent, IonSpinner],
})
export class StudentApplyPage implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  LeaveType = LeaveType;
  children: ChildOption[] = [];
  studentId = '';
  fromDate = localDateString(new Date());
  toDate = localDateString(new Date());
  leaveType = LeaveType.Casual;
  reason = '';
  saving = false;
  loading = true;

  get canApply(): boolean {
    return !this.ayContext.isReadOnlyScope() && this.permissions.canAdd(MenuCodes.LeaveStudent);
  }

  ngOnInit(): void {
    this.leaveService.getLinkedStudents().subscribe({
      next: (list) => {
        this.children = (Array.isArray(list) ? list : []).map((raw) => {
          const r = raw as Record<string, unknown>;
          return {
            id: pickStr(r, 'id', 'Id'),
            name: pickStr(r, 'name', 'Name'),
            className: pickStr(r, 'className', 'ClassName') || undefined,
          };
        });
        if (this.children.length === 1) {
          this.studentId = this.children[0].id;
        }
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        const t = await this.toast.create({ message: 'Could not load students', duration: 2500, color: 'danger' });
        await t.present();
      },
    });
  }

  submit(): void {
    if (!this.canApply || !this.studentId) return;
    this.saving = true;
    this.leaveService
      .createStudent({
        studentId: this.studentId,
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
