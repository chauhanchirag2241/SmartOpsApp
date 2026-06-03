import {
  CollectAllocationRow,
  FeeCollectionStudentDetail,
  FeeCollectionStudentItem,
  FeePaymentMode,
} from '../models/fee-collection.model';

export function pick<T>(obj: Record<string, unknown> | null | undefined, camel: string, pascal?: string): T | undefined {
  if (obj == null) return undefined;
  const p = pascal ?? camel.charAt(0).toUpperCase() + camel.slice(1);
  return (obj[camel] ?? obj[p]) as T | undefined;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function formatInr(n: number): string {
  const value = n ?? 0;
  if (value < 0) {
    return `−₹${Math.abs(value).toLocaleString('en-IN')}`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

export function studentInitials(name: string): string {
  const parts = (name ?? '').split(' ').filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name ?? '??').slice(0, 2).toUpperCase();
}

export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (!err || typeof err !== 'object' || !('error' in err)) {
    return fallback;
  }
  const body = (err as { error?: unknown; message?: string }).error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const apiError = record['error'];
    if (typeof apiError === 'string' && apiError.trim()) return apiError.trim();
    const apiMessage = record['message'];
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage.trim();
  }
  const message = (err as { message?: string }).message;
  if (typeof message === 'string' && message.trim()) return message.trim();
  return fallback;
}

export function normalizeFeeCollectionStudent(raw: Record<string, unknown>): FeeCollectionStudentItem {
  return {
    studentId: String(pick(raw, 'studentId', 'StudentId') ?? ''),
    studentName: String(pick(raw, 'studentName', 'StudentName') ?? ''),
    rollNo: String(pick(raw, 'rollNo', 'RollNo') ?? ''),
    className: String(pick(raw, 'className', 'ClassName') ?? ''),
    totalFees: Number(pick(raw, 'totalFees', 'TotalFees') ?? 0),
    paidAmount: Number(pick(raw, 'paidAmount', 'PaidAmount') ?? 0),
    dueAmount: Number(pick(raw, 'dueAmount', 'DueAmount') ?? 0),
    paymentStatus: String(pick(raw, 'paymentStatus', 'PaymentStatus') ?? ''),
  };
}

export function normalizeFeeCollectionDetail(raw: Record<string, unknown>): FeeCollectionStudentDetail {
  const feeHeads = asArray<Record<string, unknown>>(pick(raw, 'feeHeads', 'FeeHeads')).map((h) => {
    const installments = asArray<Record<string, unknown>>(pick(h, 'installments', 'Installments')).map((i) => ({
      installmentId: String(pick(i, 'installmentId', 'InstallmentId') ?? ''),
      feeTypeId: String(pick(i, 'feeTypeId', 'FeeTypeId') ?? ''),
      periodLabel: String(pick(i, 'periodLabel', 'PeriodLabel') ?? ''),
      totalAmount: Number(pick(i, 'totalAmount', 'TotalAmount') ?? 0),
      paidAmount: Number(pick(i, 'paidAmount', 'PaidAmount') ?? 0),
      dueAmount: Number(pick(i, 'dueAmount', 'DueAmount') ?? 0),
      status: String(pick(i, 'status', 'Status') ?? ''),
    }));
    return {
      feeTypeId: String(pick(h, 'feeTypeId', 'FeeTypeId') ?? ''),
      feeTypeName: String(pick(h, 'feeTypeName', 'FeeTypeName') ?? ''),
      collectionTypeLabel: String(pick(h, 'collectionTypeLabel', 'CollectionTypeLabel') ?? ''),
      totalAmount: Number(pick(h, 'totalAmount', 'TotalAmount') ?? 0),
      paidAmount: Number(pick(h, 'paidAmount', 'PaidAmount') ?? 0),
      dueAmount: Number(pick(h, 'dueAmount', 'DueAmount') ?? 0),
      status: String(pick(h, 'status', 'Status') ?? ''),
      installments,
    };
  });

  const semesterStatuses = asArray<Record<string, unknown>>(pick(raw, 'semesterStatuses', 'SemesterStatuses')).map((s) => ({
    semesterName: String(pick(s, 'semesterName', 'SemesterName') ?? ''),
    startDate: String(pick(s, 'startDate', 'StartDate') ?? ''),
    endDate: String(pick(s, 'endDate', 'EndDate') ?? ''),
    totalAmount: Number(pick(s, 'totalAmount', 'TotalAmount') ?? 0),
    paidAmount: Number(pick(s, 'paidAmount', 'PaidAmount') ?? 0),
    status: String(pick(s, 'status', 'Status') ?? ''),
  }));

  const payments = asArray<Record<string, unknown>>(pick(raw, 'payments', 'Payments')).map((p) => ({
    paymentId: String(pick(p, 'paymentId', 'PaymentId') ?? ''),
    paymentDate: String(pick(p, 'paymentDate', 'PaymentDate') ?? ''),
    paymentModeLabel: String(pick(p, 'paymentModeLabel', 'PaymentModeLabel') ?? ''),
    amount: Number(pick(p, 'amount', 'Amount') ?? 0),
    feeHeadsSummary: String(pick(p, 'feeHeadsSummary', 'FeeHeadsSummary') ?? ''),
  }));

  return {
    studentId: String(pick(raw, 'studentId', 'StudentId') ?? ''),
    studentName: String(pick(raw, 'studentName', 'StudentName') ?? ''),
    rollNo: String(pick(raw, 'rollNo', 'RollNo') ?? ''),
    className: String(pick(raw, 'className', 'ClassName') ?? ''),
    totalFees: Number(pick(raw, 'totalFees', 'TotalFees') ?? 0),
    paidAmount: Number(pick(raw, 'paidAmount', 'PaidAmount') ?? 0),
    dueAmount: Number(pick(raw, 'dueAmount', 'DueAmount') ?? 0),
    paymentProgressPercent: Number(pick(raw, 'paymentProgressPercent', 'PaymentProgressPercent') ?? 0),
    paymentStatus: String(pick(raw, 'paymentStatus', 'PaymentStatus') ?? ''),
    feeHeads,
    semesterStatuses,
    payments,
  };
}

export function statusBadgeClass(status: string): string {
  if (status === 'Fully paid' || status === 'Paid') return 'paid';
  if (status === 'Partial') return 'partial';
  if (status === 'Overdue') return 'overdue';
  if (status === 'Pending' || status === 'Not paid' || status === 'Unpaid') return 'partial';
  return 'neutral';
}

export function buildCollectAllocations(detail: FeeCollectionStudentDetail): CollectAllocationRow[] {
  const rows: CollectAllocationRow[] = [];
  for (const h of detail.feeHeads) {
    for (const inst of h.installments) {
      if (inst.dueAmount <= 0) continue;
      rows.push({
        installmentId: inst.installmentId,
        feeTypeId: inst.feeTypeId || h.feeTypeId,
        label: inst.periodLabel || h.feeTypeName,
        feeTypeName: h.feeTypeName,
        amount: inst.dueAmount,
        checked: isCurrentPeriod(inst.periodLabel),
      });
    }
  }
  if (rows.length && !rows.some((r) => r.checked)) {
    rows.forEach((r) => (r.checked = true));
  }
  return rows;
}

function isCurrentPeriod(periodLabel: string): boolean {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const year = now.getFullYear().toString();
  return periodLabel.includes(month) && periodLabel.includes(year);
}

export { FeePaymentMode };
