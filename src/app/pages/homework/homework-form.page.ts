import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoDateInputComponent } from '../../shared/components/so-date-input/so-date-input.component';
import { SoIconComponent } from '../../shared/components/so-icon/so-icon.component';
import { SoSelectComponent, SoSelectOption } from '../../shared/components/so-select/so-select.component';
import { SoIcons } from '../../shared/icons/so-icons';
import {
  CreateHomeworkRequest,
  HomeworkPriority,
  HomeworkSubmissionType,
} from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ClassDropdownItem, ClassGroupSubjectItem, ClassService } from '../../core/services/class.service';
import { HomeworkService } from '../../core/services/homework.service';
import { ToastService } from '../../core/services/toast.service';
import { localDateString } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-homework-form',
  templateUrl: './homework-form.page.html',
  styleUrls: ['./homework-form.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoDateInputComponent,
    SoIconComponent,
    SoSelectComponent,
    IonContent,
    IonSpinner,
  ],
})
export class HomeworkFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly homeworkService = inject(HomeworkService);
  private readonly classService = inject(ClassService);
  private readonly toast = inject(ToastService);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);
  readonly saveIcon = SoIcons.save;

  HomeworkPriority = HomeworkPriority;
  HomeworkSubmissionType = HomeworkSubmissionType;

  homeworkId: string | null = null;
  classes: ClassDropdownItem[] = [];
  subjects: ClassGroupSubjectItem[] = [];
  subjectsLoading = false;
  saving = false;
  loading = false;

  form: CreateHomeworkRequest = this.emptyForm();

  get canManage(): boolean {
    const canWrite = this.homeworkId
      ? this.permissions.canEdit(MenuCodes.Homework)
      : this.permissions.canAdd(MenuCodes.Homework);
    return !this.ayContext.isReadOnlyScope() && canWrite;
  }

  get pageTitle(): string {
    return this.homeworkId ? 'Edit homework' : 'Create homework';
  }

  get classOptions(): SoSelectOption[] {
    return this.classes.map((item) => ({ value: item.id, label: item.name }));
  }

  get subjectOptions(): SoSelectOption[] {
    return this.subjects.map((item) => ({
      value: item.subjectId,
      label: item.subjectName || 'Subject',
    }));
  }

  get subjectPlaceholder(): string {
    if (!this.form.classId) return 'Select class first';
    if (this.subjectsLoading) return 'Loading subjects…';
    if (!this.subjects.length) return 'No subjects for this class';
    return 'Select subject';
  }

  ngOnInit(): void {
    const isEdit = this.route.snapshot.url.some((s) => s.path === 'edit');
    const id = this.route.snapshot.paramMap.get('id');
    this.classService.getClassDropdown().subscribe({ next: (c) => (this.classes = c || []) });
    if (isEdit && id) {
      this.homeworkId = id;
      this.loadForEdit(id);
    }
  }

  onClassChange(classId: string): void {
    this.form.classId = classId ?? '';
    this.form.subjectId = '';
    this.loadSubjectsForClass(this.form.classId);
  }

  loadSubjectsForClass(classId: string, keepSubjectId?: string): void {
    const id = (classId || '').trim();
    if (!id) {
      this.subjects = [];
      this.subjectsLoading = false;
      return;
    }

    this.subjectsLoading = true;
    const yearId = this.ayContext.effectiveYearId();
    this.classService.getTeachingSubjectsForClass(id, yearId).subscribe({
      next: (list) => {
        this.subjects = list || [];
        this.subjectsLoading = false;
        if (keepSubjectId && this.subjects.some((s) => s.subjectId === keepSubjectId)) {
          this.form.subjectId = keepSubjectId;
        } else if (this.form.subjectId && !this.subjects.some((s) => s.subjectId === this.form.subjectId)) {
          this.form.subjectId = '';
        }
      },
      error: () => {
        this.subjects = [];
        this.subjectsLoading = false;
        this.form.subjectId = '';
        void this.toast.error('Failed to load subjects for class');
      },
    });
  }

  loadForEdit(id: string): void {
    this.loading = true;
    this.homeworkService.getById(id).subscribe({
      next: (d) => {
        const raw = d as unknown as Record<string, unknown>;
        const classId = String(raw['classId'] ?? raw['ClassId'] ?? '');
        const subjectId = String(raw['subjectId'] ?? raw['SubjectId'] ?? '');
        this.form = {
          classId,
          subjectId: '',
          title: String(raw['title'] ?? raw['Title'] ?? ''),
          description: (raw['description'] ?? raw['Description']) as string | null,
          assignDate: String(raw['assignDate'] ?? raw['AssignDate'] ?? '').slice(0, 10),
          dueDate: String(raw['dueDate'] ?? raw['DueDate'] ?? '').slice(0, 10),
          priority: Number(raw['priority'] ?? raw['Priority'] ?? 0),
          marks: (raw['marks'] ?? raw['Marks']) as number | null,
          submissionType: Number(raw['submissionType'] ?? raw['SubmissionType'] ?? 0),
        };
        this.loading = false;
        this.loadSubjectsForClass(classId, subjectId);
      },
      error: () => {
        this.loading = false;
        void this.toast.error('Failed to load homework');
        void this.router.navigate(['/homework']);
      },
    });
  }

  save(): void {
    if (!this.canManage) return;
    if (!this.form.classId || !this.form.subjectId || !this.form.title?.trim() || !this.form.dueDate) {
      void this.toast.warning('Fill required fields');
      return;
    }
    this.saving = true;
    const payload = { ...this.form, title: this.form.title.trim() };
    const call = this.homeworkId
      ? this.homeworkService.update(this.homeworkId, payload)
      : this.homeworkService.create(payload);

    call.subscribe({
      next: (res) => {
        this.saving = false;
        const r = res as unknown as Record<string, unknown>;
        const id = String(r['id'] ?? r['Id'] ?? this.homeworkId);
        void this.toast.success(this.homeworkId ? 'Homework updated' : 'Homework assigned');
        void this.router.navigate(id ? ['/homework', id] : ['/homework']);
      },
      error: (err) => {
        this.saving = false;
        void this.toast.errorFrom(err, 'Save failed');
      },
    });
  }

  private emptyForm(): CreateHomeworkRequest {
    const today = localDateString();
    const due = new Date();
    due.setDate(due.getDate() + 2);
    return {
      classId: '',
      subjectId: '',
      title: '',
      description: '',
      assignDate: today,
      dueDate: localDateString(due),
      priority: HomeworkPriority.Normal,
      marks: null,
      submissionType: HomeworkSubmissionType.Physical,
    };
  }
}
