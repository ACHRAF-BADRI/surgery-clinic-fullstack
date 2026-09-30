import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, effect, untracked } from '@angular/core';
import { DoctorApi } from '../../core/api';
import { addDays, errorMessage, formatDayLong, STATUS_LABELS, todayYmd, ymdInZone, zonedToInstant } from '../../core/format';
import { Appointment, AppointmentStatus } from '../../core/models';
import { AppointmentItemComponent } from '../../ui/appointment-item';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonListComponent } from '../../ui/skeleton';
import { AppointmentActions } from './appointment-actions';
import { BookModalComponent, RescheduleModalComponent } from './appointment-modals';

/** Monday of the week containing the date (YYYY-MM-DD). */
function mondayOf(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  return addDays(ymd, -((d.getUTCDay() + 6) % 7));
}

@Component({
  selector: 'app-agenda',
  imports: [AppointmentItemComponent, EmptyStateComponent, IconComponent, SkeletonListComponent, BookModalComponent, RescheduleModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .range { font-family: var(--font-display); font-size: 1.4rem; }
    .week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-bottom: 22px; }
    .wd {
      border: 1.5px solid var(--border); background: var(--surface); border-radius: 14px; padding: 10px 4px; cursor: pointer;
      text-align: center; transition: all .25s var(--ease); position: relative;
    }
    .wd:hover { border-color: var(--accent-line); }
    .wd.sel { border-color: var(--accent); box-shadow: var(--focus); }
    .wd.today .n { background: var(--ink); color: var(--ink-contrast); }
    .wd .dw { font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; color: var(--text-3); }
    .wd .n { font-family: var(--font-display); font-size: 1.35rem; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; margin: 4px auto; }
    .wd .c { font-size: .72rem; font-weight: 700; color: var(--accent); min-height: 1em; }
    .day-h { display: flex; align-items: baseline; gap: 10px; margin: 26px 0 10px; }
    .day-h h3 { font-size: 1.35rem; }
    .day-h span { font-size: .8rem; color: var(--text-3); }
    .list { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); overflow: hidden; }
    .list > app-appointment-item + app-appointment-item { border-top: 1px solid var(--border); }
  `,
  template: `
    <div class="page-head">
      <div><h1>Agenda</h1><p>Confirmez, déplacez ou planifiez les rendez-vous de vos patients.</p></div>
      <button class="btn btn-primary" (click)="booking.set(true)"><app-icon name="calendar-plus" [size]="17" /> Nouveau rendez-vous</button>
    </div>

    <div class="toolbar">
      <div class="row" style="--gap: 8px">
        <button class="btn btn-icon" (click)="shift(-7)" aria-label="Semaine précédente"><app-icon name="chevron-left" /></button>
        <button class="btn btn-sm" (click)="goToday()">Aujourd'hui</button>
        <button class="btn btn-icon" (click)="shift(7)" aria-label="Semaine suivante"><app-icon name="chevron-right" /></button>
        <span class="range">{{ rangeLabel() }}</span>
      </div>
      <div class="segmented" role="tablist" aria-label="Filtrer par statut">
        <button [class.active]="status() === ''" (click)="status.set('')">Tous</button>
        @for (s of statuses; track s) {
          <button [class.active]="status() === s" (click)="status.set(s)">{{ labels[s] }}</button>
        }
      </div>
    </div>

    <div class="week">
      @for (d of weekDays(); track d.ymd) {
        <button class="wd" [class.sel]="day() === d.ymd" [class.today]="d.ymd === todayStr" (click)="day.set(day() === d.ymd ? null : d.ymd)"
          [attr.aria-pressed]="day() === d.ymd">
          <div class="dw">{{ d.dow }}</div>
          <div class="n">{{ d.num }}</div>
          <div class="c">{{ d.count ? d.count + ' rdv' : '' }}</div>
        </button>
      }
    </div>

    @if (loading()) {
      <app-skeleton-list [count]="5" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="error" title="Agenda indisponible" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
        </app-empty-state>
      </div>
    } @else if (groups().length === 0) {
      <div class="card">
        <app-empty-state illustration="calendar" title="Aucun rendez-vous"
          [message]="status() ? 'Aucun rendez-vous « ' + labels[status() || 'PENDING'] + ' » sur cette période.' : 'Rien de prévu sur cette période.'">
          <button class="btn btn-primary" (click)="booking.set(true)">Planifier un rendez-vous</button>
        </app-empty-state>
      </div>
    } @else {
      @for (g of groups(); track g.ymd) {
        <div class="day-h"><h3>{{ g.label }}</h3><span>{{ g.items.length }} rendez-vous</span></div>
        <div class="list stagger">
          @for (a of g.items; track a.id) {
            <app-appointment-item [appointment]="a" [showPatient]="true">
              @switch (a.status) {
                @case ('PENDING') {
                  <button class="btn btn-sm btn-accent" (click)="act(a, 'CONFIRMED')"><app-icon name="check" [size]="14" /> Confirmer</button>
                  <button class="btn btn-sm" (click)="rescheduling.set(a)"><app-icon name="calendar-clock" [size]="14" /> Déplacer</button>
                  <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" title="Refuser" aria-label="Refuser"><app-icon name="x" [size]="14" /></button>
                }
                @case ('CONFIRMED') {
                  @if (isPast(a)) {
                    <button class="btn btn-sm" (click)="act(a, 'COMPLETED')"><app-icon name="check-circle" [size]="14" /> Terminé</button>
                    <button class="btn btn-sm" (click)="act(a, 'NO_SHOW')"><app-icon name="user-x" [size]="14" /> Absent</button>
                  } @else {
                    <button class="btn btn-sm" (click)="rescheduling.set(a)"><app-icon name="calendar-clock" [size]="14" /> Déplacer</button>
                  }
                  <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" title="Annuler" aria-label="Annuler"><app-icon name="x" [size]="14" /></button>
                }
                @default {
                  <button class="btn btn-sm btn-ghost btn-icon" (click)="remove(a)" title="Supprimer" aria-label="Supprimer"><app-icon name="trash" [size]="14" /></button>
                }
              }
            </app-appointment-item>
          }
        </div>
      }
    }

    <app-book-modal [open]="booking()" (closed)="booking.set(false)" (done)="booking.set(false); load()" />
    <app-reschedule-modal [appointment]="rescheduling()" (closed)="rescheduling.set(null)" (done)="rescheduling.set(null); load()" />
  `,
})
export class AgendaPage {
  private api = inject(DoctorApi);
  private actions = inject(AppointmentActions);
  /** Initial filter from ?statut=PENDING */
  readonly statut = input<string>();

  protected readonly labels = STATUS_LABELS;
  protected readonly statuses: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  protected readonly todayStr = todayYmd();
  protected readonly weekStart = signal(mondayOf(todayYmd()));
  protected readonly day = signal<string | null>(null);
  protected readonly status = linkedSignal<AppointmentStatus | ''>(() => (this.statut() as AppointmentStatus) ?? '');
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly booking = signal(false);
  protected readonly rescheduling = signal<Appointment | null>(null);

  protected readonly filtered = computed(() => this.appointments().filter((a) => !this.status() || a.status === this.status()));

  protected readonly weekDays = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const ymd = addDays(this.weekStart(), i);
      const d = new Date(`${ymd}T12:00:00Z`);
      return {
        ymd,
        dow: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', ''),
        num: d.getUTCDate(),
        count: this.filtered().filter((a) => ymdInZone(a.startAt) === ymd).length,
      };
    }),
  );

  protected readonly groups = computed(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of this.filtered()) {
      const k = ymdInZone(a.startAt);
      if (this.day() && k !== this.day()) continue;
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ymd, items]) => ({ ymd, label: formatDayLong(`${ymd}T12:00:00Z`), items }));
  });

  protected readonly rangeLabel = computed(() => {
    const f = (ymd: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...o }).format(new Date(`${ymd}T12:00:00Z`));
    const end = addDays(this.weekStart(), 6);
    return `${f(this.weekStart(), { day: 'numeric', month: 'short' })} – ${f(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  });

  constructor() {
    effect(() => {
      this.weekStart();
      untracked(() => this.load());
    });
  }

  shift(days: number) {
    this.day.set(null);
    this.weekStart.set(addDays(this.weekStart(), days));
  }

  goToday() {
    this.weekStart.set(mondayOf(todayYmd()));
    this.day.set(todayYmd());
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const from = zonedToInstant(this.weekStart(), '00:00').toISOString();
    const to = zonedToInstant(addDays(this.weekStart(), 7), '00:00').toISOString();
    this.api.appointments(from, to).subscribe({
      next: (list) => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  protected isPast(a: Appointment) {
    return new Date(a.startAt) < new Date();
  }

  async act(a: Appointment, status: AppointmentStatus) {
    const updated = await this.actions.setStatus(a, status);
    if (updated) this.appointments.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
  }

  async remove(a: Appointment) {
    if (await this.actions.remove(a)) this.appointments.update((l) => l.filter((x) => x.id !== a.id));
  }
}
