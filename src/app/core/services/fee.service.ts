import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  FeeCollectionDetail,
  FeeCollectionHead,
  FeeCollectionHistoryLine,
  FeeCollectionHistoryPayment,
  FeeCollectionHistoryRow,
  FeeCollectionMasterCard,
  FeeCollectionStudentInfo,
} from '../models/fee.model';
import { ApiService } from './api.service';
import { pickStr } from '../utils/api-mapper.util';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private readonly api = inject(ApiService);

  /** Own fees for the signed-in student. */
  getMyFees(): Observable<FeeCollectionDetail> {
    return this.api.get<unknown>('fees/collection/my').pipe(map((raw) => this.normalizeDetail(raw)));
  }

  private normalizeDetail(raw: unknown): FeeCollectionDetail {
    const r = (raw ?? {}) as Record<string, unknown>;
    const studentRaw = (r['student'] ?? r['Student'] ?? {}) as Record<string, unknown>;
    const dueRaw = (r['dueCards'] ?? r['DueCards'] ?? []) as unknown[];
    const historyRaw = (r['history'] ?? r['History'] ?? []) as unknown[];

    return {
      student: this.normalizeStudent(studentRaw),
      summaryTotal: this.num(r, 'summaryTotal', 'SummaryTotal'),
      summaryPaid: this.num(r, 'summaryPaid', 'SummaryPaid'),
      summaryPending: this.num(r, 'summaryPending', 'SummaryPending'),
      dueCards: dueRaw.map((c) => this.normalizeCard(c)),
      history: historyRaw.map((h) => this.normalizeHistory(h)),
    };
  }

  private normalizeStudent(r: Record<string, unknown>): FeeCollectionStudentInfo {
    return {
      studentId: pickStr(r, 'studentId', 'StudentId'),
      studentName: pickStr(r, 'studentName', 'StudentName'),
      fatherName: pickStr(r, 'fatherName', 'FatherName') || null,
      mobile: pickStr(r, 'mobile', 'Mobile') || null,
      className: pickStr(r, 'className', 'ClassName') || null,
      section: pickStr(r, 'section', 'Section') || null,
      rollNumber: pickStr(r, 'rollNumber', 'RollNumber') || null,
      admissionNo: pickStr(r, 'admissionNo', 'AdmissionNo') || null,
      initials: pickStr(r, 'initials', 'Initials') || 'ST',
    };
  }

  private normalizeCard(raw: unknown): FeeCollectionMasterCard {
    const r = (raw ?? {}) as Record<string, unknown>;
    const headsRaw = (r['heads'] ?? r['Heads'] ?? []) as unknown[];
    return {
      feeMasterId: pickStr(r, 'feeMasterId', 'FeeMasterId'),
      feeName: pickStr(r, 'feeName', 'FeeName'),
      feeType: pickStr(r, 'feeType', 'FeeType'),
      publishedOn: pickStr(r, 'publishedOn', 'PublishedOn') || null,
      defaultDueDate: pickStr(r, 'defaultDueDate', 'DefaultDueDate') || null,
      academicPeriodId: pickStr(r, 'academicPeriodId', 'AcademicPeriodId') || null,
      periodLabel: pickStr(r, 'periodLabel', 'PeriodLabel') || null,
      totalDue: this.num(r, 'totalDue', 'TotalDue'),
      totalPaid: this.num(r, 'totalPaid', 'TotalPaid'),
      totalPending: this.num(r, 'totalPending', 'TotalPending'),
      status: pickStr(r, 'status', 'Status') || 'Pending',
      isPublished: this.bool(r, 'isPublished', 'IsPublished', true),
      canCollect: this.bool(r, 'canCollect', 'CanCollect', false),
      studentAmountsLocked: this.bool(r, 'studentAmountsLocked', 'StudentAmountsLocked', false),
      heads: headsRaw.map((h) => this.normalizeHead(h)),
    };
  }

  private normalizeHead(raw: unknown): FeeCollectionHead {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      feeHeadId: pickStr(r, 'feeHeadId', 'FeeHeadId'),
      feeHeadName: pickStr(r, 'feeHeadName', 'FeeHeadName'),
      isMandatory: this.bool(r, 'isMandatory', 'IsMandatory', false),
      isEditable: this.bool(r, 'isEditable', 'IsEditable', false),
      dueAmount: this.num(r, 'dueAmount', 'DueAmount'),
      paidAmount: this.num(r, 'paidAmount', 'PaidAmount'),
      balance: this.num(r, 'balance', 'Balance'),
      isExcluded: this.bool(r, 'isExcluded', 'IsExcluded', false),
    };
  }

  private normalizeHistory(raw: unknown): FeeCollectionHistoryRow {
    const r = (raw ?? {}) as Record<string, unknown>;
    const paymentsRaw = (r['payments'] ?? r['Payments'] ?? []) as unknown[];
    return {
      feeMasterId: pickStr(r, 'feeMasterId', 'FeeMasterId'),
      feeName: pickStr(r, 'feeName', 'FeeName'),
      totalDue: this.num(r, 'totalDue', 'TotalDue'),
      totalPaid: this.num(r, 'totalPaid', 'TotalPaid'),
      totalPending: this.num(r, 'totalPending', 'TotalPending'),
      status: pickStr(r, 'status', 'Status') || 'Pending',
      payments: paymentsRaw.map((p) => this.normalizePayment(p)),
    };
  }

  private normalizePayment(raw: unknown): FeeCollectionHistoryPayment {
    const r = (raw ?? {}) as Record<string, unknown>;
    const linesRaw = (r['lines'] ?? r['Lines'] ?? []) as unknown[];
    return {
      paymentId: pickStr(r, 'paymentId', 'PaymentId'),
      paymentDate: pickStr(r, 'paymentDate', 'PaymentDate'),
      totalAmount: this.num(r, 'totalAmount', 'TotalAmount'),
      paymentMethod: pickStr(r, 'paymentMethod', 'PaymentMethod') || null,
      academicPeriodId: pickStr(r, 'academicPeriodId', 'AcademicPeriodId') || null,
      periodLabel: pickStr(r, 'periodLabel', 'PeriodLabel') || null,
      collectedBy: pickStr(r, 'collectedBy', 'CollectedBy') || null,
      remarks: pickStr(r, 'remarks', 'Remarks') || null,
      lines: linesRaw.map((l) => this.normalizeHistoryLine(l)),
    };
  }

  private normalizeHistoryLine(raw: unknown): FeeCollectionHistoryLine {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      feeHeadId: pickStr(r, 'feeHeadId', 'FeeHeadId'),
      feeHeadName: pickStr(r, 'feeHeadName', 'FeeHeadName'),
      dueAmount: this.num(r, 'dueAmount', 'DueAmount'),
      paidAmount: this.num(r, 'paidAmount', 'PaidAmount'),
      balanceAfter: this.num(r, 'balanceAfter', 'BalanceAfter'),
      isMandatory: this.bool(r, 'isMandatory', 'IsMandatory', false),
      isEditable: this.bool(r, 'isEditable', 'IsEditable', false),
    };
  }

  private num(r: Record<string, unknown>, ...keys: string[]): number {
    for (const k of keys) {
      const v = r[k];
      if (v != null && v !== '') return Number(v);
    }
    return 0;
  }

  private bool(
    r: Record<string, unknown>,
    camel: string,
    pascal: string,
    fallback: boolean,
  ): boolean {
    const v = r[camel] ?? r[pascal];
    if (typeof v === 'boolean') return v;
    if (v == null) return fallback;
    return String(v).toLowerCase() === 'true';
  }
}
