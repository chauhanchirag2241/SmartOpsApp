/** Map API menu codes / Material icon names to Ionicons for the dashboard grid. */
const MENU_CODE_ICONS: Record<string, string> = {
  DASHBOARD: 'home-outline',
  ATTENDANCE: 'checkbox-outline',
  HOMEWORK: 'book-outline',
  STUDENTS: 'people-outline',
  TEACHERS: 'school-outline',
  CLASSES: 'easel-outline',
  CLASS_MAPPINGS: 'git-network-outline',
  SUBJECTS: 'library-outline',
  ACADEMIC_YEARS: 'calendar-outline',
  ACADEMICS: 'school-outline',
  FEES_STRUCTURE: 'document-text-outline',
  FEES_COLLECTION: 'card-outline',
  SALARY_STRUCTURE: 'document-text-outline',
  SALARY_EMPLOYEES: 'person-outline',
  SALARY_PAYROLL: 'wallet-outline',
  SETTINGS: 'settings-outline',
  USERS: 'people-circle-outline',
  ROLES: 'shield-outline',
  SCHOOLS: 'business-outline',
};

const MATERIAL_TO_ION: Record<string, string> = {
  assignment_turned_in: 'checkbox-outline',
  menu_book: 'book-outline',
  calendar_month: 'calendar-outline',
  calendar_today: 'calendar-outline',
  edit_document: 'document-text-outline',
  payments: 'card-outline',
  local_library: 'library-outline',
  directions_bus: 'bus-outline',
  campaign: 'megaphone-outline',
  event_busy: 'calendar-clear-outline',
  photo_library: 'images-outline',
  lock: 'lock-closed-outline',
  more_horiz: 'ellipsis-horizontal-outline',
  school: 'school-outline',
  verified_user: 'shield-checkmark-outline',
  person: 'person-outline',
  schedule: 'time-outline',
  settings: 'settings-outline',
  logout: 'log-out-outline',
  people: 'people-outline',
  class: 'easel-outline',
  groups: 'people-outline',
};

export function resolveMenuIcon(menuCode: string, apiIcon?: string | null): string {
  const code = menuCode?.toUpperCase() ?? '';
  if (MENU_CODE_ICONS[code]) {
    return MENU_CODE_ICONS[code];
  }
  const key = (apiIcon ?? '').trim().toLowerCase();
  if (key && MATERIAL_TO_ION[key]) {
    return MATERIAL_TO_ION[key];
  }
  return 'apps-outline';
}
