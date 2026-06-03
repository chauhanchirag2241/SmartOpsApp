export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'Admin' | 'Accountant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: string[];
  roleId?: string;
  roleCode?: string;
  token?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  createdOn: string;
  roles: string[];
  roleId?: string;
  roleCode?: string;
}
