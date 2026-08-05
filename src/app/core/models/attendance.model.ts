export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  Late = 3,
}

export type AttendanceStatusKey = '' | 'present' | 'absent' | 'late';

export interface StudentAttendanceItem {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface SubmitAttendanceRequest {
  classId: string;
  attendanceDate: string;
  students: StudentAttendanceItem[];
}

export interface ClassAttendanceResponse {
  classId: string;
  className: string;
  attendanceDate: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  isSubmitted: boolean;
  students: AttendanceStudentRow[];
}

export interface AttendanceStudentRow {
  id?: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  status: AttendanceStatus | number | string;
  statusLabel?: string;
  remarks?: string | null;
  attendanceDate?: string;
}
