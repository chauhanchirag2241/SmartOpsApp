import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { menuPermissionGuard } from './core/guards/menu-permission.guard';
import { MenuCodes } from './core/constants/menu-codes';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
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
      {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance.page').then((m) => m.AttendancePage),
        canActivate: [menuPermissionGuard(MenuCodes.Attendance)],
      },
      {
        path: 'homework',
        loadComponent: () => import('./pages/homework/homework-list.page').then((m) => m.HomeworkListPage),
        canActivate: [menuPermissionGuard(MenuCodes.Homework)],
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
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
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
];
