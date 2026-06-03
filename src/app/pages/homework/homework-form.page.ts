import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import {
  CreateHomeworkRequest,
  HomeworkPriority,
  HomeworkSubmissionType,
} from '../../core/models/homework.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { PermissionService } from '../../core/services/permission.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { HomeworkService } from '../../core/services/homework.service';
import { SubjectDropdownItem, SubjectService } from '../../core/services/subject.service';
import { localDateString } from '../../core/utils/api-mapper.util';

@Component({
  selector: 'app-homework-form',
  templateUrl: './homework-form.page.html',
  styleUrls: ['./homework-form.page.scss'],
  imports: [FormsModule, AppHeaderComponent, IonContent, IonSpinner],
})
export class HomeworkFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly homeworkService = inject(HomeworkService);
  private readonly classService = inject(ClassService);
  private readonly subjectService = inject(SubjectService);
  private readonly toast = inject(ToastController);
  readonly ayContext = inject(AcademicYearContextService);
  private readonly permissions = inject(PermissionService);

  HomeworkPriority = HomeworkPriority;
  HomeworkSubmissionType = HomeworkSubmissionType;

  homeworkId: string | null = null;
  classes: ClassDropdownItem[] = [];
  subjects: SubjectDropdownItem[] = [];
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

  ngOnInit(): void {
    const isEdit = this.route.snapshot.url.some((s) => s.path === 'edit');
    const id = this.route.snapshot.paramMap.get('id');
    if (isEdit && id) {
      this.homeworkId = id;
      this.loadForEdit(id);
    }
    this.loadDropdowns();
  }

  loadDropdowns(): void {
    this.classService.getClassDropdown().subscribe({ next: (c) => (this.classes = c || []) });
    this.subjectService.getSubjectDropdown().subscribe({ next: (s) => (this.subjects = s || []) });
  }

  loadForEdit(id: string): void {
    this.loading = true;
    this.homeworkService.getById(id).subscribe({
      next: (d) => {
        const raw = d as unknown as Record<string, unknown>;
        this.form = {
          classId: String(raw['classId'] ?? raw['ClassId'] ?? ''),
          subjectId: String(raw['subjectId'] ?? raw['SubjectId'] ?? ''),
          title: String(raw['title'] ?? raw['Title'] ?? ''),
          description: (raw['description'] ?? raw['Description']) as string | null,
          assignDate: String(raw['assignDate'] ?? raw['AssignDate'] ?? '').slice(0, 10),
          dueDate: String(raw['dueDate'] ?? raw['DueDate'] ?? '').slice(0, 10),
          priority: Number(raw['priority'] ?? raw['Priority'] ?? 0),
          marks: (raw['marks'] ?? raw['Marks']) as number | null,
          submissionType: Number(raw['submissionType'] ?? raw['SubmissionType'] ?? 0),
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        void this.showToast('Failed to load homework');
        void this.router.navigate(['/homework']);
      },
    });
  }

  save(): void {
    if (!this.canManage) return;
    if (!this.form.classId || !this.form.subjectId || !this.form.title?.trim() || !this.form.dueDate) {
      void this.showToast('Fill required fields');
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
        void this.showToast(this.homeworkId ? 'Homework updated' : 'Homework assigned');
        void this.router.navigate(id ? ['/homework', id] : ['/homework']);
      },
      error: (err) => {
        this.saving = false;
        void this.showToast(typeof err?.error === 'string' ? err.error : 'Save failed');
      },
    });
  }

  subjectLabel(s: SubjectDropdownItem): string {
    return s.subjectName || s.name || '';
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

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
