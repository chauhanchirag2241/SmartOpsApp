export const MenuCodes = {
  Dashboard: 'DASHBOARD',
  Attendance: 'ATTENDANCE',
  Homework: 'HOMEWORK',
  Students: 'STUDENTS',
  Teachers: 'TEACHERS',
  Classes: 'CLASSES',
  SalaryPayroll: 'SALARY_PAYROLL',
  LeaveStaff: 'LEAVE_STAFF',
  LeaveStudent: 'LEAVE_STUDENT',
  MyActions: 'MY_ACTIONS',
  StaffAttendance: 'STAFF_ATTENDANCE',
} as const;

export type MenuCode = (typeof MenuCodes)[keyof typeof MenuCodes];
