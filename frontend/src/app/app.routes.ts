import { Routes } from '@angular/router';
import { guestOnlyGuard, roleGuard } from './core/guards';
import { AppShellComponent } from './layout/app-shell';
import { PublicLayoutComponent } from './layout/public-layout';

/** Route titles are dictionary keys, translated by I18nTitleStrategy. */
export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', title: 'titles.home', loadComponent: () => import('./pages/public/home').then((m) => m.HomePage) },
      { path: 'interventions', title: 'titles.procedures', loadComponent: () => import('./pages/public/procedures').then((m) => m.ProceduresPage) },
      { path: 'contact', title: 'titles.contact', loadComponent: () => import('./pages/public/contact').then((m) => m.ContactPage) },
      { path: 'rendez-vous', title: 'titles.booking', loadComponent: () => import('./pages/public/booking').then((m) => m.BookingPage) },
      { path: 'connexion', title: 'titles.login', canActivate: [guestOnlyGuard], loadComponent: () => import('./pages/auth/login').then((m) => m.LoginPage) },
      { path: 'inscription', title: 'titles.register', canActivate: [guestOnlyGuard], loadComponent: () => import('./pages/auth/register').then((m) => m.RegisterPage) },
      { path: 'mot-de-passe-oublie', title: 'titles.forgotPassword', loadComponent: () => import('./pages/auth/forgot-password').then((m) => m.ForgotPasswordPage) },
      { path: 'mot-de-passe', title: 'titles.setPassword', loadComponent: () => import('./pages/auth/set-password').then((m) => m.SetPasswordPage) },
    ],
  },
  {
    path: 'espace',
    component: AppShellComponent,
    canActivate: [roleGuard('PATIENT')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'rendez-vous' },
      { path: 'rendez-vous', title: 'titles.myAppointments', loadComponent: () => import('./pages/patient/my-appointments').then((m) => m.MyAppointmentsPage) },
      { path: 'messages', title: 'titles.messages', loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'patient' } },
      { path: 'messages/:id', title: 'titles.messages', loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'patient' } },
      { path: 'profil', title: 'titles.profile', loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: 'cabinet',
    component: AppShellComponent,
    canActivate: [roleGuard('DOCTOR', 'ADMIN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      { path: 'tableau-de-bord', title: 'titles.doctorDashboard', loadComponent: () => import('./pages/doctor/dashboard').then((m) => m.DoctorDashboardPage) },
      { path: 'agenda', title: 'titles.agenda', loadComponent: () => import('./pages/doctor/agenda').then((m) => m.AgendaPage) },
      { path: 'patients', title: 'titles.patients', loadComponent: () => import('./pages/doctor/patients').then((m) => m.PatientsPage) },
      { path: 'patients/:id', title: 'titles.patientFile', loadComponent: () => import('./pages/doctor/patient-detail').then((m) => m.PatientDetailPage) },
      { path: 'messages', title: 'titles.messages', loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'doctor' } },
      { path: 'messages/:id', title: 'titles.messages', loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'doctor' } },
      { path: 'profil', title: 'titles.profile', loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [roleGuard('ADMIN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      { path: 'tableau-de-bord', title: 'titles.adminDashboard', loadComponent: () => import('./pages/admin/admin-dashboard').then((m) => m.AdminDashboardPage) },
      { path: 'utilisateurs', title: 'titles.users', loadComponent: () => import('./pages/admin/users').then((m) => m.UsersPage) },
      { path: 'profil', title: 'titles.profile', loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: '**',
    component: PublicLayoutComponent,
    children: [{ path: '', title: 'titles.notFound', loadComponent: () => import('./pages/public/not-found').then((m) => m.NotFoundPage) }],
  },
];
