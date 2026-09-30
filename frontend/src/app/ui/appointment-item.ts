import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../core/config';
import { formatTime, STATUS_LABELS, STATUS_TONES } from '../core/format';
import { Appointment } from '../core/models';
import { BadgeComponent } from './badge';
import { IconComponent } from './icon';

const tz = BRAND.timeZone;
const part = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, ...o }).format(new Date(iso));

/** Appointment row: date block, time, reason, status and contextual badges. */
@Component({
  selector: 'app-appointment-item',
  imports: [BadgeComponent, IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .item { display: flex; gap: 16px; align-items: center; padding: 16px 18px; flex-wrap: wrap; }
    .date {
      flex-shrink: 0; width: 60px; text-align: center; padding: 8px 0; border-radius: 14px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .date.today { background: var(--ink); color: var(--ink-contrast); border-color: var(--ink); }
    .date .d { font-family: var(--font-display); font-size: 1.65rem; line-height: 1; }
    .date .m { font-size: .68rem; text-transform: uppercase; letter-spacing: .12em; opacity: .75; margin-top: 3px; }
    .body { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }
    .line1 { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-weight: 700; }
    .who { font-weight: 700; }
    a.who:hover { color: var(--accent); }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .82rem; color: var(--text-2); }
    .meta span { display: inline-flex; align-items: center; gap: 5px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .actions:empty { display: none; }
    .cancelled .body { opacity: .65; }
    .cancelled .time { text-decoration: line-through; }
    .note { font-size: .82rem; color: var(--text-3); font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  `,
  template: `
    @let a = appointment();
    <div class="item" [class.cancelled]="a.status === 'CANCELLED'">
      <div class="date" [class.today]="isToday()">
        <div class="d">{{ day() }}</div>
        <div class="m">{{ month() }}</div>
      </div>
      <div class="body">
        <div class="line1">
          @if (showPatient()) {
            @if (patientLink()) {
              <a class="who" [routerLink]="['/cabinet/patients', a.patient.id]">{{ a.patient.name }}</a>
            } @else {
              <span class="who">{{ a.patient.name }}</span>
            }
          } @else {
            <span>{{ a.typeLabel }}</span>
          }
          <div class="badges">
            <app-badge [tone]="tones[a.status]" [dot]="true" [pulse]="a.status === 'PENDING'" size="sm">{{ labels[a.status] }}</app-badge>
            @if (showPatient() && !a.patient.hasAccount) {
              <app-badge tone="warning" icon="user-x" size="sm" [outline]="true">Sans compte</app-badge>
            }
            @if (a.rescheduleCount > 0) {
              <app-badge tone="info" icon="calendar-clock" size="sm" [outline]="true">Déplacé</app-badge>
            }
            @if (!showPatient() && a.bookedByClinic) {
              <app-badge tone="accent" size="sm" [outline]="true">Planifié par le cabinet</app-badge>
            }
          </div>
        </div>
        <div class="meta">
          <span class="time"><app-icon name="clock" [size]="13" /> {{ weekday() }} · {{ start() }} – {{ end() }}</span>
          @if (showPatient()) {
            <span><app-icon name="file" [size]="13" /> {{ a.typeLabel }}</span>
          }
          @if (a.procedureLabel) {
            <span><app-icon name="sparkles" [size]="13" /> {{ a.procedureLabel }}</span>
          }
        </div>
        @if (a.patientNote && showNote()) {
          <div class="note">« {{ a.patientNote }} »</div>
        }
        @if (a.status === 'CANCELLED' && a.cancelReason) {
          <div class="note">Motif d'annulation : {{ a.cancelReason }}</div>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </div>
  `,
})
export class AppointmentItemComponent {
  readonly appointment = input.required<Appointment>();
  readonly showPatient = input(false);
  readonly patientLink = input(true);
  readonly showNote = input(true);
  protected readonly labels = STATUS_LABELS;
  protected readonly tones = STATUS_TONES;

  protected readonly day = computed(() => part(this.appointment().startAt, { day: 'numeric' }));
  protected readonly month = computed(() => part(this.appointment().startAt, { month: 'short' }).replace('.', ''));
  protected readonly weekday = computed(() => {
    const s = part(this.appointment().startAt, { weekday: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  protected readonly start = computed(() => formatTime(this.appointment().startAt));
  protected readonly end = computed(() => formatTime(this.appointment().endAt));
  protected readonly isToday = computed(
    () => part(this.appointment().startAt, { dateStyle: 'short' }) === part(new Date().toISOString(), { dateStyle: 'short' }),
  );
}
