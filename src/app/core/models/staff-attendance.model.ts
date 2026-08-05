export type StaffPunchType = 'checkin' | 'checkout';

export interface EmployeeAttendanceSettings {
  type: string;
  allowsManual: boolean;
  allowsFace: boolean;
}

export interface StaffAttendanceRow {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  attendanceDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInSource?: string | null;
  checkOutSource?: string | null;
  status: string | number;
  statusLabel: string;
  remarks?: string | null;
  checkInConfidence?: number | null;
  checkOutConfidence?: number | null;
  isFaceEnrolled: boolean;
  photoUrl?: string | null;
  shiftStartTime?: string | null;
}

export interface ManualPunchRequest {
  punchType: StaffPunchType;
  employeeId?: string | null;
  attendanceDate?: string | null;
  remarks?: string | null;
}

export interface StaffAttendanceReport {
  month: number;
  year: number;
  departmentId?: string | null;
  totalWorkingDays: number;
  employees: StaffAttendanceReportEmployee[];
}

export interface StaffAttendanceReportEmployee {
  employeeId: string;
  employeeName: string;
  departmentName?: string | null;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDayDays: number;
  dailyStatus: Record<string, string>;
}
