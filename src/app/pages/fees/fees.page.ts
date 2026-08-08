import { Component, inject } from '@angular/core';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  chevronDownOutline,
  chevronUpOutline,
  walletOutline,
} from 'ionicons/icons';
import {
  FeeCollectionDetail,
  FeeCollectionHistoryRow,
  FeeCollectionMasterCard,
} from '../../core/models/fee.model';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { FeeService } from '../../core/services/fee.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDisplayDate } from '../../core/utils/api-mapper.util';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';

type FeesTab = 'pending' | 'history';

@Component({
  selector: 'app-fees',
  templateUrl: './fees.page.html',
  styleUrls: ['./fees.page.scss'],
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
export class FeesPage {
  private readonly feesApi = inject(FeeService);
  private readonly toast = inject(ToastService);
  readonly ayContext = inject(AcademicYearContextService);

  readonly tabOptions: SoSegmentOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'history', label: 'History' },
  ];

  activeTab: FeesTab = 'pending';
  detail: FeeCollectionDetail | null = null;
  pendingCards: FeeCollectionMasterCard[] = [];
  historyRows: FeeCollectionHistoryRow[] = [];
  expandedHistory = new Set<string>();
  loading = false;
  loadError = '';

  constructor() {
    addIcons({ cardOutline, chevronDownOutline, chevronUpOutline, walletOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  onTabChange(value: string): void {
    this.activeTab = value === 'history' ? 'history' : 'pending';
  }

  onRefresh(event: CustomEvent): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  toggleHistory(row: FeeCollectionHistoryRow): void {
    const id = row.feeMasterId;
    if (this.expandedHistory.has(id)) {
      this.expandedHistory.delete(id);
    } else {
      this.expandedHistory.add(id);
    }
  }

  isExpanded(row: FeeCollectionHistoryRow): boolean {
    return this.expandedHistory.has(row.feeMasterId);
  }

  formatRupee(amount: number): string {
    return (
      '₹' +
      Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '';
    const day = iso.includes('T') ? iso.slice(0, 10) : iso;
    return formatDisplayDate(day);
  }

  /** Payment collection timestamp (date + time), same style as SmartOpsUI. */
  formatDateTime(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  cardTitle(card: FeeCollectionMasterCard): string {
    return (card.periodLabel || card.feeName || 'Fee').trim();
  }

  cardSubtitle(card: FeeCollectionMasterCard): string {
    const parts: string[] = [];
    if (card.periodLabel && card.feeName) parts.push(card.feeName);
    if (card.defaultDueDate) parts.push(`Due ${this.formatDate(card.defaultDueDate)}`);
    else if (card.feeType) parts.push(card.feeType);
    return parts.join(' · ');
  }

  statusClass(status: string): string {
    const key = (status || '').toLowerCase();
    if (key.includes('paid') && !key.includes('partial')) return 'status-paid';
    if (key.includes('partial')) return 'status-partial';
    return 'status-pending';
  }

  get subtitle(): string {
    const name = this.detail?.student?.studentName?.trim();
    const ay = this.ayContext.currentYear()?.name?.trim();
    if (name && ay) return `${name} · ${ay}`;
    if (name) return name;
    return 'Your assigned fees and payment history';
  }

  get studentMeta(): string {
    const s = this.detail?.student;
    if (!s) return '';
    const classPart = [s.className, s.section].filter(Boolean).join(' – ');
    const bits = [
      classPart,
      s.rollNumber ? `Roll ${s.rollNumber}` : '',
      s.admissionNo ? `Adm ${s.admissionNo}` : '',
    ].filter(Boolean);
    return bits.join(' · ');
  }

  private load(done?: () => void): void {
    this.loading = true;
    this.loadError = '';
    this.feesApi.getMyFees().subscribe({
      next: (detail) => {
        this.detail = detail;
        this.pendingCards = (detail.dueCards ?? [])
          .filter((c) => c.isPublished !== false && Number(c.totalPending) > 0)
          .slice()
          .sort((a, b) => this.compareDueDate(a.defaultDueDate, b.defaultDueDate));
        this.historyRows = (detail.history ?? [])
          .slice()
          .sort((a, b) => this.compareLatestPaymentDesc(a, b));
        this.loading = false;
        done?.();
      },
      error: (err) => {
        this.loading = false;
        this.detail = null;
        this.pendingCards = [];
        this.historyRows = [];
        this.loadError = getUserFacingApiError(err, 'Could not load fees');
        void this.toast.error(this.loadError, 2800);
        done?.();
      },
    });
  }

  private compareLatestPaymentDesc(a: FeeCollectionHistoryRow, b: FeeCollectionHistoryRow): number {
    const ta = this.latestPaymentTime(a);
    const tb = this.latestPaymentTime(b);
    if (ta !== tb) return tb - ta;
    return String(a.feeName || '').localeCompare(String(b.feeName || ''), undefined, {
      sensitivity: 'base',
    });
  }

  private latestPaymentTime(row: FeeCollectionHistoryRow): number {
    let max = 0;
    for (const p of row.payments || []) {
      const t = Date.parse(String(p.paymentDate || ''));
      if (Number.isFinite(t) && t > max) max = t;
    }
    return max;
  }

  private compareDueDate(a?: string | null, b?: string | null): number {
    const ta = a ? Date.parse(a) : Number.POSITIVE_INFINITY;
    const tb = b ? Date.parse(b) : Number.POSITIVE_INFINITY;
    return ta - tb;
  }
}
