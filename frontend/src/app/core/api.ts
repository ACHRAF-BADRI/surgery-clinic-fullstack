import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API } from './config';
import {
  AdminDashboard,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AccountStatus,
  ClinicInfo,
  DayAvailability,
  DoctorDashboard,
  Page,
  Patient,
  Role,
  Thread,
  ThreadDetail,
  ThreadStatus,
  User,
} from './models';

function params(obj: Record<string, string | number | boolean | null | undefined>) {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  return p;
}

/** Public data (catalog, availability, contact). */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private http = inject(HttpClient);
  private clinic$?: Observable<ClinicInfo>;

  clinic(): Observable<ClinicInfo> {
    return (this.clinic$ ??= this.http.get<ClinicInfo>(`${API}/public/clinic`).pipe(shareReplay({ bufferSize: 1, refCount: false })));
  }

  resetClinicCache() {
    this.clinic$ = undefined;
  }

  availability(date: string, type?: AppointmentType, doctorId?: string) {
    return this.http.get<DayAvailability>(`${API}/public/availability`, { params: params({ date, type, doctorId }) });
  }

  contact(body: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    procedure?: string | null;
    body: string;
    website?: string;
  }) {
    return this.http.post<void>(`${API}/public/messages`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class PatientApi {
  private http = inject(HttpClient);
  private base = `${API}/patient`;

  appointments() {
    return this.http.get<Appointment[]>(`${this.base}/appointments`);
  }

  book(body: { type: AppointmentType; procedure?: string | null; startAt: string; doctorId?: string | null; note?: string }) {
    return this.http.post<Appointment>(`${this.base}/appointments`, body);
  }

  cancel(id: string, reason?: string) {
    return this.http.post<Appointment>(`${this.base}/appointments/${id}/cancel`, { reason });
  }

  threads() {
    return this.http.get<Thread[]>(`${this.base}/threads`);
  }

  unreadCount() {
    return this.http.get<{ count: number }>(`${this.base}/threads/unread-count`);
  }

  thread(id: string) {
    return this.http.get<ThreadDetail>(`${this.base}/threads/${id}`);
  }

  newThread(body: { subject: string; procedure?: string | null; body: string }) {
    return this.http.post<ThreadDetail>(`${this.base}/threads`, body);
  }

  reply(id: string, body: string) {
    return this.http.post<ThreadDetail>(`${this.base}/threads/${id}/messages`, { body });
  }
}

export type PatientInput = Omit<
  Patient,
  'id' | 'status' | 'hasAccount' | 'invitationPending' | 'appointmentCount' | 'nextAppointmentAt' | 'lastAppointmentAt' | 'createdAt' | 'lastLoginAt'
>;

@Injectable({ providedIn: 'root' })
export class DoctorApi {
  private http = inject(HttpClient);
  private base = `${API}/doctor`;

  dashboard() {
    return this.http.get<DoctorDashboard>(`${this.base}/dashboard`);
  }

  patients(q: string, account: '' | 'with' | 'without', page: number, size = 12) {
    return this.http.get<Page<Patient>>(`${this.base}/patients`, { params: params({ q, account, page, size }) });
  }

  patient(id: string) {
    return this.http.get<Patient>(`${this.base}/patients/${id}`);
  }

  createPatient(body: PatientInput) {
    return this.http.post<Patient>(`${this.base}/patients`, body);
  }

  updatePatient(id: string, body: PatientInput) {
    return this.http.put<Patient>(`${this.base}/patients/${id}`, body);
  }

  deletePatient(id: string) {
    return this.http.delete<void>(`${this.base}/patients/${id}`);
  }

  invite(id: string) {
    return this.http.post<void>(`${this.base}/patients/${id}/invite`, {});
  }

  patientAppointments(id: string) {
    return this.http.get<Appointment[]>(`${this.base}/patients/${id}/appointments`);
  }

  writeToPatient(id: string, body: { subject: string; body: string }) {
    return this.http.post<ThreadDetail>(`${this.base}/patients/${id}/threads`, body);
  }

  appointments(from: string, to: string, status?: AppointmentStatus | '') {
    return this.http.get<Appointment[]>(`${this.base}/appointments`, { params: params({ from, to, status }) });
  }

  availability(date: string, type?: AppointmentType, excludeId?: string) {
    return this.http.get<DayAvailability>(`${this.base}/availability`, { params: params({ date, type, excludeId }) });
  }

  book(body: {
    patientId: string;
    type: AppointmentType;
    procedure?: string | null;
    startAt: string;
    durationMinutes?: number | null;
    note?: string;
    notifyPatient: boolean;
  }) {
    return this.http.post<Appointment>(`${this.base}/appointments`, body);
  }

  reschedule(id: string, startAt: string, reason: string, notifyPatient: boolean) {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/reschedule`, { startAt, reason, notifyPatient });
  }

  setStatus(id: string, status: AppointmentStatus, reason?: string) {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/status`, { status, reason });
  }

  setNote(id: string, doctorNote: string) {
    return this.http.patch<Appointment>(`${this.base}/appointments/${id}/note`, { doctorNote });
  }

  deleteAppointment(id: string) {
    return this.http.delete<void>(`${this.base}/appointments/${id}`);
  }

  threads(filter: string) {
    return this.http.get<Thread[]>(`${this.base}/threads`, { params: params({ filter }) });
  }

  thread(id: string) {
    return this.http.get<ThreadDetail>(`${this.base}/threads/${id}`);
  }

  reply(id: string, body: string) {
    return this.http.post<ThreadDetail>(`${this.base}/threads/${id}/messages`, { body });
  }

  setThreadStatus(id: string, status: ThreadStatus) {
    return this.http.patch<Thread>(`${this.base}/threads/${id}/status`, { status });
  }

  deleteThread(id: string) {
    return this.http.delete<void>(`${this.base}/threads/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private base = `${API}/admin`;

  dashboard() {
    return this.http.get<AdminDashboard>(`${this.base}/dashboard`);
  }

  users(f: { q?: string; role?: Role | ''; status?: AccountStatus | ''; account?: string; page: number; size?: number }) {
    return this.http.get<Page<User>>(`${this.base}/users`, { params: params({ size: 12, ...f }) });
  }

  create(body: { firstName: string; lastName: string; email: string; phone?: string; role: Role; password: string }) {
    return this.http.post<User>(`${this.base}/users`, body);
  }

  update(id: string, body: Partial<User>) {
    return this.http.put<User>(`${this.base}/users/${id}`, body);
  }

  setRole(id: string, role: Role) {
    return this.http.patch<User>(`${this.base}/users/${id}/role`, { role });
  }

  setStatus(id: string, status: AccountStatus, reason?: string) {
    return this.http.patch<User>(`${this.base}/users/${id}/status`, { status, reason });
  }

  setPassword(id: string, password: string) {
    return this.http.put<User>(`${this.base}/users/${id}/password`, { password });
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
}
