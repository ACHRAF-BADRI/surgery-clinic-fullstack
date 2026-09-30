import { HttpErrorResponse } from '@angular/common/http';
import { BRAND } from './config';
import { currentLang, currentLocale, hasKey, translate } from './i18n/i18n';
import { AppointmentStatus, ApiError, Role } from './models';

const tz = BRAND.timeZone;

/** Intl formatter in the current language and the clinic time zone (reading the locale tracks language changes). */
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(currentLocale(), { timeZone: tz, ...opts });
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatDayLong = (iso?: string | Date) =>
  iso ? cap(fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))) : '—';
export const formatDayShort = (iso?: string | Date) =>
  iso ? cap(fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))) : '—';
export const formatDate = (iso?: string | Date) =>
  iso ? fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : '—';
/** "14h30" in French, "14:30" in English. */
export const formatTime = (iso?: string | Date) => {
  if (!iso) return '—';
  const s = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  return currentLang() === 'fr' ? s.replace(':', 'h') : s;
};
export const formatDateTime = (iso?: string | Date) => (iso ? `${formatDayShort(iso)} · ${formatTime(iso)}` : '—');

/** Formats a date part in the current language, e.g. formatPart(iso, { weekday: 'long' }). */
export const formatPart = (iso: string | Date, opts: Intl.DateTimeFormatOptions) => fmt(opts).format(new Date(iso));

/** Formats a calendar day (YYYY-MM-DD) without time-zone shifts. */
export const formatYmd = (ymdStr: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(currentLocale(), { timeZone: 'UTC', ...opts }).format(new Date(`${ymdStr}T12:00:00Z`));

/** "2026-09" → "Sept." / "Sep" */
export const formatMonthLabel = (ym: string) => cap(formatYmd(`${ym}-15`, { month: 'short' }));
/** "2026-09" → "septembre 2026" / "September 2026" */
export const formatMonthLong = (ym: string) => formatYmd(`${ym}-15`, { month: 'long', year: 'numeric' });

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

export const ymdInZone = (iso: string) => ymd.format(new Date(iso));

export const relativeTime = (iso?: string) => {
  if (!iso) return '';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(currentLang(), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return translate('common.justNow');
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

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const STATUS_TONES: Record<AppointmentStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'neutral',
  NO_SHOW: 'danger',
};

export const ROLE_TONES: Record<Role, BadgeTone> = {
  ADMIN: 'info',
  DOCTOR: 'accent',
  PATIENT: 'neutral',
};

/**
 * Human-readable message from an HTTP error.
 * French: the server message (most specific). English: the dictionary entry for the error code.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  const generic = fallback ?? translate('errors.generic');
  if (!(err instanceof HttpErrorResponse)) return generic;
  if (err.status === 0) return translate('errors.network');
  const body = err.error as Partial<ApiError> | null;
  if (currentLang() === 'fr') {
    if (body?.fields && Object.keys(body.fields).length) return Object.values(body.fields)[0] ?? body.message ?? generic;
    if (body?.message) return body.message;
  }
  const code = body?.code;
  if (code === 'ACCOUNT_RESTRICTED' && body?.detail) return translate('errors.ACCOUNT_RESTRICTED_REASON', { reason: body.detail });
  if (code && hasKey(`errors.${code}`)) return translate(`errors.${code}`);
  return generic;
}

export function errorCode(err: unknown): string | undefined {
  return err instanceof HttpErrorResponse ? (err.error as Partial<ApiError> | null)?.code : undefined;
}
