import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  MyPayrollHistory,
  MyPayrollMonthItem,
  Payslip,
  SalaryLineItem,
} from '../models/salary.model';
import { ApiService } from './api.service';
import { pickStr } from '../utils/api-mapper.util';

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private readonly api = inject(ApiService);
  private readonly base = 'salary/payroll';

  getMyHistory(): Observable<MyPayrollHistory> {
    return this.api.get<unknown>(`${this.base}/my`).pipe(map((raw) => this.normalizeHistory(raw)));
  }

  getMyPayslip(entryId: string): Observable<Payslip> {
    return this.api
      .get<unknown>(`${this.base}/my/${encodeURIComponent(entryId)}`)
      .pipe(map((raw) => this.normalizePayslip(raw)));
  }

  private normalizeHistory(raw: unknown): MyPayrollHistory {
    const r = (raw ?? {}) as Record<string, unknown>;
    const monthsRaw = (r['months'] ?? r['Months'] ?? []) as unknown[];
    return {
      employeeName: pickStr(r, 'employeeName', 'EmployeeName'),
      months: monthsRaw.map((m) => this.normalizeMonth(m)),
    };
  }

  private normalizeMonth(raw: unknown): MyPayrollMonthItem {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      entryId: pickStr(r, 'entryId', 'EntryId'),
      payYear: Number(r['payYear'] ?? r['PayYear'] ?? 0),
      payMonth: Number(r['payMonth'] ?? r['PayMonth'] ?? 0),
      monthLabel: pickStr(r, 'monthLabel', 'MonthLabel') || this.fallbackMonthLabel(
        Number(r['payYear'] ?? r['PayYear'] ?? 0),
        Number(r['payMonth'] ?? r['PayMonth'] ?? 0),
      ),
      grossSalary: Number(r['grossSalary'] ?? r['GrossSalary'] ?? 0),
      totalDeductions: Number(r['totalDeductions'] ?? r['TotalDeductions'] ?? 0),
      netSalary: Number(r['netSalary'] ?? r['NetSalary'] ?? 0),
      workingDays: Number(r['workingDays'] ?? r['WorkingDays'] ?? 0),
      status: (r['status'] ?? r['Status'] ?? 0) as MyPayrollMonthItem['status'],
      statusLabel: pickStr(r, 'statusLabel', 'StatusLabel') || 'Unknown',
    };
  }

  private normalizePayslip(raw: unknown): Payslip {
    const r = (raw ?? {}) as Record<string, unknown>;
    const earningsRaw = (r['earnings'] ?? r['Earnings'] ?? []) as unknown[];
    const deductionsRaw = (r['deductions'] ?? r['Deductions'] ?? []) as unknown[];
    return {
      entryId: pickStr(r, 'entryId', 'EntryId'),
      payYear: Number(r['payYear'] ?? r['PayYear'] ?? 0),
      payMonth: Number(r['payMonth'] ?? r['PayMonth'] ?? 0),
      employeeName: pickStr(r, 'employeeName', 'EmployeeName'),
      employeeCode: pickStr(r, 'employeeCode', 'EmployeeCode') || null,
      department: pickStr(r, 'department', 'Department') || null,
      designation: pickStr(r, 'designation', 'Designation') || null,
      useAttendanceWiseSalary: !!(r['useAttendanceWiseSalary'] ?? r['UseAttendanceWiseSalary']),
      workingDays: Number(r['workingDays'] ?? r['WorkingDays'] ?? 0),
      presentDays: Number(r['presentDays'] ?? r['PresentDays'] ?? 0),
      daysCut: Number(r['daysCut'] ?? r['DaysCut'] ?? 0),
      attendanceCutAmount: Number(r['attendanceCutAmount'] ?? r['AttendanceCutAmount'] ?? 0),
      basicSalary: Number(r['basicSalary'] ?? r['BasicSalary'] ?? 0),
      grossSalary: Number(r['grossSalary'] ?? r['GrossSalary'] ?? 0),
      totalDeductions: Number(r['totalDeductions'] ?? r['TotalDeductions'] ?? 0),
      netSalary: Number(r['netSalary'] ?? r['NetSalary'] ?? 0),
      bankName: pickStr(r, 'bankName', 'BankName') || null,
      bankAccountNumber: pickStr(r, 'bankAccountNumber', 'BankAccountNumber') || null,
      bankIfscCode: pickStr(r, 'bankIfscCode', 'BankIfscCode') || null,
      panNo: pickStr(r, 'panNo', 'PanNo') || null,
      status: (r['status'] ?? r['Status'] ?? 0) as Payslip['status'],
      statusLabel: pickStr(r, 'statusLabel', 'StatusLabel') || 'Unknown',
      paidOn: pickStr(r, 'paidOn', 'PaidOn') || null,
      earnings: earningsRaw.map((x) => this.normalizeLine(x)),
      deductions: deductionsRaw.map((x) => this.normalizeLine(x)),
    };
  }

  private normalizeLine(raw: unknown): SalaryLineItem {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      componentId: pickStr(r, 'componentId', 'ComponentId') || null,
      name: pickStr(r, 'name', 'Name') || 'Component',
      componentType: (r['componentType'] ?? r['ComponentType']) as number | string | undefined,
      componentTypeLabel: pickStr(r, 'componentTypeLabel', 'ComponentTypeLabel') || undefined,
      amount: Number(r['amount'] ?? r['Amount'] ?? 0),
      isEarning: !!(r['isEarning'] ?? r['IsEarning']),
    };
  }

  private fallbackMonthLabel(year: number, month: number): string {
    if (!year || month < 1 || month > 12) return '';
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }
}
