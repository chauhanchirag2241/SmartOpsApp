export enum HomeworkSubmissionStatus {
  Pending = 0,
  Submitted = 1,
  Late = 2,
}

export enum HomeworkPriority {
  Normal = 0,
  High = 1,
  Low = 2,
}

export enum HomeworkSubmissionType {
  Physical = 0,
  Online = 1,
  Both = 2,
}

export interface CreateHomeworkRequest {
  classId: string;
  subjectId: string;
  title: string;
  description?: string | null;
  assignDate: string;
  dueDate: string;
  priority: HomeworkPriority;
  marks?: number | null;
  submissionType: HomeworkSubmissionType;
}

export interface StudentHomeworkSubmissionItem {
  studentId: string;
  status: HomeworkSubmissionStatus;
  submittedOn?: string | null;
  marks?: number | null;
  remark?: string | null;
}

export interface HomeworkListItem {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assignDate: string;
  dueDate: string;
  priority: HomeworkPriority;
  priorityLabel: string;
  marks?: number | null;
  submissionType: HomeworkSubmissionType;
  submissionTypeLabel: string;
  status: string;
  submitted: number;
  pending: number;
  late: number;
  total: number;
}

export interface HomeworkStats {
  totalAssigned: number;
  dueToday: number;
  totalSubmissions: number;
  overdue: number;
}

export interface HomeworkDetail {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assignDate: string;
  dueDate: string;
  priority: HomeworkPriority;
  priorityLabel: string;
  marks?: number | null;
  submissionType: HomeworkSubmissionType;
  submissionTypeLabel: string;
  status: string;
  submitted: number;
  pending: number;
  late: number;
  total: number;
  isSubmissionsSubmitted: boolean;
  students: HomeworkStudentRow[];
}

export interface HomeworkStudentRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  status: HomeworkSubmissionStatus | number;
  statusLabel?: string;
  submittedOn?: string | null;
  marks?: number | null;
  remark?: string | null;
}
