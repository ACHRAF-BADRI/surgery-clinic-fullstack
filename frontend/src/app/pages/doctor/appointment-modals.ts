import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { DoctorApi, PublicApi } from '../../core/api';
import { errorMessage, formatDateTime, ymdInZone, todayYmd } from '../../core/format';
import { Appointment, AppointmentType, Patient } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { IconComponent } from '../../ui/icon';
import { ModalComponent } from '../../ui/modal';
import { SlotPickerComponent } from './slot-picker';

/** Appointment rescheduling by the doctor. */
@Component({
  selector: 'app-reschedule-modal',
  imports: [FormsModule, ModalComponent, SlotPickerComponent, IconComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="!!appointment()" title="Déplacer le rendez-vous" width="620px"
      [subtitle]="appointment() ? appointment()!.patient.name + ' · actuellement ' + when(appointment()!.startAt) : ''" (closed)="closed.emit()">
      @if (appointment(); as a) {
        <div class="stack" style="--gap: 18px">
          <app-slot-picker [type]="a.type" [excludeId]="a.id" [(date)]="date" [(value)]="value" />
          <div class="field">
            <label class="label" for="rs-reason">Motif (note interne)</label>
            <input id="rs-reason" class="input" [(ngModel)]="reason" placeholder="Ex. : bloc opératoire décalé" maxlength="300" />
          </div>
          @if (a.patient.email) {
            <label class="check"><input type="checkbox" [(ngModel)]="notify" /> Prévenir le patient par email ({{ a.patient.email }})</label>
          } @else {
            <app-banner tone="warning" icon="phone">Ce patient n'a pas d'email : pensez à le prévenir par téléphone{{ a.patient.phone ? ' (' + a.patient.phone + ')' : '' }}.</app-banner>
          }
        </div>
      }
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">Annuler</button>
        <button class="btn btn-primary" type="button" [disabled]="!value() || saving()" [class.is-loading]="saving()" (click)="save()">
          <app-icon name="calendar-clock" [size]="16" /> Déplacer
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class RescheduleModalComponent {
  private api = inject(DoctorApi);
  private toast = inject(ToastService);
  readonly appointment = input<Appointment | null>(null);
  readonly done = output<Appointment>();
  readonly closed = output<void>();

  protected readonly date = linkedSignal(() => {
    const a = this.appointment();
    return a && a.startAt > new Date().toISOString() ? ymdInZone(a.startAt) : todayYmd();
  });
  protected readonly value = linkedSignal<string | null>(() => (this.appointment(), null));
  protected readonly reason = linkedSignal(() => (this.appointment(), ''));
  protected readonly notify = linkedSignal(() => !!this.appointment()?.patient.email);
  protected readonly saving = signal(false);
  protected readonly when = formatDateTime;

  save() {
    const a = this.appointment();
    const v = this.value();
    if (!a || !v) return;
    this.saving.set(true);
    this.api.reschedule(a.id, v, this.reason(), this.notify()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.toast.success('Rendez-vous déplacé', `Nouveau créneau : ${formatDateTime(updated.startAt)}`);
        this.done.emit(updated);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error('Déplacement impossible', errorMessage(e));
      },
    });
  }
}

/** Appointment booking by the doctor, for a patient with or without an account. */
@Component({
  selector: 'app-book-modal',
  imports: [FormsModule, ModalComponent, SlotPickerComponent, IconComponent, AvatarComponent, BadgeComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .results { border: 1px solid var(--border); border-radius: 12px; max-height: 220px; overflow-y: auto; margin-top: 6px; }
    .res { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--border); background: var(--surface); cursor: pointer; text-align: left; }
    .res:last-child { border-bottom: 0; }
    .res:hover { background: var(--surface-2); }
    .res .n { font-weight: 700; font-size: .88rem; }
    .res .s { font-size: .76rem; color: var(--text-3); }
    .picked { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); }
  `,
  template: `
    <app-modal [open]="open()" title="Planifier un rendez-vous" subtitle="Le rendez-vous est directement confirmé." width="660px" (closed)="closed.emit()">
      <div class="stack" style="--gap: 18px">
        <div class="field">
          <span class="label">Patient</span>
          @if (selected(); as p) {
            <div class="picked">
              <app-avatar [name]="p.firstName + ' ' + p.lastName" [size]="38" />
              <div style="flex: 1">
                <div style="font-weight: 700">{{ p.firstName }} {{ p.lastName }}</div>
                <div class="muted" style="font-size: .8rem">{{ p.email || p.phone || 'Aucune coordonnée' }}</div>
              </div>
              @if (!p.hasAccount) {
                <app-badge tone="warning" icon="user-x" size="sm">Sans compte</app-badge>
              }
              @if (!patient()) {
                <button class="btn btn-ghost btn-sm" type="button" (click)="selected.set(null)">Changer</button>
              }
            </div>
          } @else {
            <div class="input-icon">
              <app-icon name="search" [size]="17" />
              <input class="input" placeholder="Rechercher par nom, email ou téléphone…" [ngModel]="query()" (ngModelChange)="search($event)" />
            </div>
            @if (results().length) {
              <div class="results">
                @for (p of results(); track p.id) {
                  <button class="res" type="button" (click)="selected.set(p)">
                    <app-avatar [name]="p.firstName + ' ' + p.lastName" [size]="32" />
                    <span style="flex: 1"><span class="n">{{ p.firstName }} {{ p.lastName }}</span><br /><span class="s">{{ p.email || p.phone || '—' }}</span></span>
                    @if (!p.hasAccount) {
                      <app-badge tone="warning" size="sm">Sans compte</app-badge>
                    }
                  </button>
                }
              </div>
            } @else if (query().length >= 2) {
              <span class="field-hint">Aucun patient trouvé. Créez d'abord le dossier depuis la page Patients.</span>
            }
          }
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label" for="bk-type">Motif</label>
            <select id="bk-type" class="select" [(ngModel)]="type">
              @for (t of types(); track t.code) {
                <option [value]="t.code">{{ t.label }} ({{ t.durationMinutes }} min)</option>
              }
            </select>
          </div>
          <div class="field">
            <label class="label" for="bk-proc">Intervention</label>
            <select id="bk-proc" class="select" [(ngModel)]="procedure">
              <option value="">— Aucune —</option>
              @for (p of procedures(); track p.code) {
                <option [value]="p.code">{{ p.label }}</option>
              }
            </select>
          </div>
        </div>

        <app-slot-picker [type]="type()" [(date)]="date" [(value)]="value" />

        <div class="field">
          <label class="label" for="bk-note">Note interne</label>
          <textarea id="bk-note" class="textarea" style="min-height: 80px" [(ngModel)]="note" maxlength="1000"></textarea>
        </div>
        @if (selected(); as p) {
          @if (p.email) {
            <label class="check"><input type="checkbox" [(ngModel)]="notify" /> Envoyer une confirmation par email ({{ p.email }})</label>
          } @else {
            <app-banner tone="warning" icon="phone">Patient sans email : la confirmation devra se faire par téléphone.</app-banner>
          }
        }
      </div>
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">Annuler</button>
        <button class="btn btn-primary" type="button" [disabled]="!selected() || !value() || saving()" [class.is-loading]="saving()" (click)="save()">
          <app-icon name="calendar-plus" [size]="16" /> Planifier
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class BookModalComponent {
  private api = inject(DoctorApi);
  private toast = inject(ToastService);
  readonly open = input(false);
  /** Fixed patient (when opened from their record). */
  readonly patient = input<Patient | null>(null);
  readonly done = output<Appointment>();
  readonly closed = output<void>();

  private readonly clinic = toSignal(inject(PublicApi).clinic().pipe(catchError(() => of(null))), { initialValue: null });
  protected readonly types = computed(() => this.clinic()?.appointmentTypes ?? []);
  protected readonly procedures = computed(() => this.clinic()?.procedures ?? []);

  protected readonly selected = linkedSignal<Patient | null>(() => this.patient());
  protected readonly type = signal<AppointmentType>('FIRST_CONSULTATION');
  protected readonly procedure = signal('');
  protected readonly date = signal(todayYmd());
  protected readonly value = signal<string | null>(null);
  protected readonly note = signal('');
  protected readonly notify = linkedSignal(() => !!this.selected()?.email);
  protected readonly saving = signal(false);
  protected readonly query = signal('');
  protected readonly results = signal<Patient[]>([]);
  private search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntilDestroyed(),
        switchMap((q) => (q.length < 2 ? of({ items: [] as Patient[] }) : this.api.patients(q, '', 0, 8).pipe(catchError(() => of({ items: [] as Patient[] }))))),
      )
      .subscribe((r) => this.results.set(r.items));
    // Reset the form each time the modal opens.
    effect(() => {
      if (this.open())
        untracked(() => {
          this.value.set(null);
          this.note.set('');
          this.query.set('');
          this.results.set([]);
          this.selected.set(this.patient());
        });
    });
  }

  search(q: string) {
    this.query.set(q);
    this.search$.next(q.trim());
  }

  save() {
    const p = this.selected();
    const v = this.value();
    if (!p || !v) return;
    this.saving.set(true);
    this.api
      .book({ patientId: p.id, type: this.type(), procedure: this.procedure() || null, startAt: v, note: this.note() || undefined, notifyPatient: this.notify() })
      .subscribe({
        next: (a) => {
          this.saving.set(false);
          this.toast.success('Rendez-vous planifié', `${a.patient.name} · ${formatDateTime(a.startAt)}`);
          this.done.emit(a);
        },
        error: (e) => {
          this.saving.set(false);
          this.toast.error('Planification impossible', errorMessage(e));
        },
      });
  }
}
