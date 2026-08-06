import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantGuard } from './core/guards/tenant.guard';
import { menuPermissionGuard } from './core/guards/menu-permission.guard';
import { MenuCodes } from './core/constants/menu-codes';

export const routes: Routes = [
  {
    path: 'school-code',
    loadComponent: () =>
      import('./pages/school-code/school-code.page').then((m) => m.SchoolCodePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [tenantGuard],
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./pages/change-password/change-password.page').then((m) => m.ChangePasswordPage),
    canActivate: [tenantGuard],
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  {
    path: 'attendance',
    loadComponent: () => import('./pages/attendance/attendance.page').then((m) => m.AttendancePage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Attendance)],
  },
  {
    path: 'staff-attendance',
    loadComponent: () =>
      import('./pages/staff-attendance/staff-attendance.page').then((m) => m.StaffAttendancePage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.StaffAttendance)],
  },
  {
    path: 'homework/new',
    loadComponent: () => import('./pages/homework/homework-form.page').then((m) => m.HomeworkFormPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Homework)],
  },
  {
    path: 'homework/:id/edit',
    loadComponent: () => import('./pages/homework/homework-form.page').then((m) => m.HomeworkFormPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Homework)],
  },
  {
    path: 'homework/:id',
    loadComponent: () => import('./pages/homework/homework-detail.page').then((m) => m.HomeworkDetailPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Homework)],
  },
  {
    path: 'homework',
    loadComponent: () => import('./pages/homework/homework-list.page').then((m) => m.HomeworkListPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Homework)],
  },
  {
    path: 'students',
    loadComponent: () => import('./pages/students/students-list.page').then((m) => m.StudentsListPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Students)],
  },
  {
    path: 'students/:id',
    loadComponent: () => import('./pages/students/student-detail.page').then((m) => m.StudentDetailPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.Students)],
  },
  {
    path: 'leave/mine',
    loadComponent: () => import('./pages/leave/leave-mine.page').then((m) => m.LeaveMinePage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.LeaveStaff)],
  },
  {
    path: 'leave/staff-apply',
    loadComponent: () => import('./pages/leave/staff-apply.page').then((m) => m.StaffApplyPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.LeaveStaff)],
  },
  {
    path: 'leave/student-apply',
    loadComponent: () => import('./pages/leave/student-apply.page').then((m) => m.StudentApplyPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.LeaveStudent)],
  },
  {
    path: 'my-actions/:id',
    loadComponent: () => import('./pages/my-actions/my-action-detail.page').then((m) => m.MyActionDetailPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.MyActions)],
  },
  {
    path: 'my-actions',
    loadComponent: () => import('./pages/my-actions/my-actions-list.page').then((m) => m.MyActionsListPage),
    canActivate: [authGuard, menuPermissionGuard(MenuCodes.MyActions)],
  },
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
];
