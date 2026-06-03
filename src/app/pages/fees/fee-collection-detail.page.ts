import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  cardOutline,
  checkmarkOutline,
  closeOutline,
  listOutline,
  receiptOutline,
} from 'ionicons/icons';
import {
  CollectAllocationRow,
  FEE_PAYMENT_MODE_OPTIONS,
  FeeCollectionStudentDetail,
  FeePaymentMode,
} from '../../core/models/fee-collection.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { FeeCollectionService } from '../../core/services/fee-collection.service';
import { PermissionService } from '../../core/services/permission.service';
import {
  buildCollectAllocations,
  extractApiError,
  formatInr,
  normalizeFeeCollectionDetail,
  pick,
  statusBadgeClass,
  studentInitials,
} from '../../core/utils/fees.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoModuleShellComponent } from '../../shared/components/so-module-shell/so-module-shell.component';

@Component({
  selector: 'app-fee-collection-detail',
  templateUrl: './fee-collection-detail.page.html',
  styleUrls: ['./fee-collection-detail.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoModuleShellComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonButton,
    IonModal,
  ],
})
export class FeeCollectionDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly feeService = inject(FeeCollectionService);
  private readonly toast = inject(ToastController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  studentId = '';
  detail: FeeCollectionStudentDetail | null = null;
  loading = false;
  loadError = '';
  expandedHeadIds = new Set<string>();
  showCollectModal = false;
  collecting = false;

  paymentModes = FEE_PAYMENT_MODE_OPTIONS;
  collectForm = {
    amount: 0,
    paymentMode: FeePaymentMode.Cash,
    transactionNo: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: '',
    allocations: [] as CollectAllocationRow[],
  };

  formatInr = formatInr;
  studentInitials = studentInitials;
  statusBadgeClass = statusBadgeClass;

  constructor() {
    addIcons({ cardOutline, calendarOutline, listOutline, receiptOutline, closeOutline, checkmarkOutline });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.studentId = (params.get('studentId') ?? '').trim();
      if (this.studentId) this.loadDetail();
    });
  }

  get canCollect(): boolean {
    return (
      !this.ayContext.isReadOnlyScope() &&
      this.permissions.canAdd(MenuCodes.FeesCollection) &&
      !!this.detail &&
      this.detail.dueAmount > 0 &&
      !this.collecting
    );
  }

  get selectedAllocDue(): number {
    return this.collectForm.allocations.filter((a) => a.checked).reduce((s, a) => s + a.amount, 0);
  }

  get cappedCollectAmount(): number {
    const raw = this.selectedAllocDue;
    const netDue = this.detail?.dueAmount ?? raw;
    if (raw <= 0) return netDue;
    return Math.min(raw, netDue);
  }

  isHeadExpanded(id: string): boolean {
    return this.expandedHeadIds.has(id);
  }

  toggleHead(id: string): void {
    if (this.expandedHeadIds.has(id)) this.expandedHeadIds.delete(id);
    else this.expandedHeadIds.add(id);
  }

  openCollect(): void {
    if (!this.detail || this.detail.dueAmount <= 0) return;
    this.collectForm = {
      amount: this.detail.dueAmount,
      paymentMode: FeePaymentMode.Cash,
      transactionNo: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      remarks: '',
      allocations: buildCollectAllocations(this.detail),
    };
    this.syncCollectAmount();
    this.showCollectModal = true;
  }

  closeCollect(): void {
    if (!this.collecting) this.showCollectModal = false;
  }

  toggleAllocation(row: CollectAllocationRow): void {
    if (this.collecting || row.amount <= 0) return;
    row.checked = !row.checked;
    this.syncCollectAmount();
  }

  onAllocationChange(): void {
    this.syncCollectAmount();
  }

  collectFee(): void {
    if (!this.canCollect || !this.detail) return;
    const selected = this.collectForm.allocations.filter((a) => a.checked);
    if (!selected.length) {
      void this.showToast('Select at least one installment', true);
      return;
    }
    if (!this.collectForm.amount || this.collectForm.amount > this.detail.dueAmount) {
      void this.showToast('Enter a valid amount', true);
      return;
    }
    if (this.collectForm.amount > this.cappedCollectAmount) {
      void this.showToast(`Amount cannot exceed ${formatInr(this.cappedCollectAmount)}`, true);
      return;
    }

    const allocations = selected.map((a) => ({
      feeTypeId: a.feeTypeId,
      installmentId: a.installmentId || null,
      amount: 0,
    }));

    this.collecting = true;
    const amount = this.collectForm.amount;
    this.feeService
      .collectFee({
        studentId: this.studentId,
        amount,
        paymentMode: this.collectForm.paymentMode,
        transactionNo: this.collectForm.transactionNo || null,
        paymentDate: this.collectForm.paymentDate,
        remarks: this.collectForm.remarks || null,
        allocations,
        academicYearId: this.ayContext.effectiveYearId() || null,
      })
      .subscribe({
        next: (res) => {
          this.collecting = false;
          this.showCollectModal = false;
          const raw = (pick(res as Record<string, unknown>, 'studentDetail', 'StudentDetail') ?? res) as Record<
            string,
            unknown
          >;
          this.detail = normalizeFeeCollectionDetail(raw);
          void this.showToast(`${formatInr(amount)} collected`);
        },
        error: (e) => {
          this.collecting = false;
          void this.showToast(extractApiError(e, 'Collection failed'), true);
        },
      });
  }

  private loadDetail(): void {
    this.loading = true;
    this.loadError = '';
    const yearId = this.ayContext.effectiveYearId() ?? undefined;
    this.feeService.getStudentDetail(this.studentId, yearId).subscribe({
      next: (raw) => {
        this.detail = normalizeFeeCollectionDetail(raw as Record<string, unknown>);
        for (const h of this.detail.feeHeads) {
          if (h.installments.length > 1) this.expandedHeadIds.add(h.feeTypeId);
        }
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.loadError = extractApiError(e, 'Failed to load student fees');
      },
    });
  }

  private syncCollectAmount(): void {
    const max = this.cappedCollectAmount;
    if (max > 0) this.collectForm.amount = max;
  }

  private async showToast(message: string, isError = false): Promise<void> {
    const t = await this.toast.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: isError ? 'danger' : 'success',
    });
    await t.present();
  }
}
