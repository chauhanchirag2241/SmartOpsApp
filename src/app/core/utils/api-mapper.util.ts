import { AttendanceStatus, AttendanceStatusKey } from '../models/attendance.model';
import { HomeworkSubmissionStatus } from '../models/homework.model';

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function parseAttendanceStatusFromApi(status: unknown): AttendanceStatusKey {
  if (status == null || status === '') return '';
  const numericMap: Record<number, AttendanceStatusKey> = {
    [AttendanceStatus.Present]: 'present',
    [AttendanceStatus.Absent]: 'absent',
    [AttendanceStatus.Leave]: 'leave',
    [AttendanceStatus.Late]: 'late',
  };
  if (typeof status === 'number') return numericMap[status] || '';
  const n = String(status).trim().toLowerCase();
  const stringMap: Record<string, AttendanceStatusKey> = {
    present: 'present',
    absent: 'absent',
    leave: 'leave',
    late: 'late',
    '1': 'present',
    '2': 'absent',
    '3': 'leave',
    '4': 'late',
  };
  return stringMap[n] || '';
}

export function attendanceStatusToApi(status: AttendanceStatusKey): AttendanceStatus | null {
  const map: Record<string, AttendanceStatus> = {
    present: AttendanceStatus.Present,
    absent: AttendanceStatus.Absent,
    leave: AttendanceStatus.Leave,
    late: AttendanceStatus.Late,
  };
  return status ? map[status] ?? null : null;
}

export function normalizeHomeworkStatus(status: unknown): HomeworkSubmissionStatus {
  if (typeof status === 'number') return status as HomeworkSubmissionStatus;
  const n = String(status).toLowerCase();
  if (n === 'submitted' || n === '1') return HomeworkSubmissionStatus.Submitted;
  if (n === 'late' || n === '2') return HomeworkSubmissionStatus.Late;
  return HomeworkSubmissionStatus.Pending;
}

export function unwrapRecord<T>(raw: unknown): T {
  return raw as T;
}

export function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}
