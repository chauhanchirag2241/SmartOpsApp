export const MenuCodes = {
  Dashboard: 'DASHBOARD',
  Attendance: 'ATTENDANCE',
  Homework: 'HOMEWORK',
  Students: 'STUDENTS',
  Teachers: 'TEACHERS',
  Classes: 'CLASSES',
  FeesCollection: 'FEES_COLLECTION',
  SalaryPayroll: 'SALARY_PAYROLL',
} as const;

export type MenuCode = (typeof MenuCodes)[keyof typeof MenuCodes];
