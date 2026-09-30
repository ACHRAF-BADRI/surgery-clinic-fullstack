import { BRAND } from './config';
import { AppointmentStatus, ApiError, Role } from './models';
import { HttpErrorResponse } from '@angular/common/http';

const tz = BRAND.timeZone;

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, ...opts });

const dayLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dayShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const dateOnly = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' });
const time = fmt({ hour: '2-digit', minute: '2-digit' });
const monthShort = fmt({ month: 'short' });
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatDayLong = (iso?: string | Date) => (iso ? cap(dayLong.format(new Date(iso))) : '—');
export const formatDayShort = (iso?: string | Date) => (iso ? cap(dayShort.format(new Date(iso))) : '—');
export const formatDate = (iso?: string | Date) => (iso ? dateOnly.format(new Date(iso)) : '—');
export const formatTime = (iso?: string | Date) => (iso ? time.format(new Date(iso)).replace(':', 'h') : '—');
export const formatDateTime = (iso?: string | Date) => (iso ? `${formatDayShort(iso)} · ${formatTime(iso)}` : '—');

/** "2026-09" → "sept." */
export const formatMonthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return cap(monthShort.format(new Date(Date.UTC(y, m - 1, 15))));
};

/** Today's date (clinic time zone) as YYYY-MM-DD. */
export const todayYmd = () => ymd.format(new Date());
export const toYmd = (d: Date) => ymd.format(d);

export const addDays = (ymdStr: string, days: number) => {
  const d = new Date(`${ymdStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** UTC instant matching YYYY-MM-DD HH:mm in the clinic time zone. */
export function zonedToInstant(dateYmd: string, hhmm: string): Date {
  const guess = new Date(`${dateYmd}T${hhmm}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asZoned = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess.getTime() - (asZoned - guess.getTime()));
}

export const timeInZone = (iso: string) => time.format(new Date(iso));
export const ymdInZone = (iso: string) => ymd.format(new Date(iso));

export const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(iso);
};

export const initials = (name?: string) =>
  (name ?? '')
    .replace(/^Dr\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const age = (dob?: string) => {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  NO_SHOW: 'Absent',
};

export const STATUS_TONES: Record<AppointmentStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'neutral',
  NO_SHOW: 'danger',
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  DOCTOR: 'Docteur',
  PATIENT: 'Patient',
};

export const ROLE_TONES: Record<Role, BadgeTone> = {
  ADMIN: 'info',
  DOCTOR: 'accent',
  PATIENT: 'neutral',
};

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/** Human-readable message from an HTTP error. */
export function errorMessage(err: unknown, fallback = 'Une erreur est survenue. Merci de réessayer.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Serveur injoignable. Vérifiez votre connexion ou réessayez dans un instant.';
    const body = err.error as Partial<ApiError> | null;
    if (body?.fields && Object.keys(body.fields).length) {
      return Object.values(body.fields)[0] ?? body.message ?? fallback;
    }
    if (body?.message) return body.message;
  }
  return fallback;
}

export function errorCode(err: unknown): string | undefined {
  return err instanceof HttpErrorResponse ? (err.error as Partial<ApiError> | null)?.code : undefined;
}
