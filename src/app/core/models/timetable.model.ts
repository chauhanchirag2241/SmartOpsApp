export interface TimetableVersion {
  id: string;
  academicYearId: string;
  classId: string;
  className?: string;
  periodTemplateId: string;
  periodTemplateName?: string;
  effectiveFrom: string;
  notes?: string;
  isActive: boolean;
}

export interface PeriodGridRow {
  id: string;
  name: string;
  shortName: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  dayOfWeek?: number | null;
}

export interface TimetableSlotCell {
  id?: string;
  dayOfWeek: number;
  periodId: string;
  subjectId?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  roomNo?: string | null;
  classId?: string | null;
  className?: string | null;
  hasTeacherConflict?: boolean;
  hasRoomConflict?: boolean;
}

export interface TimetableGrid {
  version?: TimetableVersion | null;
  periods: PeriodGridRow[];
  /** Keys may be numbers or stringified numbers from JSON. */
  periodsByDay?: Record<string | number, PeriodGridRow[]>;
  slots: TimetableSlotCell[];
}

export interface MyTimetableResponse {
  persona: 'teacher' | 'student' | 'none' | string;
  employeeId?: string;
  studentId?: string;
  classId?: string;
  className?: string;
  grid: TimetableGrid;
}

export type TimetableMainTab = 'my' | 'class';
export type TimetableViewMode = 'today' | 'week';

export interface TimetableDayColumn {
  day: number;
  label: string;
  shortLabel: string;
}

export const TIMETABLE_DAYS: TimetableDayColumn[] = [
  { day: 1, label: 'Monday', shortLabel: 'Mon' },
  { day: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { day: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { day: 4, label: 'Thursday', shortLabel: 'Thu' },
  { day: 5, label: 'Friday', shortLabel: 'Fri' },
  { day: 6, label: 'Saturday', shortLabel: 'Sat' },
];

/** Maps JS Date.getDay() (0=Sun) to timetable day (1=Mon … 6=Sat). Sunday → null. */
export function jsDateToTimetableDay(date: Date = new Date()): number | null {
  const js = date.getDay();
  if (js === 0) return null;
  return js;
}

export function periodsForDay(
  grid: TimetableGrid | null | undefined,
  day: number,
): PeriodGridRow[] {
  if (!grid) return [];
  const byDay = grid.periodsByDay;
  if (byDay) {
    const rows = byDay[day] ?? byDay[String(day)];
    if (rows?.length) return rows;
  }
  const flat = grid.periods ?? [];
  const daySpecific = flat.filter((p) => p.dayOfWeek != null && Number(p.dayOfWeek) === day);
  if (daySpecific.length) {
    return daySpecific.slice().sort((a, b) => a.periodOrder - b.periodOrder);
  }
  return flat
    .filter((p) => p.dayOfWeek == null)
    .slice()
    .sort((a, b) => a.periodOrder - b.periodOrder);
}

export function buildPeriodsByDay(
  periods: PeriodGridRow[],
): Record<number, PeriodGridRow[]> {
  const defaults = periods
    .filter((p) => p.dayOfWeek == null)
    .slice()
    .sort((a, b) => a.periodOrder - b.periodOrder);
  const overrideDays = new Set(
    periods.filter((p) => p.dayOfWeek != null).map((p) => Number(p.dayOfWeek)),
  );
  const periodsByDay: Record<number, PeriodGridRow[]> = {};
  for (let day = 1; day <= 6; day++) {
    if (overrideDays.has(day)) {
      periodsByDay[day] = periods
        .filter((p) => Number(p.dayOfWeek) === day)
        .slice()
        .sort((a, b) => a.periodOrder - b.periodOrder);
    } else {
      periodsByDay[day] = defaults.map((p) => ({ ...p }));
    }
  }
  return periodsByDay;
}
