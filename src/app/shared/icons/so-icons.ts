import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarClearOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  closeCircleOutline,
  closeOutline,
  documentTextOutline,
  informationCircleOutline,
  saveOutline,
  sendOutline,
  warningOutline,
} from 'ionicons/icons';

/** Shared Ionicon names used across SmartOpsApp (iOS mode). */
export const SoIcons = {
  calendar: 'calendar-outline',
  calendarClear: 'calendar-clear-outline',
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
  save: 'save-outline',
  send: 'send-outline',
  checkmark: 'checkmark-outline',
  close: 'close-outline',
  approve: 'checkmark-circle-outline',
  reject: 'close-circle-outline',
  documentText: 'document-text-outline',
} as const;

export type SoIconName = (typeof SoIcons)[keyof typeof SoIcons];

export type SoToastTone = 'default' | 'success' | 'danger' | 'warning' | 'info';

/** Default toast icon per tone. */
export const SoToastIcons: Record<SoToastTone, SoIconName | undefined> = {
  default: SoIcons.info,
  success: SoIcons.success,
  danger: SoIcons.error,
  warning: SoIcons.warning,
  info: SoIcons.info,
};

/** Register common icons once at app bootstrap (explicit kebab keys survive bundling/HMR). */
export function registerSoIcons(): void {
  addIcons({
    calendarOutline,
    calendarClearOutline,
    checkmarkCircleOutline,
    alertCircleOutline,
    warningOutline,
    informationCircleOutline,
    saveOutline,
    sendOutline,
    checkmarkOutline,
    closeOutline,
    closeCircleOutline,
    // Explicit kebab keys — required so home tiles resolve before page constructors run.
    'document-text-outline': documentTextOutline,
    documentTextOutline,
  });
}
