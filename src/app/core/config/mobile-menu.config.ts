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
  [MenuCodes.FeesCollection]: {
    menuCode: MenuCodes.FeesCollection,
    title: 'Fee Collection',
    subtitle: 'Collect and track student fees',
    route: '/fees/collection',
    icon: 'card-outline',
    color: 'primary',
  },
};
