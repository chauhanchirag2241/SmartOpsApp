export type UserRole =
  | 'admin'
  | 'teacher'
  | 'student'
  | 'Student'
  | 'parent'
  | 'Admin'
  | 'Accountant'
  | 'SmartOpsAdmin'
  | 'School Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: string[];
  roleId?: string;
  roleCode?: string;
  token?: string;
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  mustChangePassword?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdOn: string;
  roles: string[];
  roleId?: string;
  roleCode?: string;
  mustChangePassword?: boolean;
}
