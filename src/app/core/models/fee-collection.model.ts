export enum FeePaymentMode {
  Cash = 0,
  Upi = 1,
  BankTransfer = 2,
  Cheque = 3,
  Card = 4,
}

export const FEE_PAYMENT_MODE_OPTIONS = [
  { value: FeePaymentMode.Cash, label: 'Cash' },
  { value: FeePaymentMode.Upi, label: 'UPI' },
  { value: FeePaymentMode.BankTransfer, label: 'Bank transfer / NEFT' },
  { value: FeePaymentMode.Cheque, label: 'Cheque' },
  { value: FeePaymentMode.Card, label: 'Card (POS)' },
];

export interface FeeCollectionStudentItem {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
}

export interface FeeInstallmentItem {
  installmentId: string;
  feeTypeId: string;
  periodLabel: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}

export interface FeeHeadItem {
  feeTypeId: string;
  feeTypeName: string;
  collectionTypeLabel: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  installments: FeeInstallmentItem[];
}

export interface FeePaymentHistoryItem {
  paymentId: string;
  paymentDate: string;
  paymentModeLabel: string;
  amount: number;
  feeHeadsSummary: string;
}

export interface FeeCollectionStudentDetail {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentProgressPercent: number;
  paymentStatus: string;
  feeHeads: FeeHeadItem[];
  semesterStatuses: {
    semesterName: string;
    startDate: string;
    endDate: string;
    paidAmount: number;
    totalAmount: number;
    status: string;
  }[];
  payments: FeePaymentHistoryItem[];
}

export interface CollectAllocationRow {
  installmentId: string;
  feeTypeId: string;
  label: string;
  feeTypeName: string;
  amount: number;
  checked: boolean;
}
