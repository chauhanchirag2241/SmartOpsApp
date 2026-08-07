import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  createOutline,
  documentTextOutline,
  trashOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuCodes } from '../../core/constants/menu-codes';
import {
  EXAM_TYPES,
  ExamClassInfo,
  ExamDetail,
  ExamGradeScale,
  ExamGroup,
  ExamListItem,
  ExamScheduleItem,
  ExamStatus,
  SaveExamRequest,
} from '../../core/models/exam.model';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { ExamService } from '../../core/services/exam.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoMultiSelectComponent } from '../../shared/components/so-multi-select/so-multi-select.component';
import { SoSegmentComponent, SoSegmentOption } from '../../shared/components/so-segment/so-segment.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';

interface ComponentRowDraft {
  id?: string | null;
  name: string;
  maxMarks: number | null;
  passingMarks: number | null;
}

interface ScheduleSlotDraft {
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNo: string;
}

@Component({
  selector: 'app-exam',
  templateUrl: './exam.page.html',
  styleUrls: ['./exam.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoSegmentComponent,
    SoSelectComponent,
    SoMultiSelectComponent,
    SoDateInputComponent,
    SoFilterPopoverComponent,
    IonContent,
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonIcon,
  ],
})
export class ExamPage implements OnInit, OnDestroy {
  private readonly examService = inject(ExamService);
  private readonly classService = inject(ClassService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AlertController);
  private readonly header = inject(AppHeaderService);
  readonly ayContext = inject(AcademicYearContextService);
  private subs = new Subscription();

  readonly tabOptions: SoSegmentOption[] = [
    { value: 'exams', label: 'Exams' },
    { value: 'schedule', label: 'Schedule' },
  ];

  activeTab: 'exams' | 'schedule' = 'exams';
  /** list | form */
  examsMode: 'list' | 'form' = 'list';
  formMode: 'create' | 'edit' = 'create';
  editingId: string | null = null;
  filterOpen = false;

  loading = false;
  saving = false;
  formError = '';

  groups: ExamGroup[] = [];
  gradeScales: ExamGradeScale[] = [];
  exams: ExamListItem[] = [];
  filterClasses: ClassDropdownItem[] = [];

  filterGroupId = '';
  filterClassId = '';
  filterStatus = '';
  /** active | deleted */
  filterActive = 'active';

  draftFilterGroupId = '';
  draftFilterClassId = '';
  draftFilterStatus = '';
  draftFilterActive = 'active';

  formGroupId = '';
  formName = '';
  formExamType = 'Unit Test';
  formMinPassPercent: number | null = 33;
  formGradeScaleId = '';
  formDescription = '';
  formClassIds: string[] = [];
  formClassOptions: SoSelectOption[] = [];
  componentRows: ComponentRowDraft[] = [];

  // Schedule
  scheduleExamId = '';
  scheduleClassIds: string[] = [];
  scheduleClassOptions: SoSelectOption[] = [];
  scheduleSubjectOptions: SoSelectOption[] = [];
  scheduleSlots: ScheduleSlotDraft[] = [];
  existingSchedules: ExamScheduleItem[] = [];
  scheduleLoading = false;
  scheduleSaving = false;
  scheduleError = '';

  readonly examTypeOptions: SoSelectOption[] = EXAM_TYPES.map((t) => ({ label: t, value: t }));
  readonly statusFilterOptions: SoSelectOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Draft', value: String(ExamStatus.Draft) },
    { label: 'Scheduled', value: String(ExamStatus.Scheduled) },
    { label: 'Ongoing', value: String(ExamStatus.Ongoing) },
    { label: 'Completed', value: String(ExamStatus.Completed) },
    { label: 'Result declared', value: String(ExamStatus.ResultDeclared) },
  ];
  readonly activeFilterOptions: SoSelectOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Deleted', value: 'deleted' },
  ];

  constructor() {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      createOutline,
      documentTextOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadExams();
    this.subs.add(
      this.header.filterClick$.subscribe(() => {
        if (this.examsMode !== 'list' || this.activeTab !== 'exams') return;
        this.openFilterSheet();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get headerTitle(): string {
    if (this.examsMode === 'form') {
      return this.formMode === 'edit' ? 'Edit exam' : 'Create exam';
    }
    return 'Exam';
  }

  get showListFilter(): boolean {
    return this.examsMode === 'list' && this.activeTab === 'exams';
  }

  /** Homework-style FAB — show whenever user can open Exams (check Add on tap). */
  get showCreateFab(): boolean {
    return (
      this.examsMode === 'list' &&
      this.activeTab === 'exams' &&
      !this.showingDeleted &&
      !this.ayContext.isReadOnlyScope() &&
      this.permissions.canView(MenuCodes.Exams)
    );
  }

  get canAdd(): boolean {
    return this.permissions.canAdd(MenuCodes.Exams);
  }

  get canEdit(): boolean {
    return this.permissions.canEdit(MenuCodes.Exams);
  }

  get canDelete(): boolean {
    return this.permissions.canDelete(MenuCodes.Exams);
  }

  get canSchedule(): boolean {
    if (this.ayContext.isReadOnlyScope()) {
      return false;
    }
    // Mobile Exams page covers create + schedule; allow either menu's write rights.
    return (
      this.permissions.canAdd(MenuCodes.ExamSchedule) ||
      this.permissions.canEdit(MenuCodes.ExamSchedule) ||
      this.permissions.canAdd(MenuCodes.Exams) ||
      this.permissions.canEdit(MenuCodes.Exams)
    );
  }

  /** Web-parity: enable Save when exam + classes + at least one subject/date slot are set. */
  get canSaveScheduleDraft(): boolean {
    if (!this.canSchedule || !this.scheduleExamId || !this.scheduleClassIds.length) {
      return false;
    }
    return this.scheduleSlots.some((s) => !!s.subjectId && !!s.examDate);
  }

  get showingDeleted(): boolean {
    return this.filterActive === 'deleted';
  }

  get groupOptions(): SoSelectOption[] {
    return this.groups.map((g) => ({ label: g.name, value: g.id }));
  }

  get gradeScaleOptions(): SoSelectOption[] {
    return [
      { label: 'Use group default', value: '' },
      ...this.gradeScales.map((g) => ({ label: g.name, value: g.id })),
    ];
  }

  get filterGroupOptions(): SoSelectOption[] {
    return [{ label: 'All groups', value: '' }, ...this.groupOptions];
  }

  get filterClassOptions(): SoSelectOption[] {
    return [
      { label: 'All classes', value: '' },
      ...this.filterClasses.map((c) => ({ label: c.name, value: c.id })),
    ];
  }

  get filterGroupLabel(): string {
    if (!this.filterGroupId) return 'All groups';
    return this.groups.find((g) => g.id === this.filterGroupId)?.name ?? 'Group';
  }

  get filterClassLabel(): string {
    if (!this.filterClassId) return 'All classes';
    return this.filterClasses.find((c) => c.id === this.filterClassId)?.name ?? 'Class';
  }

  get filterStatusLabel(): string {
    return (
      this.statusFilterOptions.find((o) => o.value === this.filterStatus)?.label ?? 'All statuses'
    );
  }

  get filterActiveLabel(): string {
    return this.filterActive === 'deleted' ? 'Deleted' : 'Active';
  }

  get examSelectOptions(): SoSelectOption[] {
    return this.exams
      .filter((e) => e.isActive !== false)
      .map((e) => ({ label: `${e.name} (${e.examType})`, value: e.id }));
  }

  get totalMaxMarks(): number {
    return this.componentRows.reduce((sum, row) => sum + (row.maxMarks ?? 0), 0);
  }

  get formClassHint(): string {
    if (!this.formGroupId) {
      return 'Select an exam group first to load its class sections.';
    }
    const group = this.groups.find((g) => g.id === this.formGroupId);
    const mapped = group?.classGroupIds?.length ?? 0;
    if (!mapped) {
      return 'This exam group has no class groups mapped yet. Map them on Exam Groups (web), or leave classes empty.';
    }
    if (!this.formClassOptions.length) {
      return 'No section classes found for the mapped class groups.';
    }
    return 'Only sections under this exam group\'s class groups are listed.';
  }

  onTabChange(value: string): void {
    this.activeTab = value === 'schedule' ? 'schedule' : 'exams';
    if (this.activeTab === 'schedule') {
      this.ensureActiveExamsForSchedule();
      if (this.scheduleExamId) {
        this.onScheduleExamChange();
      }
    } else if (this.examsMode === 'list') {
      this.loadExams();
    }
  }

  onRefresh(event: CustomEvent): void {
    const done = () => (event.target as HTMLIonRefresherElement).complete();
    if (this.activeTab === 'schedule') {
      this.loadLookups();
      if (this.scheduleExamId) {
        this.loadExistingSchedules(done);
      } else {
        done();
      }
      return;
    }
    this.loadLookups();
    this.loadExams(done);
  }

  onFiltersChanged(): void {
    this.loadExams();
  }

  openFilterSheet(): void {
    this.draftFilterGroupId = this.filterGroupId;
    this.draftFilterClassId = this.filterClassId;
    this.draftFilterStatus = this.filterStatus;
    this.draftFilterActive = this.filterActive;
    this.filterOpen = true;
  }

  clearFilters(): void {
    this.draftFilterGroupId = '';
    this.draftFilterClassId = '';
    this.draftFilterStatus = '';
    this.draftFilterActive = 'active';
  }

  applyFilters(): void {
    this.filterGroupId = this.draftFilterGroupId;
    this.filterClassId = this.draftFilterClassId;
    this.filterStatus = this.draftFilterStatus;
    this.filterActive = this.draftFilterActive;
    this.filterOpen = false;
    this.loadExams();
  }

  openCreate(): void {
    if (this.ayContext.isReadOnlyScope()) {
      void this.toast.error('Current academic year is read-only.');
      return;
    }
    if (!this.canAdd) {
      void this.toast.error('You do not have permission to create exams.');
      return;
    }
    this.resetForm();
    this.formMode = 'create';
    this.editingId = null;
    this.formGroupId = this.filterGroupId || this.groups[0]?.id || '';
    this.refreshFormClassOptions(true);
    this.activeTab = 'exams';
    this.examsMode = 'form';
  }

  onCardClick(exam: ExamListItem): void {
    if (this.showingDeleted || exam.isActive === false || !this.canEdit) {
      return;
    }
    this.openEdit(exam);
  }

  openEdit(exam: ExamListItem, event?: Event): void {
    event?.stopPropagation();
    if (this.showingDeleted || exam.isActive === false) {
      return;
    }
    if (!this.canEdit) {
      void this.toast.error('You do not have permission to edit exams.');
      return;
    }
    this.loading = true;
    this.formError = '';
    this.activeTab = 'exams';
    this.examService.getExam(exam.id).subscribe({
      next: (detail) => {
        this.loading = false;
        this.applyDetailToForm(detail);
        this.formMode = 'edit';
        this.editingId = detail.id;
        this.examsMode = 'form';
      },
      error: (err) => {
        this.loading = false;
        void this.toast.error(typeof err?.error === 'string' ? err.error : 'Failed to load exam');
      },
    });
  }

  async confirmDelete(exam: ExamListItem, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.showingDeleted || exam.isActive === false) {
      return;
    }
    if (!this.canDelete) {
      void this.toast.error('You do not have permission to delete exams.');
      return;
    }
    const a = await this.alert.create({
      header: 'Delete exam',
      message: `Delete "${exam.name}"? This soft-deletes the exam and its schedules.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.examService.deleteExam(exam.id).subscribe({
              next: () => {
                void this.toast.success('Exam deleted');
                this.loadExams();
              },
              error: (err) => {
                void this.toast.error(
                  typeof err?.error === 'string' ? err.error : 'Delete failed',
                );
              },
            });
          },
        },
      ],
    });
    await a.present();
  }

  closeForm(): void {
    this.examsMode = 'list';
    this.formError = '';
    this.editingId = null;
    this.loadExams();
  }

  onFormGroupChange(): void {
    this.refreshFormClassOptions(true);
  }

  addComponentRow(): void {
    this.componentRows.push({ name: '', maxMarks: null, passingMarks: null });
  }

  removeComponentRow(index: number): void {
    this.componentRows.splice(index, 1);
  }

  saveExam(): void {
    const error = this.validateExamForm();
    if (error) {
      this.formError = error;
      return;
    }

    const payload: SaveExamRequest = {
      examGroupId: this.formGroupId,
      name: this.formName.trim(),
      examType: this.formExamType,
      academicPeriodId: null,
      minPassPercent: this.formMinPassPercent ?? 33,
      gradeScaleId: this.formGradeScaleId || null,
      description: this.formDescription.trim() || null,
      classIds: [...this.formClassIds],
      components: this.componentRows.map((row, i) => ({
        id: row.id ?? null,
        name: row.name.trim(),
        maxMarks: row.maxMarks ?? 0,
        passingMarks: row.passingMarks,
        displayOrder: i,
      })),
    };

    this.saving = true;
    this.formError = '';
    const request =
      this.formMode === 'edit' && this.editingId
        ? this.examService.updateExam(this.editingId, payload)
        : this.examService.createExam(payload);

    request.subscribe({
      next: (detail) => {
        this.saving = false;
        void this.toast.success(this.formMode === 'edit' ? 'Exam updated' : 'Exam created');
        this.examsMode = 'list';
        this.filterActive = 'active';
        this.upsertExamFromDetail(detail);
        if (this.formMode === 'create') {
          this.scheduleExamId = detail.id;
          this.activeTab = 'schedule';
          this.onScheduleExamChange();
        } else {
          this.loadExams();
        }
      },
      error: (err) => {
        this.saving = false;
        this.formError = typeof err?.error === 'string' ? err.error : 'Failed to save exam';
      },
    });
  }

  // ── Schedule ───────────────────────────────────────────────

  onScheduleExamChange(): void {
    this.scheduleError = '';
    this.scheduleSlots = [this.emptySlot()];
    const exam = this.exams.find((e) => e.id === this.scheduleExamId);
    const classes = this.normalizeExamClasses(exam?.classes);
    this.scheduleClassOptions = classes.map((c) => ({
      label: c.className || c.classId,
      value: c.classId,
    }));
    const valid = new Set(this.scheduleClassOptions.map((o) => o.value));
    this.scheduleClassIds = this.scheduleClassIds.filter((id) => valid.has(id));
    if (!this.scheduleClassIds.length && this.scheduleClassOptions.length === 1) {
      this.scheduleClassIds = [this.scheduleClassOptions[0].value];
    }
    this.loadSubjectsForSchedule();
    this.loadExistingSchedules();
  }

  onScheduleClassesChange(): void {
    this.loadSubjectsForSchedule();
  }

  addScheduleSlot(): void {
    this.scheduleSlots.push(this.emptySlot());
  }

  removeScheduleSlot(index: number): void {
    this.scheduleSlots.splice(index, 1);
    if (!this.scheduleSlots.length) {
      this.scheduleSlots.push(this.emptySlot());
    }
  }

  saveSchedule(): void {
    if (!this.canSchedule) {
      void this.toast.error('You do not have permission to schedule exams.');
      return;
    }
    if (!this.scheduleExamId) {
      this.scheduleError = 'Select an exam.';
      return;
    }
    if (!this.scheduleClassIds.length) {
      this.scheduleError = 'Select at least one class.';
      return;
    }

    const validRows = this.scheduleSlots.filter(
      (s) => s.subjectId && s.examDate,
    );
    if (!validRows.length) {
      this.scheduleError = 'Add at least one slot with subject and date.';
      return;
    }

    const slots: {
      classId: string;
      subjectId: string;
      examDate: string;
      startTime: string | null;
      endTime: string | null;
      roomNo: string | null;
      invigilatorId: string | null;
    }[] = [];
    for (const classId of this.scheduleClassIds) {
      for (const row of validRows) {
        slots.push({
          classId,
          subjectId: row.subjectId,
          examDate: row.examDate,
          startTime: row.startTime || null,
          endTime: row.endTime || null,
          roomNo: row.roomNo.trim() || null,
          invigilatorId: null,
        });
      }
    }

    this.scheduleSaving = true;
    this.scheduleError = '';
    this.examService.bulkCreateSchedules({ examId: this.scheduleExamId, slots }).subscribe({
      next: (result) => {
        this.scheduleSaving = false;
        void this.toast.success(`Created ${result.createdCount} schedule slot(s)`);
        this.scheduleSlots = [this.emptySlot()];
        this.loadExistingSchedules();
      },
      error: (err) => {
        this.scheduleSaving = false;
        this.scheduleError =
          typeof err?.error === 'string' ? err.error : 'Failed to create schedule';
      },
    });
  }

  classesLabel(exam: ExamListItem): string {
    const names = (exam.classes ?? []).map((c) => c.className).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  // ── Private ────────────────────────────────────────────────

  private loadLookups(): void {
    this.examService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups ?? [];
        if (this.examsMode === 'form') {
          this.refreshFormClassOptions();
        }
      },
      error: () => {
        this.groups = [];
      },
    });
    this.examService.getGradeScales().subscribe({
      next: (scales) => {
        this.gradeScales = scales ?? [];
      },
      error: () => {
        this.gradeScales = [];
      },
    });
    this.classService.getClassDropdown().subscribe({
      next: (classes) => {
        this.filterClasses = classes ?? [];
      },
      error: () => {
        this.filterClasses = [];
      },
    });
  }

  private loadExams(done?: () => void): void {
    this.loading = true;
    const status =
      this.filterStatus === '' ? undefined : Number(this.filterStatus);
    this.examService
      .getExams({
        groupId: this.filterGroupId || undefined,
        classId: this.filterClassId || undefined,
        status: Number.isFinite(status) ? status : undefined,
        inactiveOnly: this.showingDeleted,
      })
      .subscribe({
        next: (rows) => {
          this.exams = (rows ?? []).map((r) => this.normalizeExamListItem(r));
          this.loading = false;
          done?.();
        },
        error: () => {
          this.exams = [];
          this.loading = false;
          void this.toast.error('Failed to load exams');
          done?.();
        },
      });
  }

  private ensureActiveExamsForSchedule(): void {
    if (this.showingDeleted || !this.exams.length) {
      this.examService.getExams({ inactiveOnly: false }).subscribe({
        next: (rows) => {
          this.exams = (rows ?? []).map((r) => this.normalizeExamListItem({ ...r, isActive: true }));
        },
      });
    }
  }

  private refreshFormClassOptions(pruneSelection = false): void {
    const group = this.groups.find((g) => g.id === this.formGroupId);
    const groupIds = (group?.classGroupIds ?? []).map(String).filter(Boolean);
    if (!this.formGroupId || !groupIds.length) {
      this.formClassOptions = [];
      if (pruneSelection) this.formClassIds = [];
      return;
    }

    forkJoin(
      groupIds.map((id) =>
        this.classService.getSectionsByClassGroup(id).pipe(
          catchError(() => of([] as ClassDropdownItem[])),
        ),
      ),
    )
      .pipe(
        map((lists) => {
          const seen = new Set<string>();
          const opts: SoSelectOption[] = [];
          for (const list of lists) {
            for (const c of list) {
              if (!c.id || seen.has(c.id)) continue;
              seen.add(c.id);
              opts.push({ label: c.name, value: c.id });
            }
          }
          return opts.sort((a, b) => a.label.localeCompare(b.label));
        }),
      )
      .subscribe((opts) => {
        this.formClassOptions = opts;
        if (pruneSelection || this.formClassIds.length) {
          const valid = new Set(opts.map((o) => o.value));
          this.formClassIds = this.formClassIds.filter((id) => valid.has(id));
        }
      });
  }

  private applyDetailToForm(detail: ExamDetail): void {
    this.formGroupId = detail.examGroupId;
    this.formName = detail.name;
    this.formExamType = detail.examType || 'Unit Test';
    this.formMinPassPercent = detail.minPassPercent;
    this.formGradeScaleId = detail.gradeScaleId || '';
    this.formDescription = detail.description || '';
    this.formClassIds = [...(detail.classIds ?? [])];
    this.componentRows = (detail.components ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      maxMarks: c.maxMarks,
      passingMarks: c.passingMarks ?? null,
    }));
    if (!this.componentRows.length) {
      this.componentRows = this.defaultComponents();
    }
    this.refreshFormClassOptions();
  }

  private resetForm(): void {
    this.formName = '';
    this.formExamType = 'Unit Test';
    this.formMinPassPercent = 33;
    this.formGradeScaleId = '';
    this.formDescription = '';
    this.formClassIds = [];
    this.componentRows = this.defaultComponents();
    this.formError = '';
  }

  private defaultComponents(): ComponentRowDraft[] {
    return [
      { name: 'Theory', maxMarks: 70, passingMarks: 23 },
      { name: 'Practical', maxMarks: 20, passingMarks: 7 },
      { name: 'Oral', maxMarks: 10, passingMarks: 3 },
    ];
  }

  /** Same validations as SmartOpsUI exam-list. */
  private validateExamForm(): string | null {
    if (!this.formGroupId) return 'Select an exam group.';
    if (!this.formName.trim()) return 'Exam name is required.';
    if (!this.componentRows.length) return 'Add at least one mark component.';
    for (const row of this.componentRows) {
      if (!row.name.trim()) return 'Every mark component needs a name.';
      if (!row.maxMarks || row.maxMarks <= 0) {
        return `Component '${row.name}' needs max marks greater than 0.`;
      }
      if (row.passingMarks !== null && row.passingMarks > row.maxMarks) {
        return `Component '${row.name}' passing marks cannot exceed max marks.`;
      }
    }
    if (
      this.formMinPassPercent === null ||
      this.formMinPassPercent < 0 ||
      this.formMinPassPercent > 100
    ) {
      return 'Minimum pass percent must be between 0 and 100.';
    }
    return null;
  }

  private emptySlot(): ScheduleSlotDraft {
    return { subjectId: '', examDate: '', startTime: '', endTime: '', roomNo: '' };
  }

  private upsertExamFromDetail(detail: ExamDetail): void {
    const item: ExamListItem = {
      id: detail.id,
      name: detail.name,
      examType: detail.examType,
      examGroupId: detail.examGroupId,
      examGroupName: detail.examGroupName,
      status: detail.status,
      statusLabel: detail.statusLabel,
      resultDeclared: detail.resultDeclared,
      totalMaxMarks: (detail.components ?? []).reduce((s, c) => s + (c.maxMarks || 0), 0),
      subjectCount: 0,
      classes: this.normalizeExamClasses(detail.classes),
      isActive: true,
    };
    const idx = this.exams.findIndex((e) => e.id === item.id);
    if (idx >= 0) {
      this.exams[idx] = item;
    } else {
      this.exams = [item, ...this.exams];
    }
  }

  private loadSubjectsForSchedule(): void {
    const exam = this.exams.find((e) => e.id === this.scheduleExamId);
    // Class-wise: only load after at least one class is selected.
    const classIds = [...this.scheduleClassIds].map(String).filter(Boolean);

    if (!classIds.length) {
      this.scheduleSubjectOptions = [];
      this.pruneInvalidScheduleSubjects();
      return;
    }

    const yearId = this.ayContext.effectiveYearId();

    forkJoin(
      classIds.map((classId) =>
        this.classService.getTeachingSubjectsForClass(classId, yearId).pipe(
          catchError(() => of([] as { id: string; subjectId: string; subjectName: string }[])),
          map((rows) => ({ classId, rows })),
        ),
      ),
    ).subscribe((results) => {
      const seen = new Set<string>();
      const opts: SoSelectOption[] = [];
      const emptyClassIds: string[] = [];

      for (const { classId, rows } of results) {
        if (!rows.length) {
          emptyClassIds.push(classId);
          continue;
        }
        for (const s of rows) {
          const sid = String(s.subjectId || s.id || '').trim();
          if (!sid || seen.has(sid)) continue;
          seen.add(sid);
          opts.push({ label: s.subjectName || sid, value: sid });
        }
      }

      if (!emptyClassIds.length) {
        this.scheduleSubjectOptions = opts.sort((a, b) => a.label.localeCompare(b.label));
        this.pruneInvalidScheduleSubjects();
        return;
      }

      const groupIds = [
        ...new Set(
          (exam?.classes ?? [])
            .filter((c) => emptyClassIds.includes(String(c.classId)))
            .map((c) => String(c.classGroupId || '').trim())
            .filter(Boolean),
        ),
      ];

      if (!groupIds.length) {
        this.scheduleSubjectOptions = opts.sort((a, b) => a.label.localeCompare(b.label));
        this.pruneInvalidScheduleSubjects();
        return;
      }

      forkJoin(
        groupIds.map((id) =>
          this.classService.getClassGroupSubjects(id).pipe(catchError(() => of([]))),
        ),
      ).subscribe((lists) => {
        for (const list of lists) {
          for (const s of list) {
            const sid = String(s.subjectId || s.id || '').trim();
            if (!sid || seen.has(sid)) continue;
            seen.add(sid);
            opts.push({ label: s.subjectName || sid, value: sid });
          }
        }
        this.scheduleSubjectOptions = opts.sort((a, b) => a.label.localeCompare(b.label));
        this.pruneInvalidScheduleSubjects();
      });
    });
  }

  private pruneInvalidScheduleSubjects(): void {
    const valid = new Set(this.scheduleSubjectOptions.map((o) => o.value));
    for (const slot of this.scheduleSlots) {
      if (slot.subjectId && !valid.has(slot.subjectId)) {
        slot.subjectId = '';
      }
    }
  }

  private normalizeExamListItem(row: ExamListItem): ExamListItem {
    const raw = row as ExamListItem & Record<string, unknown>;
    return {
      ...row,
      id: String(raw.id ?? raw['Id'] ?? ''),
      isActive: row.isActive ?? !this.showingDeleted,
      classes: this.normalizeExamClasses(row.classes ?? (raw['Classes'] as ExamClassInfo[] | undefined)),
    };
  }

  private normalizeExamClasses(classes: ExamClassInfo[] | undefined | null): ExamClassInfo[] {
    return (classes ?? []).map((c) => {
      const raw = c as ExamClassInfo & Record<string, unknown>;
      return {
        classId: String(raw.classId ?? raw['ClassId'] ?? ''),
        className: String(raw.className ?? raw['ClassName'] ?? ''),
        classGroupId: String(raw.classGroupId ?? raw['ClassGroupId'] ?? ''),
        classGroupName: String(raw.classGroupName ?? raw['ClassGroupName'] ?? ''),
      };
    });
  }

  private loadExistingSchedules(done?: () => void): void {
    if (!this.scheduleExamId) {
      this.existingSchedules = [];
      done?.();
      return;
    }
    this.scheduleLoading = true;
    this.examService.getSchedules(this.scheduleExamId).subscribe({
      next: (rows) => {
        this.existingSchedules = rows ?? [];
        this.scheduleLoading = false;
        done?.();
      },
      error: () => {
        this.existingSchedules = [];
        this.scheduleLoading = false;
        done?.();
      },
    });
  }
}
