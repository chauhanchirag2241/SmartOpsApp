import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, walletOutline } from 'ionicons/icons';
import { MyPayrollMonthItem } from '../../core/models/salary.model';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AuthService } from '../../core/services/auth.service';
import { SalaryService } from '../../core/services/salary.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-salary-list',
  templateUrl: './salary-list.page.html',
  styleUrls: ['./salary-list.page.scss'],
  imports: [AppHeaderComponent, IonContent, IonIcon, IonSpinner, IonRefresher, IonRefresherContent],
})
export class SalaryListPage {
  private readonly salary = inject(SalaryService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  readonly ayContext = inject(AcademicYearContextService);

  months: MyPayrollMonthItem[] = [];
  employeeName = '';
  loading = false;
  loadError = '';

  constructor() {
    addIcons({ chevronForwardOutline, walletOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  onRefresh(event: CustomEvent): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  openDetail(item: MyPayrollMonthItem): void {
    if (!item.entryId) return;
    void this.router.navigate(['/salary', item.entryId]);
  }

  formatRupee(amount: number): string {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  academicYearLabel(item: MyPayrollMonthItem): string {
    const ay = this.ayContext.currentYear()?.name?.trim();
    if (ay) return ay.startsWith('AY') ? ay : `AY ${ay}`;
    if (!item.payYear) return '';
    const start = item.payMonth >= 4 ? item.payYear : item.payYear - 1;
    return `AY ${start}–${String(start + 1).slice(-2)}`;
  }

  statusClass(item: MyPayrollMonthItem): string {
    const key = this.statusKey(item);
    if (key === 'paid') return 'status-paid';
    if (key === 'processed') return 'status-processing';
    return 'status-draft';
  }

  statusText(item: MyPayrollMonthItem): string {
    const key = this.statusKey(item);
    if (key === 'paid') return 'Paid';
    if (key === 'processed') return 'Processing';
    if (key === 'draft') return 'Draft';
    return item.statusLabel || 'Unknown';
  }

  get subtitle(): string {
    const name = this.employeeName || this.auth.currentUser?.name || '';
    return name
      ? `Monthly salary records for ${name}`
      : 'Monthly salary records';
  }

  private statusKey(item: MyPayrollMonthItem): string {
    const raw = item.status;
    if (typeof raw === 'number') {
      if (raw === 2) return 'paid';
      if (raw === 1) return 'processed';
      return 'draft';
    }
    const label = String(raw ?? item.statusLabel ?? '').toLowerCase();
    if (label.includes('paid')) return 'paid';
    if (label.includes('process')) return 'processed';
    if (label.includes('draft')) return 'draft';
    return label;
  }

  private load(done?: () => void): void {
    this.loading = true;
    this.loadError = '';
    this.salary.getMyHistory().subscribe({
      next: (data) => {
        this.employeeName = data.employeeName;
        this.months = data.months ?? [];
        this.loading = false;
        done?.();
      },
      error: (err) => {
        this.loading = false;
        this.months = [];
        this.loadError = getUserFacingApiError(err, 'Could not load payroll history');
        void this.toast.error(this.loadError, 2800);
        done?.();
      },
    });
  }
}
