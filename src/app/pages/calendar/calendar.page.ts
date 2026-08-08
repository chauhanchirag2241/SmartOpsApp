import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IonContent,
  IonIcon,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  businessOutline,
  calendarOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  informationCircleOutline,
  peopleOutline,
  personOutline,
  schoolOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  AcademicCalendarService,
  MyCalendarItem,
  MyCalendarMonth,
} from '../../core/services/academic-calendar.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { ToastService } from '../../core/services/toast.service';
import { getUserFacingApiError } from '../../core/utils/api-error.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { formatDisplayDate } from '../../core/utils/api-mapper.util';
import { SoToastTone } from '../../shared/icons/so-icons';

export type DayTone =
  | 'holiday'
  | 'event'
  | 'exam'
  | 'weekend'
  | 'present'
  | 'late'
  | 'halfday'
  | 'absent'
  | 'mixed'
  | 'empty';

interface CalendarCell {
  day: number | null;
  tone: DayTone;
  count: number;
  items: MyCalendarItem[];
}

interface DetailRow {
  icon: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss'],
  imports: [
    AppHeaderComponent,
    IonContent,
    IonIcon,
    IonModal,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class CalendarPage implements OnInit {
  private readonly calendarApi = inject(AcademicCalendarService);
  private readonly branchContext = inject(BranchContextService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth() + 1;
  calendarCells: CalendarCell[] = [];
  isLoading = false;
  private items: MyCalendarItem[] = [];

  detailOpen = false;
  detailKind = 'event';
  detailKindLabel = 'Event';
  detailTitle = '';
  detailRows: DetailRow[] = [];
  dayPickerOpen = false;
  dayPickerLabel = '';
  dayPickerItems: MyCalendarItem[] = [];
  /** When opening detail from the day list, restore this picker after detail closes. */
  private dayPickerSnapshot: { label: string; items: MyCalendarItem[] } | null = null;
  private openingDetailFromPicker = false;

  /** Empty = All types visible. Multi-select kinds when filtering. */
  selectedKinds = new Set<string>();

  readonly legendFilters: { kind: string; label: string }[] = [
    { kind: 'all', label: 'All' },
    { kind: 'present', label: 'Present' },
    { kind: 'absent', label: 'Absent' },
    { kind: 'late', label: 'Late' },
    { kind: 'halfday', label: 'Half Day' },
    { kind: 'holiday', label: 'Holiday' },
    { kind: 'weekend', label: 'Weekend' },
    { kind: 'exam', label: 'Exam' },
    { kind: 'event', label: 'Event' },
  ];

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  constructor() {
    addIcons({
      bookOutline,
      businessOutline,
      calendarOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      informationCircleOutline,
      peopleOutline,
      personOutline,
      schoolOutline,
      timeOutline,
      warningOutline,
    });
  }

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth - 1, 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }

  get isTodayInView(): boolean {
    const now = new Date();
    return now.getFullYear() === this.viewYear && now.getMonth() + 1 === this.viewMonth;
  }

  get todayNumber(): number {
    return new Date().getDate();
  }

  get itemsEmpty(): boolean {
    return this.visibleItems.length === 0;
  }

  get allFiltersSelected(): boolean {
    return this.selectedKinds.size === 0;
  }

  /** Items after legend multi-select filter (empty selection = all). */
  private get visibleItems(): MyCalendarItem[] {
    if (this.selectedKinds.size === 0) return this.items;
    return this.items.filter((i) => this.selectedKinds.has(this.normalizeKind(i.kind)));
  }

  isFilterActive(kind: string): boolean {
    if (kind === 'all') return this.allFiltersSelected;
    return this.selectedKinds.has(kind);
  }

  toggleFilter(kind: string): void {
    if (kind === 'all') {
      this.selectedKinds = new Set();
    } else if (this.selectedKinds.has(kind)) {
      this.selectedKinds.delete(kind);
      this.selectedKinds = new Set(this.selectedKinds);
    } else {
      this.selectedKinds = new Set([...this.selectedKinds, kind]);
    }
    this.rebuildCalendarCells();
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadMonth();
  }

  onRefresh(event: CustomEvent): void {
    this.loadMonth(() => {
      (event.target as HTMLIonRefresherElement)?.complete();
    });
  }

  prevMonth(): void {
    if (this.viewMonth === 1) {
      this.viewMonth = 12;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
    this.loadMonth();
  }

  nextMonth(): void {
    if (this.viewMonth === 12) {
      this.viewMonth = 1;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
    this.loadMonth();
  }

  onDayClick(cell: CalendarCell): void {
    if (cell.day === null || cell.items.length === 0) return;

    // Always offer a picker when the day has more than one item.
    const unique = this.uniqueDayItems(cell.items);
    if (unique.length === 1) {
      this.openItemDetail(unique[0]);
      return;
    }

    this.dayPickerLabel = formatDisplayDate(this.isoForDay(cell.day));
    this.dayPickerItems = unique;
    this.dayPickerOpen = true;
    this.cdr.markForCheck();
  }

  /** Collapse duplicate leave rows for same leave id on same day; keep distinct kinds. */
  private uniqueDayItems(items: MyCalendarItem[]): MyCalendarItem[] {
    const seen = new Set<string>();
    const out: MyCalendarItem[] = [];
    for (const item of items) {
      const key = `${this.normalizeKind(item.kind)}|${item.id}|${item.title}|${item.subjectName ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  kindLabelForItem(item: MyCalendarItem): string {
    return this.kindLabel(this.normalizeKind(item.kind), item);
  }

  closeDayPicker(): void {
    this.dayPickerOpen = false;
    this.dayPickerItems = [];
    this.dayPickerSnapshot = null;
    this.openingDetailFromPicker = false;
    this.cdr.markForCheck();
  }

  /** ion-modal didDismiss — avoid wiping snapshot when we temporarily hide picker for detail. */
  onDayPickerDismissed(): void {
    this.dayPickerOpen = false;
    if (this.openingDetailFromPicker || this.detailOpen) {
      this.openingDetailFromPicker = false;
      this.cdr.markForCheck();
      return;
    }
    this.dayPickerItems = [];
    this.dayPickerSnapshot = null;
    this.cdr.markForCheck();
  }

  selectDayPickerItem(item: MyCalendarItem): void {
    this.dayPickerSnapshot = {
      label: this.dayPickerLabel,
      items: this.dayPickerItems.slice(),
    };
    this.openingDetailFromPicker = true;
    this.dayPickerOpen = false;
    this.openItemDetail(item);
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detailRows = [];
    if (this.dayPickerSnapshot) {
      this.dayPickerLabel = this.dayPickerSnapshot.label;
      this.dayPickerItems = this.dayPickerSnapshot.items;
      this.dayPickerOpen = true;
    }
    this.cdr.markForCheck();
  }

  kindIcon(kind: string): string {
    const k = this.normalizeKind(kind);
    switch (k) {
      case 'holiday':
      case 'weekend':
        return 'calendar-outline';
      case 'exam':
        return 'school-outline';
      case 'present':
        return 'checkmark-circle-outline';
      case 'late':
      case 'halfday':
        return 'time-outline';
      case 'absent':
        return 'warning-outline';
      default:
        return 'information-circle-outline';
    }
  }

  private openItemDetail(item: MyCalendarItem): void {
    const kind = this.normalizeKind(item.kind);
    this.detailKind = kind;
    this.detailKindLabel = this.kindLabel(kind, item);
    this.detailTitle = this.detailTitleFor(item, kind);

    const rows: DetailRow[] = [];

    if (kind === 'exam') {
      if (item.subjectName?.trim()) {
        rows.push({ icon: 'book-outline', label: 'Subject', value: item.subjectName.trim() });
      }
    } else if (kind === 'present' || kind === 'late' || kind === 'halfday' || kind === 'absent') {
      rows.push({
        icon: this.kindIcon(kind),
        label: 'Status',
        value: item.statusLabel || this.detailKindLabel,
      });
    } else if (item.eventTypeName?.trim() && kind !== 'holiday' && kind !== 'weekend') {
      rows.push({
        icon: 'information-circle-outline',
        label: 'Type',
        value: item.eventTypeName.trim(),
      });
    }

    if (item.startDate) {
      const start = formatDisplayDate(item.startDate.slice(0, 10));
      const end = item.endDate ? formatDisplayDate(item.endDate.slice(0, 10)) : start;
      rows.push({
        icon: 'calendar-outline',
        label: start === end ? 'Date' : 'Dates',
        value: start === end ? start : `${start} – ${end}`,
      });
    }

    if (kind === 'exam' && (item.startTime || item.endTime)) {
      rows.push({
        icon: 'time-outline',
        label: 'Time',
        value: `${item.startTime || '—'} – ${item.endTime || '—'}`,
      });
    }

    if (kind === 'exam' && item.roomNo?.trim()) {
      rows.push({ icon: 'business-outline', label: 'Room', value: item.roomNo.trim() });
    }

    if (kind === 'exam' && item.invigilatorName?.trim()) {
      rows.push({
        icon: 'person-outline',
        label: 'Invigilator',
        value: item.invigilatorName.trim(),
      });
    }

    if ((kind === 'holiday' || kind === 'weekend') && item.isNonWorkingDay) {
      rows.push({
        icon: 'information-circle-outline',
        label: 'Working day',
        value: 'Non-working / day off',
      });
    }

    if (item.classNames?.length) {
      rows.push({
        icon: 'people-outline',
        label: item.classNames.length > 1 ? 'Classes' : 'Class',
        value: item.classNames.join(', '),
      });
    }

    if (item.description?.trim() && kind !== 'present' && kind !== 'absent' && kind !== 'late' && kind !== 'halfday') {
      rows.push({
        icon: 'information-circle-outline',
        label: 'Details',
        value: item.description.trim(),
      });
    }

    this.detailRows = rows;
    this.detailOpen = true;
    this.cdr.markForCheck();
  }

  private detailTitleFor(item: MyCalendarItem, kind: string): string {
    if (kind === 'exam') return (item.examName || item.title || 'Exam').trim();
    if (kind === 'weekend') return 'Weekend / Day off';
    if (kind === 'present' || kind === 'late' || kind === 'halfday' || kind === 'absent') {
      return item.statusLabel || item.title || this.kindLabel(kind, item);
    }
    return (item.title || this.kindLabel(kind, item)).trim();
  }

  private kindLabel(kind: string, item?: MyCalendarItem): string {
    switch (kind) {
      case 'holiday':
        return 'Holiday';
      case 'exam':
        return 'Exam';
      case 'weekend':
        return 'Weekend';
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'halfday':
        return 'Half Day';
      case 'absent':
        return 'Absent';
      default:
        return item?.eventTypeName || 'Event';
    }
  }

  private loadMonth(done?: () => void): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.branchContext
      .loadBranches()
      .pipe(
        switchMap(() => {
          const branchId = this.branchContext.activeBranchId();
          return this.calendarApi.getMyMonth(this.viewYear, this.viewMonth, branchId).pipe(
            catchError((err) => {
              void this.showToast(getUserFacingApiError(err, 'Failed to load calendar'));
              return of(null as MyCalendarMonth | null);
            }),
          );
        }),
      )
      .subscribe({
        next: (month) => {
          this.items = this.normalizeItems(month);
          this.rebuildCalendarCells();
          this.isLoading = false;
          done?.();
          this.cdr.markForCheck();
        },
        error: () => {
          this.items = [];
          this.rebuildCalendarCells();
          this.isLoading = false;
          void this.showToast('Failed to load calendar');
          done?.();
          this.cdr.markForCheck();
        },
      });
  }

  private normalizeItems(month: MyCalendarMonth | Record<string, unknown> | null): MyCalendarItem[] {
    if (!month) return [];
    const r = month as Record<string, unknown>;
    const raw = (r['items'] ?? r['Items'] ?? []) as Array<MyCalendarItem | Record<string, unknown>>;
    return (raw ?? []).map((row) => {
      const x = row as Record<string, unknown>;
      const kindRaw = String(x['kind'] ?? x['Kind'] ?? 'event').toLowerCase();
      // Legacy "leave" kind is shown as Absent (approved leave = attendance absent).
      const kind = kindRaw === 'leave' ? 'absent' : kindRaw;
      let description = (x['description'] ?? x['Description']) as string | null;
      let statusLabel = (x['statusLabel'] ?? x['StatusLabel']) as string | null;
      if (kindRaw === 'leave') {
        statusLabel = 'Absent';
        description = description?.trim() || 'On approved leave.';
      }
      return {
        kind,
        id: String(x['id'] ?? x['Id'] ?? ''),
        title: String(x['title'] ?? x['Title'] ?? ''),
        description,
        startDate: String(x['startDate'] ?? x['StartDate'] ?? ''),
        endDate: String(x['endDate'] ?? x['EndDate'] ?? ''),
        color: (x['color'] ?? x['Color']) as string | null,
        eventTypeName: (x['eventTypeName'] ?? x['EventTypeName']) as string | null,
        isNonWorkingDay: !!(x['isNonWorkingDay'] ?? x['IsNonWorkingDay']),
        classNames: ((x['classNames'] ?? x['ClassNames'] ?? []) as string[]) ?? [],
        subjectName: (x['subjectName'] ?? x['SubjectName']) as string | null,
        startTime: (x['startTime'] ?? x['StartTime']) as string | null,
        endTime: (x['endTime'] ?? x['EndTime']) as string | null,
        roomNo: (x['roomNo'] ?? x['RoomNo']) as string | null,
        invigilatorName: (x['invigilatorName'] ?? x['InvigilatorName']) as string | null,
        examName: (x['examName'] ?? x['ExamName']) as string | null,
        statusLabel,
      };
    });
  }

  private rebuildCalendarCells(): void {
    const first = new Date(this.viewYear, this.viewMonth - 1, 1);
    const daysInMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();
    const startPad = first.getDay();
    const byDay = this.groupItemsByDay(daysInMonth);
    const cells: CalendarCell[] = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, tone: 'empty', count: 0, items: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayItems = byDay.get(day) ?? [];
      cells.push({
        day,
        tone: this.toneForItems(dayItems),
        count: dayItems.length,
        items: dayItems,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, tone: 'empty', count: 0, items: [] });
    }

    this.calendarCells = cells;
  }

  private groupItemsByDay(daysInMonth: number): Map<number, MyCalendarItem[]> {
    const map = new Map<number, MyCalendarItem[]>();
    for (let d = 1; d <= daysInMonth; d++) map.set(d, []);

    for (const item of this.visibleItems) {
      const start = this.parseDateOnly(item.startDate);
      const end = this.parseDateOnly(item.endDate) ?? start;
      if (!start || !end) continue;

      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        if (cur.getFullYear() === this.viewYear && cur.getMonth() + 1 === this.viewMonth) {
          map.get(cur.getDate())?.push(item);
        }
      }
    }
    return map;
  }

  private toneForItems(items: MyCalendarItem[]): DayTone {
    if (items.length === 0) return 'empty';
    const kinds = new Set(items.map((i) => this.normalizeKind(i.kind)));
    // Prefer attendance over calendar noise when coloring the day cell.
    const priority: DayTone[] = [
      'late',
      'halfday',
      'present',
      'absent',
      'exam',
      'holiday',
      'weekend',
      'event',
    ];
    for (const p of priority) {
      if (kinds.has(p)) {
        // If another significant kind also exists (e.g. exam + present), mark mixed.
        const others = [...kinds].filter((k) => k !== p && k !== 'weekend');
        if (others.length > 0 && (p === 'exam' || others.includes('exam') || others.includes('holiday'))) {
          if (others.some((k) => k !== 'event')) return 'mixed';
        }
        return p;
      }
    }
    return kinds.size > 1 ? 'mixed' : 'event';
  }

  private normalizeKind(kind: string): string {
    const k = (kind || '').toLowerCase();
    if (k === 'holiday') return 'holiday';
    if (k === 'exam') return 'exam';
    if (k === 'weekend') return 'weekend';
    if (k === 'present') return 'present';
    if (k === 'leave') return 'absent';
    if (k === 'late') return 'late';
    if (k === 'halfday' || k === 'half-day' || k === 'half_day') return 'halfday';
    if (k === 'absent') return 'absent';
    return 'event';
  }

  private isoForDay(day: number): string {
    const m = String(this.viewMonth).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${this.viewYear}-${m}-${d}`;
  }

  private parseDateOnly(value: string): Date | null {
    if (!value) return null;
    const iso = value.length >= 10 ? value.slice(0, 10) : value;
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private showToast(message: string): void {
    const tone: SoToastTone = 'default';
    void this.toast.show({ message, tone });
  }
}
