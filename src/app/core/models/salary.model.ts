export type PayrollEntryStatus = 0 | 1 | 2 | 'Draft' | 'Processed' | 'Paid';

export interface SalaryLineItem {
  componentId?: string | null;
  name: string;
  componentType?: number | string;
  componentTypeLabel?: string;
  amount: number;
  isEarning: boolean;
}

export interface MyPayrollMonthItem {
  entryId: string;
  payYear: number;
  payMonth: number;
  monthLabel: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  status: PayrollEntryStatus;
  statusLabel: string;
}

export interface MyPayrollHistory {
  employeeName: string;
  months: MyPayrollMonthItem[];
}

export interface Payslip {
  entryId: string;
  payYear: number;
  payMonth: number;
  employeeName: string;
  employeeCode?: string | null;
  department?: string | null;
  designation?: string | null;
  useAttendanceWiseSalary: boolean;
  workingDays: number;
  presentDays: number;
  daysCut: number;
  attendanceCutAmount: number;
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  panNo?: string | null;
  status: PayrollEntryStatus;
  statusLabel: string;
  paidOn?: string | null;
  earnings: SalaryLineItem[];
  deductions: SalaryLineItem[];
}
