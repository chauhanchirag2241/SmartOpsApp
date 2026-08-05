import { MenuCodes } from '../constants/menu-codes';

export interface MobileMenuRoute {
  menuCode: string;
  title: string;
  subtitle: string;
  route: string;
  tab?: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

/** Dashboard tile built from menus/my + auth/permissions (same as SmartOps UI). */
export interface DashboardModuleItem {
  menuCode: string;
  name: string;
  icon: string;
  mobileRoute?: string;
  availableOnMobile: boolean;
  displayOrder: number;
}

/** Menus implemented in the mobile app — others show as coming soon on home if permitted. */
export const MOBILE_MENU_ROUTES: Record<string, MobileMenuRoute> = {
  [MenuCodes.Dashboard]: {
    menuCode: MenuCodes.Dashboard,
    title: 'Dashboard',
    subtitle: 'Overview and shortcuts',
    route: '/tabs/home',
    tab: 'home',
    icon: 'home-outline',
    color: 'primary',
  },
  [MenuCodes.Attendance]: {
    menuCode: MenuCodes.Attendance,
    title: 'Attendance',
    subtitle: 'Mark daily class attendance',
    route: '/attendance',
    icon: 'checkbox-outline',
    color: 'success',
  },
  [MenuCodes.Homework]: {
    menuCode: MenuCodes.Homework,
    title: 'Homework',
    subtitle: 'Assign and track homework',
    route: '/homework',
    icon: 'book-outline',
    color: 'primary',
  },
  [MenuCodes.Students]: {
    menuCode: MenuCodes.Students,
    title: 'Students',
    subtitle: 'View and manage students',
    route: '/students',
    icon: 'people-outline',
    color: 'primary',
  },
  [MenuCodes.LeaveStaff]: {
    menuCode: MenuCodes.LeaveStaff,
    title: 'Staff Leave',
    subtitle: 'Apply for leave',
    route: '/leave/staff-apply',
    icon: 'calendar-outline',
    color: 'warning',
  },
  [MenuCodes.LeaveStudent]: {
    menuCode: MenuCodes.LeaveStudent,
    title: 'Student Leave',
    subtitle: 'Apply leave for your child',
    route: '/leave/student-apply',
    icon: 'school-outline',
    color: 'primary',
  },
  [MenuCodes.MyActions]: {
    menuCode: MenuCodes.MyActions,
    title: 'My Actions',
    subtitle: 'Pending approvals and responses',
    route: '/my-actions',
    icon: 'checkmark-circle-outline',
    color: 'success',
  },
  [MenuCodes.StaffAttendance]: {
    menuCode: MenuCodes.StaffAttendance,
    title: 'Staff Attendance',
    subtitle: 'Check in and check out',
    route: '/staff-attendance',
    icon: 'finger-print-outline',
    color: 'success',
  },
};
