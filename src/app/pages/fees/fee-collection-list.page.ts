import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { cardOutline, chevronForwardOutline, peopleOutline, schoolOutline } from 'ionicons/icons';
import { FeeCollectionStudentItem } from '../../core/models/fee-collection.model';
import { MenuCodes } from '../../core/constants/menu-codes';
import { AcademicYearContextService } from '../../core/services/academic-year-context.service';
import { AppHeaderService } from '../../core/services/app-header.service';
import { ClassDropdownItem, ClassService } from '../../core/services/class.service';
import { FeeCollectionService } from '../../core/services/fee-collection.service';
import {
  asArray,
  formatInr,
  normalizeFeeCollectionStudent,
  statusBadgeClass,
  studentInitials,
} from '../../core/utils/fees.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoFilterPopoverComponent } from '../../shared/components/so-filter-popover/so-filter-popover.component';
import { SoModuleShellComponent } from '../../shared/components/so-module-shell/so-module-shell.component';
import { SoPageToolbarComponent } from '../../shared/components/so-page-toolbar/so-page-toolbar.component';

@Component({
  selector: 'app-fee-collection-list',
  templateUrl: './fee-collection-list.page.html',
  styleUrls: ['./fee-collection-list.page.scss'],
  imports: [
    FormsModule,
    AppHeaderComponent,
    SoFilterPopoverComponent,
    SoModuleShellComponent,
    SoPageToolbarComponent,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class FeeCollectionListPage implements OnInit, OnDestroy {
  private readonly feeService = inject(FeeCollectionService);
  private readonly classService = inject(ClassService);
  private readonly header = inject(AppHeaderService);
  private readonly router = inject(Router);
  readonly ayContext = inject(AcademicYearContextService);
  private subs = new Subscription();

  students: FeeCollectionStudentItem[] = [];
  classes: ClassDropdownItem[] = [];
  classFilter = '';
  statusFilter = '';
  filterOpen = false;
  searchQuery = '';
  loading = false;

  readonly statusOptions = [
    { value: '', label: 'All students' },
    { value: 'paid', label: 'Fully paid' },
    { value: 'partial', label: 'Partial' },
    { value: 'unpaid', label: 'Overdue' },
  ];

  formatInr = formatInr;
  studentInitials = studentInitials;
  statusBadgeClass = statusBadgeClass;

  get classFilterLabel(): string {
    if (!this.classFilter) return 'No class selected';
    return this.classes.find((c) => c.id === this.classFilter)?.name ?? 'Class';
  }

  get statusFilterLabel(): string {
    return this.statusOptions.find((o) => o.value === this.statusFilter)?.label ?? 'All students';
  }

  constructor() {
    addIcons({ schoolOutline, peopleOutline, cardOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.loadClasses();
    this.subs.add(
      this.header.searchQuery$.subscribe((q) => {
        this.searchQuery = q;
        if (this.classFilter) this.loadStudents();
      }),
    );
    this.subs.add(
      this.header.filterClick$.subscribe(() => {
        this.filterOpen = true;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onClassChange(): void {
    this.loadStudents();
  }

  onStatusChange(): void {
    if (this.classFilter) this.loadStudents();
  }

  applyFilters(): void {
    this.filterOpen = false;
    this.loadStudents();
  }

  clearFilters(): void {
    this.classFilter = '';
    this.statusFilter = '';
    this.students = [];
  }

  openStudent(student: FeeCollectionStudentItem): void {
    void this.router.navigate(['/fees/collection', student.studentId], {
      queryParams: { classId: this.classFilter },
    });
  }

  private loadClasses(): void {
    this.classService.getClassDropdown().subscribe({
      next: (list) => (this.classes = list || []),
    });
  }

  private loadStudents(): void {
    if (!this.classFilter) {
      this.students = [];
      return;
    }
    this.loading = true;
    const yearId = this.ayContext.effectiveYearId() ?? undefined;
    this.feeService
      .getStudents(this.classFilter, yearId, this.searchQuery || undefined, this.statusFilter || undefined)
      .subscribe({
        next: (list) => {
          this.students = asArray<Record<string, unknown>>(list).map(normalizeFeeCollectionStudent);
          this.loading = false;
        },
        error: () => {
          this.students = [];
          this.loading = false;
        },
      });
  }
}
