export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';
export type AccountStatus = 'ACTIVE' | 'RESTRICTED';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type AppointmentType = 'FIRST_CONSULTATION' | 'FOLLOW_UP' | 'PRE_OP' | 'POST_OP' | 'AESTHETIC_MEDICINE';
export type ThreadStatus = 'OPEN' | 'CLOSED';
export type Sender = 'PATIENT' | 'GUEST' | 'DOCTOR';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: Role;
  status: AccountStatus;
  restrictionReason?: string;
  hasAccount: boolean;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: AccountStatus;
  hasAccount: boolean;
  invitationPending: boolean;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  medicalNotes?: string;
  appointmentCount: number;
  nextAppointmentAt?: string;
  lastAppointmentAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface PersonRef {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  hasAccount: boolean;
}

export interface Appointment {
  id: string;
  patient: PersonRef;
  doctor: PersonRef;
  type: AppointmentType;
  typeLabel: string;
  procedure?: string;
  procedureLabel?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  patientNote?: string;
  doctorNote?: string;
  cancelReason?: string;
  rescheduleCount: number;
  previousStartAt?: string;
  bookedByClinic: boolean;
  createdAt?: string;
}

export interface Slot {
  startAt: string;
  label: string;
}

export interface DayAvailability {
  date: string;
  closed: boolean;
  slots: Slot[];
}

export interface Procedure {
  code: string;
  label: string;
  category: string;
  description: string;
}

export interface AppointmentTypeInfo {
  code: AppointmentType;
  label: string;
  durationMinutes: number;
}

export interface ClinicInfo {
  name: string;
  timeZone: string;
  doctors: { id: string; name: string }[];
  procedures: Procedure[];
  appointmentTypes: AppointmentTypeInfo[];
  /** day = MONDAY…SUNDAY; open/close = "HH:mm", absent when closed. */
  openingHours: { day: string; open?: string; close?: string }[];
}

export interface Thread {
  id: string;
  patientId?: string;
  participantName: string;
  participantEmail?: string;
  participantPhone?: string;
  guest: boolean;
  subject: string;
  procedure?: string;
  procedureLabel?: string;
  status: ThreadStatus;
  unread: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  sender: Sender;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface ThreadDetail {
  thread: Thread;
  messages: Message[];
}

export interface Point {
  label: string;
  value: number;
}

export interface LabeledCount {
  key: string;
  label: string;
  value: number;
}

export interface AdminDashboard {
  totalUsers: number;
  admins: number;
  doctors: number;
  patients: number;
  patientsWithoutAccount: number;
  restricted: number;
  newUsersThisMonth: number;
  activeLast30Days: number;
  signupsByMonth: Point[];
  byRole: LabeledCount[];
  recentUsers: User[];
  recentLogins: User[];
}

export interface DoctorDashboard {
  totalPatients: number;
  patientsWithoutAccount: number;
  newPatientsThisMonth: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  pendingRequests: number;
  unreadThreads: number;
  cancellationRate: number;
  appointmentsByMonth: Point[];
  appointmentsByMonthAndStatus: Record<string, Point[]>;
  topProcedures: LabeledCount[];
  byType: LabeledCount[];
  upcoming: Appointment[];
  pending: Appointment[];
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  detail?: string;
  fields?: Record<string, string>;
}
