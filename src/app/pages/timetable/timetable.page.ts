import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarClearOutline,
  chevronDownOutline,
  schoolOutline,
  timeOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  MyTimetableResponse,
  PeriodGridRow,
  TIMETABLE_DAYS,
  TimetableGrid,
  TimetableMainTab,
  TimetableSlotCell,
  TimetableViewMode,
  jsDateToTimetableDay,
  periodsForDay,
} from '../../core/models/timetable.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { PermissionService } from '../../core/services/permission.service';
import { TimetableService } from '../../core/services/timetable.service';
import { ToastService } from '../../core/services/toast.service';
import { resolveHomeUserType } from '../home/home-dashboard.config';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoMultiSelectComponent } from '../../shared/components/so-multi-select/so-multi-select.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';

interface PeriodCard {
  periodId: string;
  name: string;
  timeLabel: string;
  isBreak: boolean;
  main: string;
  sub: string;
  room: string;
  empty: boolean;
}

@Component({
  selector: 'app-timetable',
  templateUrl: './timetable.page.html',
  styleUrls: ['./timetable.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    SoSegmentComponent,
    SoSelectComponent,
    SoMultiSelectComponent,
    IonContent,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class TimetablePage implements OnInit, OnDestroy {
  private readonly timetableService = inject(TimetableService);
  private readonly classService = inject(ClassService);
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);
  private readonly header = inject(AppHeaderService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly ayContext = inject(AcademicYearContextService);

  private readonly subs = new Subscription();
  private slotMap = new Map<string, TimetableSlotCell>();

  readonly days = TIMETABLE_DAYS;
  readonly viewOptions: SoSegmentOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
  ];

  canMy = false;
  canClassApi = false;
  /** Class tab is available when user can open class grid API or has scoped classes + my timetable. */
  canClassTab = false;
  mainTab: TimetableMainTab = 'my';
  viewMode: TimetableViewMode = 'today';
  selectedDay = jsDateToTimetableDay() ?? 1;

  myResponse: MyTimetableResponse | null = null;
  classGrid: TimetableGrid | null = null;
  classes: ClassDropdownItem[] = [];
  selectedClassId = '';
  draftClassId = '';
  /** Empty = all classes (teacher My Timetable week filter). */
  selectedMyClassIds: string[] = [];
  draftMyClassIds: string[] = [];
  myClassFilterOptions: SoSelectOption[] = [];

  loading = false;
  message = '';
  filterOpen = false;

  constructor() {
    addIcons({
      calendarClearOutline,
      chevronDownOutline,
      schoolOutline,
      timeOutline,
      warningOutline,
    });
  }

  get mainTabOptions(): SoSegmentOption[] {
    const opts: SoSegmentOption[] = [];
    if (this.canMy) opts.push({ value: 'my', label: 'My Timetable' });
    if (this.canClassTab) opts.push({ value: 'class', label: 'Class' });
    return opts;
  }

  get showMainTabs(): boolean {
    return this.mainTabOptions.length > 1;
  }

  get showFilter(): boolean {
    return (this.mainTab === 'class' && this.canClassTab) || this.showMyClassFilter;
  }

  /** Teacher My Timetable + Week → multi-select class filter. */
  get showMyClassFilter(): boolean {
    return this.mainTab === 'my' && this.viewMode === 'week' && this.isTeacherPersona;
  }

  get classOptions(): SoSelectOption[] {
    return this.classes.map((c) => ({ value: c.id, label: c.name }));
  }

  get myClassFilterLabel(): string {
    if (!this.selectedMyClassIds.length) return 'All classes';
    if (this.selectedMyClassIds.length === 1) {
      return (
        this.myClassFilterOptions.find((o) => o.value === this.selectedMyClassIds[0])?.label ??
        '1 class'
      );
    }
    if (
      this.myClassFilterOptions.length > 0 &&
      this.selectedMyClassIds.length >= this.myClassFilterOptions.length
    ) {
      return 'All classes';
    }
    return `${this.selectedMyClassIds.length} classes`;
  }

  get selectedClassName(): string {
    return this.classes.find((c) => c.id === this.selectedClassId)?.name || 'Select class';
  }

  get activeGrid(): TimetableGrid | null {
    if (this.mainTab === 'class') return this.classGrid;
    return this.myResponse?.grid ?? null;
  }

  get persona(): string {
    return this.myResponse?.persona ?? '';
  }

  get isTeacherPersona(): boolean {
    return this.persona === 'teacher';
  }

  /** Class tab shows full class schedule (subject + teacher), not teacher-centric labels. */
  get useTeacherLabels(): boolean {
    return this.mainTab === 'my' && this.isTeacherPersona;
  }

  get todayLabel(): string {
    const col = this.days.find((d) => d.day === this.selectedDay);
    const isToday = jsDateToTimetableDay() === this.selectedDay;
    if (!col) return '';
    return isToday ? `Today · ${col.label}` : col.label;
  }

  get dayPeriodCards(): PeriodCard[] {
    const grid = this.activeGrid;
    if (!grid) return [];
    return periodsForDay(grid, this.selectedDay).map((p) => this.toCard(p, this.selectedDay));
  }

  get weekPeriodRows(): PeriodGridRow[] {
    const grid = this.activeGrid;
    if (!grid) return [];
    if (grid.periods?.length) {
      return grid.periods.slice().sort((a, b) => a.periodOrder - b.periodOrder);
    }
    return periodsForDay(grid, this.selectedDay);
  }

  get weekHasPeriods(): boolean {
    return this.days.some((d) => periodsForDay(this.activeGrid, d.day).length > 0);
  }

  ngOnInit(): void {
    this.canMy = this.permissions.canView(MenuCodes.MyTimetable);
    this.canClassApi = this.permissions.canView(MenuCodes.ClassTimetable);
    const userType = resolveHomeUserType(this.auth.currentUser);
    const staffNeedsClassTab = userType === 'teacher' || userType === 'admin' || userType === 'default';
    // Teachers/admins: My + Class tabs. Students/parents: My only (unless ClassTimetable granted).
    this.canClassTab = this.canClassApi || (this.canMy && staffNeedsClassTab);

    if (!this.canMy && this.canClassTab) {
      this.mainTab = 'class';
    } else {
      this.mainTab = 'my';
    }

    this.subs.add(
      this.header.filterClick$.subscribe(() => {
        if (!this.showFilter) return;
        if (this.showMyClassFilter) {
          this.draftMyClassIds = [...this.selectedMyClassIds];
        } else {
          this.draftClassId = this.selectedClassId;
        }
        this.filterOpen = true;
        this.cdr.detectChanges();
      }),
    );

    if (this.canClassTab) {
      this.loadClasses();
    }
    this.reload();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onMainTabChange(value: string): void {
    const next = value as TimetableMainTab;
    if (next === this.mainTab) return;
    this.mainTab = next;
    this.message = '';
    if (next === 'class' && !this.selectedClassId && this.classes.length) {
      this.selectedClassId = this.classes[0].id;
    }
    this.reload();
  }

  onViewModeChange(value: string): void {
    this.viewMode = value as TimetableViewMode;
    if (this.viewMode === 'today') {
      this.selectedDay = jsDateToTimetableDay() ?? 1;
    }
    this.cdr.detectChanges();
  }

  selectDay(day: number): void {
    this.selectedDay = day;
    if (this.viewMode === 'week') {
      this.viewMode = 'today';
    }
  }

  getCell(day: number, periodId: string): TimetableSlotCell | undefined {
    const slot = this.slotMap.get(`${day}|${periodId}`);
    if (!slot) return undefined;
    if (!this.isMyClassFilterActive()) return slot;
    if (!slot.classId || !this.selectedMyClassIds.includes(slot.classId)) return undefined;
    return slot;
  }

  cellMain(slot: TimetableSlotCell | undefined): string {
    if (!slot) return '';
    if (this.useTeacherLabels) {
      return slot.className || slot.subjectName || '';
    }
    return slot.subjectName || '';
  }

  cellSub(slot: TimetableSlotCell | undefined): string {
    if (!slot) return '';
    if (this.useTeacherLabels) {
      return slot.subjectName || '';
    }
    return slot.employeeName || '';
  }

  onRefresh(event: CustomEvent): void {
    this.reload(() => (event.target as HTMLIonRefresherElement).complete());
  }

  clearFilters(): void {
    if (this.showMyClassFilter) {
      this.draftMyClassIds = [];
      return;
    }
    this.draftClassId = this.classes[0]?.id ?? '';
  }

  applyFilters(): void {
    if (this.showMyClassFilter) {
      this.selectedMyClassIds = [...this.draftMyClassIds];
      this.cdr.detectChanges();
      return;
    }
    this.selectedClassId = this.draftClassId;
    this.reload();
  }

  private loadClasses(): void {
    this.classService.getClassDropdown().subscribe({
      next: (rows) => {
        this.classes = rows || [];
        if (!this.selectedClassId && this.classes.length) {
          this.selectedClassId = this.classes[0].id;
          this.draftClassId = this.selectedClassId;
          if (this.mainTab === 'class') {
            this.reload();
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.classes = [];
        this.cdr.detectChanges();
      },
    });
  }

  private reload(done?: () => void): void {
    const ay = this.ayContext.effectiveYearId();
    if (!ay) {
      this.message = 'Select an academic year to view timetable.';
      this.loading = false;
      done?.();
      this.cdr.detectChanges();
      return;
    }

    if (this.mainTab === 'class') {
      this.loadClassView(ay, done);
      return;
    }
    this.loadMy(ay, done);
  }

  private loadMy(academicYearId: string, done?: () => void): void {
    if (!this.canMy) {
      this.message = 'You do not have permission to view your timetable.';
      done?.();
      return;
    }
    this.loading = true;
    this.message = '';
    this.timetableService
      .getMyTimetable(academicYearId)
      .pipe(
        finalize(() => {
          this.loading = false;
          done?.();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.myResponse = res;
          this.applySlots(res.grid);
          this.syncMyClassFilterOptions(res.grid);
          if (res.persona === 'none') {
            this.message =
              'No linked teacher or student profile found for your login.';
          } else if (!this.hasPeriods(res.grid)) {
            this.message = 'No timetable found for the current academic year.';
          } else {
            this.message = '';
          }
        },
        error: () => {
          this.myResponse = null;
          this.slotMap.clear();
          this.message = 'Failed to load your timetable.';
          void this.toast.error('Failed to load timetable');
        },
      });
  }

  private loadClassView(academicYearId: string, done?: () => void): void {
    if (!this.canClassTab) {
      this.message = 'You do not have permission to view class timetables.';
      done?.();
      return;
    }
    if (!this.selectedClassId) {
      this.classGrid = null;
      this.slotMap.clear();
      this.message = this.classes.length
        ? 'Select a class to view its timetable.'
        : 'No classes available for your account.';
      this.loading = false;
      done?.();
      this.cdr.detectChanges();
      return;
    }

    if (this.canClassApi) {
      this.loadClassGridApi(academicYearId, done);
      return;
    }

    // Fallback: filter teacher/my grid by selected class (scoped rights only).
    this.loadClassFromMy(academicYearId, done);
  }

  private loadClassGridApi(academicYearId: string, done?: () => void): void {
    this.loading = true;
    this.message = '';
    this.timetableService
      .getClassGrid(this.selectedClassId, academicYearId)
      .pipe(
        finalize(() => {
          this.loading = false;
          done?.();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (grid) => {
          this.classGrid = grid;
          this.applySlots(grid);
          this.message = this.hasPeriods(grid) ? '' : 'No timetable found for this class.';
        },
        error: () => {
          this.classGrid = null;
          this.slotMap.clear();
          this.message = 'Failed to load class timetable.';
          void this.toast.error('Failed to load class timetable');
        },
      });
  }

  private loadClassFromMy(academicYearId: string, done?: () => void): void {
    const applyFiltered = (): void => {
      const source = this.myResponse?.grid;
      if (!source) {
        this.classGrid = null;
        this.slotMap.clear();
        this.message = 'No timetable found for this class.';
        done?.();
        this.cdr.detectChanges();
        return;
      }
      const classId = this.selectedClassId;
      const slots = (source.slots || []).filter((s) => s.classId === classId);
      const grid: TimetableGrid = {
        ...source,
        slots,
      };
      this.classGrid = grid;
      this.applySlots(grid);
      this.message = slots.length ? '' : 'No periods found for this class in your timetable.';
      done?.();
      this.cdr.detectChanges();
    };

    if (this.myResponse?.grid) {
      applyFiltered();
      return;
    }

    this.loading = true;
    this.message = '';
    this.timetableService
      .getMyTimetable(academicYearId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.myResponse = res;
          applyFiltered();
        },
        error: () => {
          this.classGrid = null;
          this.slotMap.clear();
          this.message = 'Failed to load class timetable.';
          void this.toast.error('Failed to load class timetable');
          done?.();
        },
      });
  }

  private hasPeriods(grid: TimetableGrid | null | undefined): boolean {
    if (!grid) return false;
    if (grid.periods?.length) return true;
    return Object.values(grid.periodsByDay || {}).some((rows) => (rows?.length ?? 0) > 0);
  }

  private applySlots(grid: TimetableGrid | null | undefined): void {
    this.slotMap.clear();
    for (const slot of grid?.slots || []) {
      this.slotMap.set(`${slot.dayOfWeek}|${slot.periodId}`, slot);
    }
  }

  private syncMyClassFilterOptions(grid: TimetableGrid | null | undefined): void {
    const byId = new Map<string, string>();
    for (const slot of grid?.slots || []) {
      const id = String(slot.classId ?? '').trim();
      if (!id) continue;
      const name = String(slot.className ?? '').trim() || id;
      if (!byId.has(id)) byId.set(id, name);
    }
    this.myClassFilterOptions = [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const allowed = new Set(this.myClassFilterOptions.map((o) => o.value));
    this.selectedMyClassIds = this.selectedMyClassIds.filter((id) => allowed.has(id));
    this.draftMyClassIds = this.draftMyClassIds.filter((id) => allowed.has(id));
  }

  /** When empty or every class is selected, treat as All (no filter). */
  private isMyClassFilterActive(): boolean {
    if (!this.showMyClassFilter || !this.selectedMyClassIds.length) return false;
    if (
      this.myClassFilterOptions.length > 0 &&
      this.selectedMyClassIds.length >= this.myClassFilterOptions.length
    ) {
      return false;
    }
    return true;
  }

  private toCard(period: PeriodGridRow, day: number): PeriodCard {
    const slot = this.getCell(day, period.id);
    const main = this.cellMain(slot);
    const sub = this.cellSub(slot);
    return {
      periodId: period.id,
      name: period.shortName || period.name,
      timeLabel: `${period.startTime} – ${period.endTime}`,
      isBreak: !!period.isBreak,
      main,
      sub,
      room: slot?.roomNo ? `Rm ${slot.roomNo}` : '',
      empty: !period.isBreak && !main && !sub,
    };
  }
}
