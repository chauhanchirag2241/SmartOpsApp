export interface FeeCollectionHead {
  feeHeadId: string;
  feeHeadName: string;
  isMandatory: boolean;
  isEditable: boolean;
  dueAmount: number;
  paidAmount: number;
  balance: number;
  isExcluded: boolean;
}

export interface FeeCollectionMasterCard {
  feeMasterId: string;
  feeName: string;
  feeType: string;
  publishedOn?: string | null;
  defaultDueDate?: string | null;
  academicPeriodId?: string | null;
  periodLabel?: string | null;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  status: string;
  isPublished?: boolean;
  canCollect: boolean;
  studentAmountsLocked: boolean;
  heads: FeeCollectionHead[];
}

export interface FeeCollectionHistoryLine {
  feeHeadId: string;
  feeHeadName: string;
  dueAmount: number;
  paidAmount: number;
  balanceAfter?: number;
  isMandatory: boolean;
  isEditable: boolean;
}

export interface FeeCollectionHistoryPayment {
  paymentId: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod?: string | null;
  academicPeriodId?: string | null;
  periodLabel?: string | null;
  collectedBy?: string | null;
  remarks?: string | null;
  lines: FeeCollectionHistoryLine[];
}

export interface FeeCollectionHistoryRow {
  feeMasterId: string;
  feeName: string;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  status: string;
  payments: FeeCollectionHistoryPayment[];
}

export interface FeeCollectionStudentInfo {
  studentId: string;
  studentName: string;
  fatherName?: string | null;
  mobile?: string | null;
  className?: string | null;
  section?: string | null;
  rollNumber?: string | null;
  admissionNo?: string | null;
  initials: string;
}

export interface FeeCollectionDetail {
  student: FeeCollectionStudentInfo;
  summaryTotal: number;
  summaryPaid: number;
  summaryPending: number;
  dueCards: FeeCollectionMasterCard[];
  history: FeeCollectionHistoryRow[];
}
