import { Routes } from '@angular/router';
import { guestOnlyGuard, roleGuard } from './core/guards';
import { AppShellComponent } from './layout/app-shell';
import { PublicLayoutComponent } from './layout/public-layout';

const T = (t: string) => `${t} · Clinique Badri`;

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', title: 'Clinique Badri — Chirurgie plastique & esthétique', loadComponent: () => import('./pages/public/home').then((m) => m.HomePage) },
      { path: 'interventions', title: T('Interventions'), loadComponent: () => import('./pages/public/procedures').then((m) => m.ProceduresPage) },
      { path: 'contact', title: T('Contact'), loadComponent: () => import('./pages/public/contact').then((m) => m.ContactPage) },
      { path: 'rendez-vous', title: T('Prendre rendez-vous'), loadComponent: () => import('./pages/public/booking').then((m) => m.BookingPage) },
      { path: 'connexion', title: T('Connexion'), canActivate: [guestOnlyGuard], loadComponent: () => import('./pages/auth/login').then((m) => m.LoginPage) },
      { path: 'inscription', title: T('Créer un compte'), canActivate: [guestOnlyGuard], loadComponent: () => import('./pages/auth/register').then((m) => m.RegisterPage) },
      { path: 'mot-de-passe-oublie', title: T('Mot de passe oublié'), loadComponent: () => import('./pages/auth/forgot-password').then((m) => m.ForgotPasswordPage) },
      { path: 'mot-de-passe', title: T('Choisir un mot de passe'), loadComponent: () => import('./pages/auth/set-password').then((m) => m.SetPasswordPage) },
    ],
  },
  {
    path: 'espace',
    component: AppShellComponent,
    canActivate: [roleGuard('PATIENT')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'rendez-vous' },
      { path: 'rendez-vous', title: T('Mes rendez-vous'), loadComponent: () => import('./pages/patient/my-appointments').then((m) => m.MyAppointmentsPage) },
      { path: 'messages', title: T('Messagerie'), loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'patient' } },
      { path: 'messages/:id', title: T('Messagerie'), loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'patient' } },
      { path: 'profil', title: T('Mon profil'), loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: 'cabinet',
    component: AppShellComponent,
    canActivate: [roleGuard('DOCTOR', 'ADMIN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      { path: 'tableau-de-bord', title: T('Tableau de bord'), loadComponent: () => import('./pages/doctor/dashboard').then((m) => m.DoctorDashboardPage) },
      { path: 'agenda', title: T('Agenda'), loadComponent: () => import('./pages/doctor/agenda').then((m) => m.AgendaPage) },
      { path: 'patients', title: T('Patients'), loadComponent: () => import('./pages/doctor/patients').then((m) => m.PatientsPage) },
      { path: 'patients/:id', title: T('Dossier patient'), loadComponent: () => import('./pages/doctor/patient-detail').then((m) => m.PatientDetailPage) },
      { path: 'messages', title: T('Messagerie'), loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'doctor' } },
      { path: 'messages/:id', title: T('Messagerie'), loadComponent: () => import('./pages/shared/messages').then((m) => m.MessagesPage), data: { mode: 'doctor' } },
      { path: 'profil', title: T('Mon profil'), loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [roleGuard('ADMIN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      { path: 'tableau-de-bord', title: T('Administration'), loadComponent: () => import('./pages/admin/admin-dashboard').then((m) => m.AdminDashboardPage) },
      { path: 'utilisateurs', title: T('Utilisateurs'), loadComponent: () => import('./pages/admin/users').then((m) => m.UsersPage) },
      { path: 'profil', title: T('Mon profil'), loadComponent: () => import('./pages/shared/profile').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: '**',
    component: PublicLayoutComponent,
    children: [{ path: '', title: T('Page introuvable'), loadComponent: () => import('./pages/public/not-found').then((m) => m.NotFoundPage) }],
  },
];
