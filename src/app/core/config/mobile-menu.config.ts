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
    route: '/tabs/attendance',
    tab: 'attendance',
    icon: 'checkbox-outline',
    color: 'success',
  },
  [MenuCodes.Homework]: {
    menuCode: MenuCodes.Homework,
    title: 'Homework',
    subtitle: 'Assign and track homework',
    route: '/tabs/homework',
    tab: 'homework',
    icon: 'book-outline',
    color: 'primary',
  },
};
