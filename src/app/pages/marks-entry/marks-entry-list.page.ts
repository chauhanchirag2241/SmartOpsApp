import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, documentTextOutline } from 'ionicons/icons';
import { ExamListItem } from '../../core/models/exam.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { ExamService } from '../../core/services/exam.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-marks-entry-list',
  templateUrl: './marks-entry-list.page.html',
  styleUrls: ['./marks-entry-list.page.scss'],
  imports: [
    AppHeaderComponent,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonIcon,
  ],
})
export class MarksEntryListPage implements OnInit {
  private readonly examService = inject(ExamService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);
  readonly ayContext = inject(AcademicYearContextService);

  loading = false;
  exams: ExamListItem[] = [];

  constructor() {
    addIcons({ createOutline, documentTextOutline });
  }

  get canEnter(): boolean {
    if (this.ayContext.isReadOnlyScope()) return false;
    return (
      this.permissions.canAdd(MenuCodes.ExamMarksEntry) ||
      this.permissions.canEdit(MenuCodes.ExamMarksEntry)
    );
  }

  ngOnInit(): void {
    this.loadExams();
  }

  onRefresh(event: CustomEvent): void {
    this.loadExams(() => (event.target as HTMLIonRefresherElement).complete());
  }

  classesLabel(exam: ExamListItem): string {
    const names = (exam.classes ?? []).map((c) => c.className).filter(Boolean);
    return names.length ? names.join(', ') : 'No classes';
  }

  openMarksEntry(exam: ExamListItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.canEnter) {
      void this.toast.error('You do not have permission to enter marks.');
      return;
    }
    if (!(exam.classes ?? []).length) {
      void this.toast.error('This exam has no classes assigned.');
      return;
    }
    void this.router.navigate(['/marks-entry/enter'], {
      queryParams: { examId: exam.id },
    });
  }

  private loadExams(done?: () => void): void {
    this.loading = true;
    // Shared with SmartOpsUI — used by web and mobile. GET /api/exams
    this.examService.getExams({ inactiveOnly: false }).subscribe({
      next: (rows) => {
        this.exams = (rows ?? []).filter((e) => e.isActive !== false);
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
}
