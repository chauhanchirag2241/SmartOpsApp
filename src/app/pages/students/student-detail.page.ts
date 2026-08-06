import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  callOutline,
  locationOutline,
  mailOutline,
  maleFemaleOutline,
} from 'ionicons/icons';
import { catchError, forkJoin, of } from 'rxjs';
import { ClassService } from '../../core/services/class.service';
import { StudentService } from '../../core/services/student.service';
import { formatDisplayDate } from '../../core/utils/api-mapper.util';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { SoAvatarComponent } from '../../shared/components/so-avatar/so-avatar.component';
import { SoModuleShellComponent } from '../../shared/components/so-module-shell/so-module-shell.component';

interface StudentDetailView {
  id: string;
  fullName: string;
  admissionNo: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  classId: string;
  className: string;
  rollNumber: string;
  remarks: string;
}

@Component({
  selector: 'app-student-detail',
  templateUrl: './student-detail.page.html',
  styleUrls: ['./student-detail.page.scss'],
  imports: [
    AppHeaderComponent,
    SoAvatarComponent,
    SoModuleShellComponent,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class StudentDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);

  studentId = '';
  detail: StudentDetailView | null = null;
  loading = false;
  loadError = '';

  constructor() {
    addIcons({ calendarOutline, mailOutline, callOutline, locationOutline, maleFemaleOutline });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.studentId = (params.get('id') ?? '').trim();
      if (this.studentId) {
        this.loadDetail();
      }
    });
  }

  private loadDetail(): void {
    this.loading = true;
    this.loadError = '';
    forkJoin({
      student: this.studentService.getStudentById(this.studentId),
      classes: this.classService.getClassDropdown().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ student: raw, classes }) => {
        const r = raw as Record<string, unknown>;
        const academics = (r['academics'] ?? r['Academics'] ?? []) as Record<string, unknown>[];
        const ac = academics[0] ?? {};
        const firstName = String(r['firstName'] ?? r['FirstName'] ?? '').trim();
        const middleName = String(r['middleName'] ?? r['MiddleName'] ?? '').trim();
        const lastName = String(r['lastName'] ?? r['LastName'] ?? '').trim();
        const classId = String(ac['classId'] ?? ac['ClassId'] ?? '');
        const className =
          String(ac['className'] ?? ac['ClassName'] ?? '').trim() ||
          classes.find((item) => item.id.toLowerCase() === classId.toLowerCase())?.name ||
          '—';
        const dob = String(r['dob'] ?? r['Dob'] ?? '').slice(0, 10);
        this.detail = {
          id: String(r['id'] ?? r['Id'] ?? ''),
          fullName:
            [firstName, middleName, lastName].filter(Boolean).join(' ') ||
            String(r['name'] ?? r['Name'] ?? 'Student'),
          admissionNo: String(r['admissionNo'] ?? r['AdmissionNo'] ?? '—'),
          mobile: String(r['mobile'] ?? r['Mobile'] ?? '—'),
          email: String(r['email'] ?? r['Email'] ?? '—'),
          gender: String(r['gender'] ?? r['Gender'] ?? '—'),
          dob: dob ? formatDisplayDate(dob) : '—',
          address: String(r['address'] ?? r['Address'] ?? '—'),
          classId,
          className,
          rollNumber: String(ac['rollNumber'] ?? ac['RollNumber'] ?? '—'),
          remarks: String(r['remarks'] ?? r['Remarks'] ?? ''),
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Failed to load student details';
      },
    });
  }
}
