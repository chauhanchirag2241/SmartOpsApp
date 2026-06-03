import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline,
  locationOutline,
  mailOutline,
  personOutline,
  schoolOutline,
} from 'ionicons/icons';
import { StudentService } from '../../core/services/student.service';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
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
    SoModuleShellComponent,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class StudentDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentService);

  studentId = '';
  detail: StudentDetailView | null = null;
  loading = false;
  loadError = '';

  constructor() {
    addIcons({ personOutline, mailOutline, callOutline, locationOutline, schoolOutline });
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
    this.studentService.getStudentById(this.studentId).subscribe({
      next: (raw) => {
        const r = raw as Record<string, unknown>;
        const academics = (r['academics'] ?? r['Academics'] ?? []) as Record<string, unknown>[];
        const ac = academics[0] ?? {};
        this.detail = {
          id: String(r['id'] ?? r['Id'] ?? ''),
          fullName: [r['firstName'], r['middleName'], r['lastName']]
            .map((x) => String(x ?? '').trim())
            .filter(Boolean)
            .join(' '),
          admissionNo: String(r['admissionNo'] ?? r['AdmissionNo'] ?? '—'),
          mobile: String(r['mobile'] ?? r['Mobile'] ?? '—'),
          email: String(r['email'] ?? r['Email'] ?? '—'),
          gender: String(r['gender'] ?? r['Gender'] ?? '—'),
          dob: String(r['dob'] ?? r['Dob'] ?? '—').slice(0, 10),
          address: String(r['address'] ?? r['Address'] ?? '—'),
          className: String(ac['className'] ?? ac['ClassName'] ?? '—'),
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
