/** Home dashboard models — role-driven spotlight / primary / more actions. */

export type HomeUserType = 'teacher' | 'student' | 'parent' | 'accountant' | 'admin' | 'default';

export interface HomeSpotlightCard {
  id: string;
  title: string;
  viewAllLabel?: string;
  /** Optional progress 0–1 */
  progress?: number;
  progressLabel?: string;
  ctaLabel: string;
  ctaIcon?: string;
  route?: string;
  /** Compact meta shown on secondary-style cards */
  metaIcon?: string;
  metaValue?: string;
  tone?: 'green' | 'orange' | 'blue' | 'teal' | 'purple';
  /** Menu code — card hidden if user lacks view permission (when set) */
  requiresMenu?: string;
}

export interface HomePrimaryAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route?: string;
  tone: 'green' | 'teal' | 'orange' | 'blue' | 'purple' | 'brown';
  requiresMenu?: string;
}

export interface HomeMoreAction {
  id: string;
  title: string;
  icon: string;
  iconBg: string;
  iconColor?: string;
  route?: string;
  requiresMenu?: string;
}

export interface HomeHeaderInfo {
  greeting: string;
  displayName: string;
  dateLabel: string;
  contextLine: string;
  roleBadge: string;
  initials: string;
}

export interface HomeDashboardConfig {
  userType: HomeUserType;
  roleBadge: string;
  /** e.g. "Class 8 - B • Class Teacher" — may be overridden with live data later */
  contextLine: string;
  spotlight: HomeSpotlightCard[];
  primaryActions: HomePrimaryAction[];
  moreActionsTitle?: string;
  moreActions: HomeMoreAction[];
  myActionsTitle?: string;
  myActions?: HomeMoreAction[];
}
