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
  Timetable: 'TIMETABLE',
  ClassTimetable: 'CLASS_TIMETABLE',
  MyTimetable: 'MY_TIMETABLE',
  TeacherTimetableReport: 'TEACHER_TIMETABLE_REPORT',
  Exams: 'EXAMS',
  ExamSchedule: 'EXAM_SCHEDULE',
  ExamMarksEntry: 'EXAM_MARKS_ENTRY',
  FeeCollection: 'FEE_COLLECTION',
} as const;

export type MenuCode = (typeof MenuCodes)[keyof typeof MenuCodes];
