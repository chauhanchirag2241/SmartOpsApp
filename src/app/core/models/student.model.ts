export enum StudentFilter {
  All = 0,
  Active = 1,
  Inactive = 2,
  FeeOverdue = 3,
}

export interface StudentListItem {
  id: string;
  classId?: string | null;
  name: string;
  email?: string | null;
  admNo?: string | null;
  rollNumber?: string | null;
  class?: string | null;
  attendance?: string | null;
  fees?: string | null;
  status?: string | null;
  isActive?: boolean;
  enrollmentIsActive?: boolean;
}

export interface PagedStudentsResult {
  items: StudentListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
