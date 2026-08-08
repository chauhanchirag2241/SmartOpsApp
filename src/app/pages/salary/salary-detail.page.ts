import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { walletOutline } from 'ionicons/icons';
import { Payslip } from '../../core/models/salary.model';
import { SalaryService } from '../../core/services/salary.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';

type SalaryDetailTab = 'details' | 'earnings' | 'netpay';

@Component({
  selector: 'app-salary-detail',
  templateUrl: './salary-detail.page.html',
  styleUrls: ['./salary-detail.page.scss'],
  imports: [
    AppHeaderComponent,
    SoSegmentComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class SalaryDetailPage {
  private readonly salary = inject(SalaryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly tabOptions: SoSegmentOption[] = [
    { value: 'details', label: 'Details' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'netpay', label: 'Net Pay' },
  ];

  activeTab: SalaryDetailTab = 'details';
  payslip: Payslip | null = null;
  loading = false;
  loadError = '';
  private entryId = '';

  constructor() {
    addIcons({ walletOutline });
  }

  ionViewWillEnter(): void {
    this.entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
    if (!this.entryId) {
      void this.router.navigateByUrl('/salary');
      return;
    }
    this.activeTab = 'details';
    this.load();
  }

  onTabChange(value: string): void {
    if (value === 'earnings' || value === 'netpay' || value === 'details') {
      this.activeTab = value;
    }
  }

  onRefresh(event: CustomEvent): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  get headerTitle(): string {
    return this.monthLabel || 'Salary';
  }

  get monthLabel(): string {
    if (!this.payslip) return '';
    const { payYear, payMonth } = this.payslip;
    if (!payYear || payMonth < 1 || payMonth > 12) return '';
    return new Date(payYear, payMonth - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }

  formatRupee(amount: number, negative = false): string {
    const n = Number(amount || 0);
    const body = n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return negative ? `−₹${body}` : `₹${body}`;
  }

  maskedBank(account?: string | null): string {
    const digits = String(account ?? '').replace(/\s+/g, '');
    if (!digits) return '—';
    if (digits.length <= 4) return digits;
    const last = digits.slice(-4);
    return `XXXX XXXX ${last}`;
  }

  get paidDateLabel(): string {
    const raw = this.payslip?.paidOn;
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private load(done?: () => void): void {
    this.loading = true;
    this.loadError = '';
    this.salary.getMyPayslip(this.entryId).subscribe({
      next: (data) => {
        this.payslip = data;
        this.loading = false;
        done?.();
      },
      error: (err) => {
        this.loading = false;
        this.payslip = null;
        this.loadError = getUserFacingApiError(err, 'Could not load payslip');
        void this.toast.error(this.loadError, 2800);
        done?.();
      },
    });
  }
}
