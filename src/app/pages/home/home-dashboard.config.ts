import { MenuCodes } from '../../core/constants/menu-codes';
import { User } from '../../core/models/user.model';
import {
  HomeDashboardConfig,
  HomeUserType,
} from './home-dashboard.models';

export function resolveHomeUserType(user: User | null): HomeUserType {
  const raw = [
    user?.roleCode ?? '',
    user?.role ?? '',
    ...(user?.roles ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (raw.includes('student')) return 'student';
  if (raw.includes('parent')) return 'parent';
  if (raw.includes('account')) return 'accountant';
  if (raw.includes('teacher')) return 'teacher';
  if (raw.includes('admin') || raw.includes('principal')) return 'admin';
  return 'default';
}

export function buildHomeDashboardConfig(userType: HomeUserType): HomeDashboardConfig {
  switch (userType) {
    case 'teacher':
      return teacherConfig();
    case 'student':
      return studentConfig();
    case 'parent':
      return parentConfig();
    case 'accountant':
      return accountantConfig();
    case 'admin':
      return adminConfig();
    default:
      return defaultConfig();
  }
}

function teacherConfig(): HomeDashboardConfig {
  return {
    userType: 'teacher',
    roleBadge: 'Teacher',
    contextLine: 'School staff • Class Teacher',
    spotlight: [
      {
        id: 'att-mark',
        title: 'Class Attendance',
        viewAllLabel: 'View all',
        progress: 0.6,
        progressLabel: 'Take attendance for your assigned class',
        ctaLabel: 'Take Attendance',
        ctaIcon: 'checkmark-circle',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'hw-assign',
        title: 'Homework',
        viewAllLabel: 'View all',
        progressLabel: 'Assign and track class homework',
        ctaLabel: 'Open Homework',
        ctaIcon: 'book',
        route: '/homework',
        tone: 'purple',
        requiresMenu: MenuCodes.Homework,
      },
    ],
    primaryActions: [],
    moreActionsTitle: 'School & Class',
    moreActions: [
      {
        id: 'm-marks',
        title: 'Enter Marks',
        icon: 'create-outline',
        iconBg: '#E0F2F1',
        iconColor: '#00897B',
      },
      {
        id: 'm-hw',
        title: 'Homework',
        icon: 'book-outline',
        iconBg: '#EDE7F6',
        iconColor: '#7E57C2',
        route: '/homework',
        requiresMenu: MenuCodes.Homework,
      },
      {
        id: 'm-tt',
        title: 'Timetable',
        icon: 'calendar-outline',
        iconBg: '#FCE4EC',
        iconColor: '#E91E63',
      },
      {
        id: 'm-notice',
        title: 'Notices',
        icon: 'megaphone-outline',
        iconBg: '#E3F2FD',
        iconColor: '#1E88E5',
      },
      {
        id: 'm-students',
        title: 'Students',
        icon: 'school-outline',
        iconBg: '#E8EAF6',
        iconColor: '#3949AB',
        route: '/students',
        requiresMenu: MenuCodes.Students,
      },
      {
        id: 'm-actions',
        title: 'Approvals',
        icon: 'checkmark-circle-outline',
        iconBg: '#EFEBE9',
        iconColor: '#6D4C41',
        route: '/my-actions',
        requiresMenu: MenuCodes.MyActions,
      },
    ],
    myActionsTitle: 'My Actions',
    myActions: [
      {
        id: 'my-attendance',
        title: 'My Attendance',
        icon: 'finger-print-outline',
        iconBg: '#EAF3DE',
        iconColor: '#3B6D11',
        route: '/staff-attendance',
        requiresMenu: MenuCodes.StaffAttendance,
      },
      {
        id: 'my-leave',
        title: 'Leave',
        icon: 'airplane-outline',
        iconBg: '#FFF3E0',
        iconColor: '#FB8C00',
        route: '/leave/mine',
        requiresMenu: MenuCodes.LeaveStaff,
      },
    ],
  };
}

function studentConfig(): HomeDashboardConfig {
  return {
    userType: 'student',
    roleBadge: 'Student',
    contextLine: 'Student portal',
    spotlight: [
      {
        id: 'hw-mine',
        title: 'My Homework',
        viewAllLabel: 'View all',
        progressLabel: 'See assigned homework and due dates',
        ctaLabel: 'Open Homework',
        ctaIcon: 'book',
        route: '/homework',
        tone: 'purple',
        requiresMenu: MenuCodes.Homework,
      },
      {
        id: 'att-view',
        title: 'My Attendance',
        viewAllLabel: 'View all',
        progressLabel: 'Check your attendance record',
        ctaLabel: 'View Attendance',
        ctaIcon: 'checkmark-circle',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
    ],
    primaryActions: [
      {
        id: 'pa-hw',
        title: 'Homework',
        subtitle: 'Assigned work',
        icon: 'book-outline',
        route: '/homework',
        tone: 'purple',
        requiresMenu: MenuCodes.Homework,
      },
      {
        id: 'pa-att',
        title: 'Attendance',
        subtitle: 'View record',
        icon: 'checkbox-outline',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
    ],
    moreActions: [
      {
        id: 'm-tt',
        title: 'Timetable',
        icon: 'calendar-outline',
        iconBg: '#FCE4EC',
        iconColor: '#E91E63',
      },
      {
        id: 'm-notice',
        title: 'Notices',
        icon: 'megaphone-outline',
        iconBg: '#E3F2FD',
        iconColor: '#1E88E5',
      },
      {
        id: 'm-leave',
        title: 'Leave',
        icon: 'airplane-outline',
        iconBg: '#FFF3E0',
        iconColor: '#FB8C00',
        route: '/leave/student-apply',
        requiresMenu: MenuCodes.LeaveStudent,
      },
      {
        id: 'm-hw',
        title: 'Homework',
        icon: 'book-outline',
        iconBg: '#EDE7F6',
        iconColor: '#7E57C2',
        route: '/homework',
        requiresMenu: MenuCodes.Homework,
      },
    ],
  };
}

function parentConfig(): HomeDashboardConfig {
  return {
    userType: 'parent',
    roleBadge: 'Parent',
    contextLine: 'Parent portal',
    spotlight: [
      {
        id: 'att-child',
        title: 'Child Attendance',
        viewAllLabel: 'View all',
        progressLabel: 'Track your child’s attendance',
        ctaLabel: 'View Attendance',
        ctaIcon: 'checkmark-circle',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'hw-child',
        title: 'Homework',
        viewAllLabel: 'View all',
        progressLabel: 'Homework assigned to your child',
        ctaLabel: 'Open Homework',
        ctaIcon: 'book',
        route: '/homework',
        tone: 'purple',
        requiresMenu: MenuCodes.Homework,
      },
    ],
    primaryActions: [
      {
        id: 'pa-att',
        title: 'Attendance',
        subtitle: 'Child record',
        icon: 'checkbox-outline',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'pa-leave',
        title: 'Apply Leave',
        subtitle: 'For your child',
        icon: 'airplane-outline',
        route: '/leave/student-apply',
        tone: 'orange',
        requiresMenu: MenuCodes.LeaveStudent,
      },
    ],
    moreActions: [
      {
        id: 'm-hw',
        title: 'Homework',
        icon: 'book-outline',
        iconBg: '#EDE7F6',
        iconColor: '#7E57C2',
        route: '/homework',
        requiresMenu: MenuCodes.Homework,
      },
      {
        id: 'm-notice',
        title: 'Notices',
        icon: 'megaphone-outline',
        iconBg: '#E3F2FD',
        iconColor: '#1E88E5',
      },
      {
        id: 'm-tt',
        title: 'Timetable',
        icon: 'calendar-outline',
        iconBg: '#FCE4EC',
        iconColor: '#E91E63',
      },
      {
        id: 'm-fee',
        title: 'Fees',
        icon: 'card-outline',
        iconBg: '#E0F2F1',
        iconColor: '#00897B',
      },
    ],
  };
}

function accountantConfig(): HomeDashboardConfig {
  return {
    userType: 'accountant',
    roleBadge: 'Accountant',
    contextLine: 'Accounts & fees',
    spotlight: [
      {
        id: 'fee-collect',
        title: 'Fee Collection',
        viewAllLabel: 'View all',
        progressLabel: 'Collect and track school fees',
        ctaLabel: 'Open Fees',
        ctaIcon: 'cash',
        tone: 'teal',
        requiresMenu: MenuCodes.SalaryPayroll,
      },
      {
        id: 'payroll',
        title: 'Payroll',
        viewAllLabel: 'View all',
        progressLabel: 'Salary and payroll overview',
        ctaLabel: 'Open Payroll',
        ctaIcon: 'wallet',
        tone: 'blue',
        requiresMenu: MenuCodes.SalaryPayroll,
      },
    ],
    primaryActions: [
      {
        id: 'pa-fee',
        title: 'Fee Collection',
        subtitle: 'Collect fees',
        icon: 'cash-outline',
        tone: 'teal',
        requiresMenu: MenuCodes.SalaryPayroll,
      },
      {
        id: 'pa-payroll',
        title: 'Payroll',
        subtitle: 'Staff salary',
        icon: 'wallet-outline',
        tone: 'blue',
        requiresMenu: MenuCodes.SalaryPayroll,
      },
    ],
    moreActions: [
      {
        id: 'm-fee',
        title: 'Fees',
        icon: 'card-outline',
        iconBg: '#E0F2F1',
        iconColor: '#00897B',
        requiresMenu: MenuCodes.SalaryPayroll,
      },
      {
        id: 'm-actions',
        title: 'My Actions',
        icon: 'checkmark-circle-outline',
        iconBg: '#E8F5E9',
        iconColor: '#43A047',
        route: '/my-actions',
        requiresMenu: MenuCodes.MyActions,
      },
      {
        id: 'm-notice',
        title: 'Notices',
        icon: 'megaphone-outline',
        iconBg: '#E3F2FD',
        iconColor: '#1E88E5',
      },
      {
        id: 'm-staff-att',
        title: 'Staff Att.',
        icon: 'finger-print-outline',
        iconBg: '#FFF3E0',
        iconColor: '#FB8C00',
        route: '/staff-attendance',
        requiresMenu: MenuCodes.StaffAttendance,
      },
    ],
  };
}

function adminConfig(): HomeDashboardConfig {
  return {
    userType: 'admin',
    roleBadge: 'Admin',
    contextLine: 'School administration',
    spotlight: [
      {
        id: 'att-overview',
        title: 'Attendance',
        viewAllLabel: 'View all',
        progressLabel: 'Monitor and mark attendance',
        ctaLabel: 'Open Attendance',
        ctaIcon: 'checkmark-circle',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'hw-overview',
        title: 'Homework',
        viewAllLabel: 'View all',
        progressLabel: 'School homework overview',
        ctaLabel: 'Open Homework',
        ctaIcon: 'book',
        route: '/homework',
        tone: 'purple',
        requiresMenu: MenuCodes.Homework,
      },
    ],
    primaryActions: [
      {
        id: 'pa-att',
        title: 'Attendance',
        subtitle: 'Classes today',
        icon: 'checkmark-done-outline',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'pa-students',
        title: 'Students',
        subtitle: 'Manage students',
        icon: 'people-outline',
        route: '/students',
        tone: 'teal',
        requiresMenu: MenuCodes.Students,
      },
    ],
    moreActions: [
      {
        id: 'm-hw',
        title: 'Homework',
        icon: 'book-outline',
        iconBg: '#EDE7F6',
        iconColor: '#7E57C2',
        route: '/homework',
        requiresMenu: MenuCodes.Homework,
      },
      {
        id: 'm-actions',
        title: 'My Actions',
        icon: 'checkmark-circle-outline',
        iconBg: '#E8F5E9',
        iconColor: '#43A047',
        route: '/my-actions',
        requiresMenu: MenuCodes.MyActions,
      },
      {
        id: 'm-leave',
        title: 'Staff Leave',
        icon: 'airplane-outline',
        iconBg: '#FFF3E0',
        iconColor: '#FB8C00',
        route: '/leave/staff-apply',
        requiresMenu: MenuCodes.LeaveStaff,
      },
      {
        id: 'm-staff-att',
        title: 'Staff Att.',
        icon: 'finger-print-outline',
        iconBg: '#EFEBE9',
        iconColor: '#6D4C41',
        route: '/staff-attendance',
        requiresMenu: MenuCodes.StaffAttendance,
      },
      {
        id: 'm-notice',
        title: 'Notices',
        icon: 'megaphone-outline',
        iconBg: '#E3F2FD',
        iconColor: '#1E88E5',
      },
      {
        id: 'm-tt',
        title: 'Timetable',
        icon: 'calendar-outline',
        iconBg: '#FCE4EC',
        iconColor: '#E91E63',
      },
    ],
  };
}

function defaultConfig(): HomeDashboardConfig {
  return {
    userType: 'default',
    roleBadge: 'User',
    contextLine: 'School portal',
    spotlight: [
      {
        id: 'home-def',
        title: 'Quick start',
        progressLabel: 'Open modules from more actions below',
        ctaLabel: 'Browse modules',
        ctaIcon: 'apps',
        tone: 'green',
      },
    ],
    primaryActions: [
      {
        id: 'pa-att',
        title: 'Attendance',
        subtitle: 'Open module',
        icon: 'checkbox-outline',
        route: '/attendance',
        tone: 'green',
        requiresMenu: MenuCodes.Attendance,
      },
      {
        id: 'pa-hw',
        title: 'Homework',
        subtitle: 'Open module',
        icon: 'book-outline',
        route: '/homework',
        tone: 'teal',
        requiresMenu: MenuCodes.Homework,
      },
    ],
    moreActions: [
      {
        id: 'm-students',
        title: 'Students',
        icon: 'people-outline',
        iconBg: '#E8EAF6',
        iconColor: '#3949AB',
        route: '/students',
        requiresMenu: MenuCodes.Students,
      },
      {
        id: 'm-actions',
        title: 'My Actions',
        icon: 'checkmark-circle-outline',
        iconBg: '#E8F5E9',
        iconColor: '#43A047',
        route: '/my-actions',
        requiresMenu: MenuCodes.MyActions,
      },
    ],
  };
}
