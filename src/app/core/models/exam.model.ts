/** Exam DTOs mirrored from SmartOpsUI / shared ASP.NET exam APIs. */

export const EXAM_TYPES = [
  'Unit Test',
  'Mid Term',
  'Quarterly',
  'Half Yearly',
  'Annual',
  'Pre-Board',
  'Practice Test',
  'Other',
] as const;

export enum ExamStatus {
  Draft = 0,
  Scheduled = 1,
  Ongoing = 2,
  Completed = 3,
  ResultDeclared = 4,
}

export interface ExamGradeScale {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
}

export interface ExamGroup {
  id: string;
  name: string;
  description?: string | null;
  gradeScaleId?: string | null;
  gradeScaleName?: string | null;
  evaluationType: number | string;
  evaluationTypeLabel: string;
  examCount: number;
  classGroupIds?: string[];
  classGroupNames?: string | null;
}

export interface ExamMarkComponent {
  id?: string | null;
  name: string;
  maxMarks: number;
  passingMarks?: number | null;
  displayOrder: number;
}

export interface ExamClassInfo {
  classId: string;
  className: string;
  classGroupId: string;
  classGroupName: string;
}

export interface ExamListItem {
  id: string;
  name: string;
  examType: string;
  examGroupId: string;
  examGroupName: string;
  status: ExamStatus;
  statusLabel: string;
  resultDeclared: boolean;
  totalMaxMarks: number;
  subjectCount: number;
  classes: ExamClassInfo[];
  isActive?: boolean;
}

export interface ExamDetail {
  id: string;
  examGroupId: string;
  examGroupName: string;
  name: string;
  examType: string;
  academicPeriodId?: string | null;
  minPassPercent: number;
  gradeScaleId?: string | null;
  status: ExamStatus;
  statusLabel: string;
  resultDeclared: boolean;
  description?: string | null;
  classIds: string[];
  classes: ExamClassInfo[];
  components: ExamMarkComponent[];
}

export interface SaveExamRequest {
  examGroupId: string;
  name: string;
  examType: string;
  academicPeriodId?: string | null;
  minPassPercent: number;
  gradeScaleId?: string | null;
  description?: string | null;
  classIds: string[];
  components: ExamMarkComponent[];
}

export interface ExamScheduleItem {
  id: string;
  examId: string;
  examName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  roomNo?: string | null;
  invigilatorId?: string | null;
  invigilatorName?: string | null;
  maxMarks: number;
  status: string;
}

/** Shared with SmartOpsUI — used by web and mobile. */
export interface SaveExamScheduleRequest {
  examId: string;
  classId: string;
  subjectId: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  roomNo?: string | null;
  invigilatorId?: string | null;
}

export interface BulkExamScheduleSlot {
  classId: string;
  subjectId: string;
  examDate: string;
  startTime?: string | null;
  endTime?: string | null;
  roomNo?: string | null;
  invigilatorId?: string | null;
}

export interface BulkCreateExamSchedulesRequest {
  examId: string;
  slots: BulkExamScheduleSlot[];
}

export interface BulkCreateExamSchedulesResult {
  createdCount: number;
  created: ExamScheduleItem[];
}

// ── Marks entry (shared with SmartOpsUI — used by web and mobile) ──

export interface ExamComponentMark {
  componentId: string;
  marksObtained?: number | null;
}

export interface ExamStudentMarksRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  isAbsent: boolean;
  remark?: string | null;
  marks: ExamComponentMark[];
}

export interface ExamMarksGrid {
  examScheduleId: string;
  examId: string;
  examName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  minPassPercent: number;
  components: ExamMarkComponent[];
  students: ExamStudentMarksRow[];
}

export interface SaveStudentMarks {
  studentId: string;
  isAbsent: boolean;
  remark?: string | null;
  marks: ExamComponentMark[];
}

export interface SaveExamMarksRequest {
  examScheduleId: string;
  students: SaveStudentMarks[];
}

export interface ExamSubjectProgress {
  examScheduleId: string;
  subjectId: string;
  subjectName: string;
  entered: number;
  total: number;
}
