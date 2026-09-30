import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientApi, PublicApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { addDays, errorCode, errorMessage, formatDayLong, formatTime, formatYmd, todayYmd } from '../../core/format';
import { I18n, TKey, TranslatePipe } from '../../core/i18n/i18n';
import { Appointment, AppointmentType, ClinicInfo, Slot } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { IllustrationComponent } from '../../ui/illustration';
import { SkeletonComponent } from '../../ui/skeleton';

const DRAFT_KEY = 'booking.draft';

interface Draft {
  type: AppointmentType | null;
  procedure: string;
  doctorId: string;
  date: string;
  slot: Slot | null;
  note: string;
}

@Component({
  selector: 'app-booking',
  imports: [FormsModule, RouterLink, IconComponent, BadgeComponent, BannerComponent, EmptyStateComponent, IllustrationComponent, SkeletonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .top { max-width: 720px; margin-bottom: 32px; }
    .top h1 { margin: 14px 0 12px; }
    .layout { display: grid; gap: 28px; align-items: start; }
    .layout > * { min-width: 0; }
    @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 340px; } }
    .steps { display: flex; gap: 8px; margin-bottom: 24px; }
    .steps button {
      flex: 1; display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; cursor: pointer;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-3); font-weight: 600; font-size: .84rem; text-align: left;
      transition: all .3s var(--ease);
    }
    .steps button:disabled { cursor: not-allowed; }
    .steps .n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid currentColor; font-size: .78rem; flex-shrink: 0; }
    .steps .on { color: var(--text); border-color: var(--accent); box-shadow: var(--focus); }
    .steps .done { color: var(--accent); }
    .steps .done .n { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); }
    @media (max-width: 640px) { .steps .t { display: none; } .steps button { justify-content: center; } }
    .panel { animation: fade-up .45s var(--ease) both; }
    .types { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
    .type {
      text-align: left; padding: 18px; border-radius: 16px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer;
      display: flex; flex-direction: column; gap: 6px; transition: all .25s var(--ease);
    }
    .type:hover { border-color: var(--accent-line); transform: translateY(-2px); }
    .type.sel { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--focus); }
    .type strong { font-size: .95rem; }
    .type span { font-size: .8rem; color: var(--text-3); display: inline-flex; align-items: center; gap: 6px; }
    .days { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 12px; scroll-snap-type: x mandatory; }
    .day {
      scroll-snap-align: start; flex: 0 0 74px; padding: 12px 6px; border-radius: 16px; border: 1.5px solid var(--border);
      background: var(--surface); cursor: pointer; text-align: center; transition: all .25s var(--ease);
    }
    .day:hover:not(:disabled) { border-color: var(--accent-line); }
    .day:disabled { opacity: .4; cursor: not-allowed; }
    .day.sel { background: var(--ink); color: var(--ink-contrast); border-color: var(--ink); }
    .day .dow { font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; opacity: .7; }
    .day .d { font-family: var(--font-display); font-size: 1.7rem; line-height: 1.1; }
    .day .m { font-size: .72rem; opacity: .7; }
    .slots { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); margin-top: 8px; }
    .slot {
      padding: 11px 0; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer;
      font-weight: 700; font-size: .9rem; font-variant-numeric: tabular-nums; transition: all .2s var(--ease); animation: scale-in .35s var(--ease) both;
    }
    .slot:hover { border-color: var(--accent); color: var(--accent); }
    .slot.sel { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); }
    .summary { position: sticky; top: calc(var(--header-h) + 16px); }
    .summary dl { display: grid; gap: 14px; margin: 0; }
    .summary dt { font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); }
    .summary dd { margin: 2px 0 0; font-weight: 600; }
    .nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; flex-wrap: wrap; }
    .gate { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px 0; }
    .gate h3 { font-size: 1.6rem; }
    .gate p { color: var(--text-2); max-width: 440px; }
  `,
  template: `
    <section class="section" style="padding-top: 48px">
      <div class="container">
        <div class="top animate-in">
          <span class="eyebrow">{{ 'booking.eyebrow' | t }}</span>
          <h1>{{ 'booking.title' | t }}</h1>
          <p class="lead">{{ 'booking.lead' | t }}</p>
        </div>

        @if (auth.role() === 'DOCTOR' || auth.role() === 'ADMIN') {
          <app-banner tone="info" [title]="'contact.staffTitle' | t" style="margin-bottom: 24px; display: block">
            {{ 'booking.staffText' | t }}
            <div actions><a class="btn btn-primary btn-sm" routerLink="/cabinet/patients">{{ 'booking.openPatients' | t }}</a></div>
          </app-banner>
        }

        @if (booked(); as b) {
          <div class="card card-pad">
            <app-empty-state illustration="success" [title]="'booking.sentTitle' | t"
              [message]="'booking.sentMessage' | t: { date: dayLong(b.startAt), time: time(b.startAt) }">
              <a class="btn btn-primary" routerLink="/espace/rendez-vous">{{ 'booking.seeAppointments' | t }}</a>
              <button class="btn" (click)="restart()">{{ 'booking.newRequest' | t }}</button>
            </app-empty-state>
          </div>
        } @else if (loadError()) {
          <div class="card">
            <app-empty-state illustration="offline" [title]="'booking.unavailable' | t" [message]="loadError()!">
              <button class="btn btn-primary" (click)="loadClinic()"><app-icon name="refresh" [size]="16" /> {{ 'common.retry' | t }}</button>
            </app-empty-state>
          </div>
        } @else {
          <div class="layout">
            <div>
              <div class="steps" role="tablist">
                @for (s of stepLabels; track $index; let i = $index) {
                  <button type="button" role="tab" [class.on]="step() === i" [class.done]="step() > i"
                    [disabled]="i > maxStep()" (click)="step.set(i)">
                    <span class="n">@if (step() > i) {<app-icon name="check" [size]="13" [stroke]="3" />} @else {{{ i + 1 }}}</span>
                    <span class="t">{{ s | t }}</span>
                  </button>
                }
              </div>

              <div class="card card-pad">
                @switch (step()) {
                  @case (0) {
                    <div class="panel stack" style="--gap: 22px">
                      <div>
                        <h3 style="margin-bottom: 14px">{{ 'booking.reason' | t }}</h3>
                        @if (!clinic()) {
                          <div class="types">
                            @for (i of [1, 2, 3, 4]; track i) {
                              <app-skeleton height="76px" rounded="16px" />
                            }
                          </div>
                        } @else {
                          <div class="types stagger">
                            @for (t of clinic()!.appointmentTypes; track t.code) {
                              <button type="button" class="type" [class.sel]="draft().type === t.code" (click)="patch({ type: t.code, slot: null })">
                                <strong>{{ i18n.apptType(t.code) }}</strong>
                                <span><app-icon name="clock" [size]="13" /> {{ 'common.minutes' | t: { n: t.durationMinutes } }}</span>
                              </button>
                            }
                          </div>
                        }
                      </div>
                      <div class="form-grid">
                        <div class="field">
                          <label class="label" for="procedure">{{ 'booking.procedure' | t }}</label>
                          <select id="procedure" class="select" [ngModel]="draft().procedure" (ngModelChange)="patch({ procedure: $event })">
                            <option value="">{{ 'booking.procedureUnknown' | t }}</option>
                            @for (p of clinic()?.procedures ?? []; track p.code) {
                              <option [value]="p.code">{{ i18n.procedure(p.code) }}</option>
                            }
                          </select>
                        </div>
                        @if ((clinic()?.doctors?.length ?? 0) > 1) {
                          <div class="field">
                            <label class="label" for="doctor">{{ 'booking.practitioner' | t }}</label>
                            <select id="doctor" class="select" [ngModel]="draft().doctorId" (ngModelChange)="patch({ doctorId: $event, slot: null })">
                              @for (d of clinic()!.doctors; track d.id) {
                                <option [value]="d.id">{{ d.name }}</option>
                              }
                            </select>
                          </div>
                        }
                      </div>
                    </div>
                  }
                  @case (1) {
                    <div class="panel">
                      <h3 style="margin-bottom: 14px">{{ 'booking.pickDate' | t }}</h3>
                      <div class="days">
                        @for (d of days(); track d.ymd) {
                          <button type="button" class="day" [class.sel]="draft().date === d.ymd" [disabled]="d.closed" (click)="pickDay(d.ymd)">
                            <div class="dow">{{ d.dow }}</div>
                            <div class="d">{{ d.day }}</div>
                            <div class="m">{{ d.month }}</div>
                          </button>
                        }
                      </div>
                      <h3 style="margin: 18px 0 6px">{{ 'booking.slots' | t }}</h3>
                      @if (!draft().date) {
                        <p class="muted">{{ 'booking.pickDateFirst' | t }}</p>
                      } @else if (slotsLoading()) {
                        <div class="slots">
                          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
                            <app-skeleton height="44px" rounded="12px" />
                          }
                        </div>
                      } @else if (slotsError()) {
                        <app-empty-state [compact]="true" illustration="error" [title]="'booking.slotsError' | t" [message]="slotsError()!">
                          <button class="btn btn-sm" (click)="loadSlots()">{{ 'common.retry' | t }}</button>
                        </app-empty-state>
                      } @else if (slots().length === 0) {
                        <app-empty-state [compact]="true" illustration="calendar" [title]="'booking.noSlots' | t" [message]="'booking.noSlotsText' | t" />
                      } @else {
                        <div class="slots">
                          @for (s of slots(); track s.startAt; let i = $index) {
                            <button type="button" class="slot" [class.sel]="draft().slot?.startAt === s.startAt"
                              [style.animation-delay.ms]="i * 20" (click)="patch({ slot: s })">{{ time(s.startAt) }}</button>
                          }
                        </div>
                      }
                    </div>
                  }
                  @case (2) {
                    <div class="panel">
                      @if (!auth.isLoggedIn()) {
                        <div class="gate">
                          <app-illustration kind="lock" [size]="170" />
                          <h3>{{ 'booking.gateTitle' | t }}</h3>
                          <p>{{ 'booking.gateText' | t }}</p>
                          <div class="row" style="justify-content: center; margin-top: 8px">
                            <a class="btn btn-primary" routerLink="/inscription" [queryParams]="{ returnUrl: '/rendez-vous' }">
                              <app-icon name="user-plus" [size]="16" /> {{ 'booking.createAccount' | t }}
                            </a>
                            <a class="btn" routerLink="/connexion" [queryParams]="{ returnUrl: '/rendez-vous' }">
                              <app-icon name="log-in" [size]="16" /> {{ 'booking.haveAccount' | t }}
                            </a>
                          </div>
                          <p class="muted" style="font-size: .82rem; margin-top: 10px">
                            {{ 'booking.simpleQuestion' | t }} <a class="link" routerLink="/contact">{{ 'booking.writeWithoutAccount' | t }}</a>.
                          </p>
                        </div>
                      } @else {
                        <h3 style="margin-bottom: 14px">{{ 'booking.noteTitle' | t }}</h3>
                        <div class="field">
                          <label class="label" for="note">{{ 'booking.noteLabel' | t }}</label>
                          <textarea id="note" class="textarea" maxlength="1000" [ngModel]="draft().note" (ngModelChange)="patch({ note: $event })"
                            [placeholder]="'booking.notePlaceholder' | t"></textarea>
                          <span class="field-hint">{{ 'booking.noteHint' | t }}</span>
                        </div>
                        @if (auth.role() === 'PATIENT') {
                          <app-banner tone="info" style="display: block; margin-top: 18px">
                            {{ 'booking.pendingInfo' | t }}
                          </app-banner>
                        }
                      }
                    </div>
                  }
                }

                <div class="nav">
                  <button class="btn btn-ghost" type="button" [style.visibility]="step() > 0 ? 'visible' : 'hidden'" (click)="step.set(step() - 1)">
                    <app-icon name="arrow-left" [size]="16" /> {{ 'common.back' | t }}
                  </button>
                  @if (step() < 2) {
                    <button class="btn btn-primary" type="button" [disabled]="maxStep() <= step()" (click)="step.set(step() + 1)">
                      {{ 'common.continue' | t }} <app-icon name="arrow-right" [size]="16" />
                    </button>
                  } @else if (auth.role() === 'PATIENT') {
                    <button class="btn btn-accent btn-lg" type="button" [class.is-loading]="submitting()" [disabled]="submitting() || !draft().slot" (click)="confirm()">
                      <app-icon name="check" [size]="16" /> {{ 'booking.confirm' | t }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <aside class="card card-pad summary">
              <div class="card-title"><h3>{{ 'booking.summary' | t }}</h3><app-icon name="file" class="muted" /></div>
              <dl>
                <div><dt>{{ 'booking.summaryReason' | t }}</dt><dd>{{ draft().type ? i18n.apptType(draft().type) : '—' }}</dd></div>
                <div><dt>{{ 'booking.summaryProcedure' | t }}</dt><dd>{{ draft().procedure ? i18n.procedure(draft().procedure) : ('booking.notSpecified' | t) }}</dd></div>
                <div><dt>{{ 'booking.summaryDate' | t }}</dt><dd>{{ draft().date ? dayLong(draft().date + 'T12:00:00Z') : '—' }}</dd></div>
                <div>
                  <dt>{{ 'booking.summaryTime' | t }}</dt>
                  <dd>
                    @if (draft().slot) {
                      <app-badge tone="accent" icon="clock">{{ time(draft().slot!.startAt) }}</app-badge>
                    } @else {
                      —
                    }
                  </dd>
                </div>
              </dl>
              <hr class="divider" />
              <p class="muted" style="font-size: .8rem">
                {{ 'booking.cancelPolicy' | t }}
              </p>
            </aside>
          </div>
        }
      </div>
    </section>
  `,
})
export class BookingPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private publicApi = inject(PublicApi);
  private patientApi = inject(PatientApi);
  private toast = inject(ToastService);
  protected readonly i18n = inject(I18n);

  /** Pre-selection from ?intervention=CODE */
  readonly intervention = input<string>();

  protected readonly stepLabels: TKey[] = ['booking.stepReason', 'booking.stepDate', 'booking.stepConfirm'];
  protected readonly step = signal(0);
  protected readonly clinic = signal<ClinicInfo | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ type: null, procedure: '', doctorId: '', date: '', slot: null, note: '' });
  protected readonly slots = signal<Slot[]>([]);
  protected readonly slotsLoading = signal(false);
  protected readonly slotsError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly booked = signal<Appointment | null>(null);

  protected readonly maxStep = computed(() => (!this.draft().type ? 0 : !this.draft().slot ? 1 : 2));

  protected readonly dayLong = formatDayLong;
  protected readonly time = formatTime;

  /** Next 28 days; closed days come from the clinic's opening hours (Monday first). */
  protected readonly days = computed(() => {
    const hours = this.clinic()?.openingHours ?? [];
    return Array.from({ length: 28 }, (_, i) => {
      const ymd = addDays(todayYmd(), i);
      const d = new Date(`${ymd}T12:00:00Z`);
      const h = hours[(d.getUTCDay() + 6) % 7];
      const closed = !!h && !h.open;
      return { ymd, dow: formatYmd(ymd, { weekday: 'short' }).replace('.', ''), day: formatYmd(ymd, { day: 'numeric' }), month: formatYmd(ymd, { month: 'short' }), closed };
    });
  });

  ngOnInit() {
    this.restoreDraft();
    if (this.intervention()) this.patch({ procedure: this.intervention()! });
    this.loadClinic();
  }

  loadClinic() {
    this.loadError.set(null);
    this.publicApi.resetClinicCache();
    this.publicApi.clinic().subscribe({
      next: (c) => {
        this.clinic.set(c);
        if (!this.draft().doctorId && c.doctors.length) this.patch({ doctorId: c.doctors[0].id });
        if (this.draft().date) this.loadSlots();
      },
      error: (e) => this.loadError.set(errorMessage(e)),
    });
  }

  patch(p: Partial<Draft>) {
    this.draft.update((d) => ({ ...d, ...p }));
    if ('type' in p || 'doctorId' in p) {
      if (this.draft().date) this.loadSlots();
    }
    this.saveDraft();
  }

  pickDay(ymd: string) {
    this.patch({ date: ymd, slot: null });
    this.loadSlots();
  }

  loadSlots() {
    const d = this.draft();
    if (!d.date) return;
    this.slotsLoading.set(true);
    this.slotsError.set(null);
    this.publicApi.availability(d.date, d.type ?? undefined, d.doctorId || undefined).subscribe({
      next: (a) => {
        this.slots.set(a.slots);
        this.slotsLoading.set(false);
        // The saved slot is no longer offered: clear it.
        const sel = this.draft().slot;
        if (sel && !a.slots.some((s) => s.startAt === sel.startAt)) this.patch({ slot: null });
      },
      error: (e) => {
        this.slotsError.set(errorMessage(e));
        this.slotsLoading.set(false);
      },
    });
  }

  confirm() {
    const d = this.draft();
    if (!d.type || !d.slot) return;
    this.submitting.set(true);
    this.patientApi
      .book({ type: d.type, procedure: d.procedure || null, startAt: d.slot.startAt, doctorId: d.doctorId || null, note: d.note || undefined })
      .subscribe({
        next: (a) => {
          this.submitting.set(false);
          this.booked.set(a);
          this.clearDraft();
          this.toast.success(this.i18n.t('booking.toastSent'), this.i18n.t('booking.toastSentText'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (e) => {
          this.submitting.set(false);
          this.toast.error(this.i18n.t('booking.toastError'), errorMessage(e));
          if (errorCode(e) === 'SLOT_UNAVAILABLE') {
            this.step.set(1);
            this.loadSlots();
          }
        },
      });
  }

  restart() {
    this.booked.set(null);
    this.draft.set({ type: null, procedure: '', doctorId: this.clinic()?.doctors[0]?.id ?? '', date: '', slot: null, note: '' });
    this.step.set(0);
    this.slots.set([]);
  }

  private saveDraft() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(this.draft()));
    } catch {}
  }

  private clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  private restoreDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      if (d.date && d.date < todayYmd()) {
        d.date = '';
        d.slot = null;
      }
      this.draft.set(d);
      this.step.set(this.maxStep());
    } catch {}
  }
}
