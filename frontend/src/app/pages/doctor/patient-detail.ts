import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DoctorApi } from '../../core/api';
import { ConfirmService } from '../../core/confirm.service';
import { age, errorMessage, formatDate, formatDateTime } from '../../core/format';
import { Appointment, AppointmentStatus, Patient } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AppointmentItemComponent } from '../../ui/appointment-item';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { ModalComponent } from '../../ui/modal';
import { SkeletonComponent, SkeletonListComponent } from '../../ui/skeleton';
import { AppointmentActions } from './appointment-actions';
import { BookModalComponent, RescheduleModalComponent } from './appointment-modals';
import { PatientFormModalComponent } from './patient-form-modal';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';

@Component({
  selector: 'app-patient-detail',
  imports: [
    FormsModule, RouterLink, AvatarComponent, BadgeComponent, BannerComponent, EmptyStateComponent, IconComponent, SkeletonComponent,
    SkeletonListComponent, AppointmentItemComponent, BookModalComponent, RescheduleModalComponent, PatientFormModalComponent, ModalComponent, TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .hero { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 24px; }
    .hero .t { flex: 1; min-width: 240px; }
    .hero h1 { font-size: clamp(2rem, 3.5vw, 2.6rem); }
    .hero .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .layout { display: grid; gap: 20px; align-items: start; }
    @media (min-width: 1100px) { .layout { grid-template-columns: 360px 1fr; } }
    .notes { white-space: pre-wrap; font-size: .9rem; color: var(--text-2); }
    .list > app-appointment-item + app-appointment-item { border-top: 1px solid var(--border); }
    .card-head { padding: 20px 22px 8px; }
  `,
  template: `
    <a class="btn btn-ghost btn-sm" routerLink="/cabinet/patients" style="margin-bottom: 16px"><app-icon name="arrow-left" [size]="15" /> {{ 'patients.title' | t }}</a>

    @if (loading()) {
      <div class="hero">
        <app-skeleton width="84px" height="84px" [circle]="true" />
        <div class="t stack" style="--gap: 10px"><app-skeleton width="260px" height="32px" /><app-skeleton width="180px" /></div>
      </div>
      <app-skeleton-list [count]="4" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="notfound" [title]="'patientDetail.notFound' | t" [message]="error()!">
          <a class="btn btn-primary" routerLink="/cabinet/patients">{{ 'patientDetail.backToPatients' | t }}</a>
        </app-empty-state>
      </div>
    } @else if (patient(); as p) {
      <div class="hero animate-in">
        <app-avatar [name]="p.firstName + ' ' + p.lastName" [size]="84" [muted]="p.status === 'RESTRICTED'" />
        <div class="t">
          <h1>{{ p.firstName }} {{ p.lastName }}</h1>
          <div class="badges">
            @if (p.hasAccount) {
              <app-badge tone="success" icon="user-check">{{ 'badges.activeAccount' | t }}</app-badge>
            } @else {
              <app-badge tone="warning" icon="user-x">{{ 'badges.noAccount' | t }}</app-badge>
            }
            @if (p.invitationPending) {
              <app-badge tone="info" icon="mail" [outline]="true">{{ 'badges.invited' | t }}</app-badge>
            }
            @if (p.status === 'RESTRICTED') {
              <app-badge tone="danger" icon="ban">{{ 'badges.restrictedAccount' | t }}</app-badge>
            }
            <app-badge [outline]="true">{{ 'agenda.count' | t: { n: p.appointmentCount } }}</app-badge>
          </div>
        </div>
        <div class="row" style="--gap: 8px">
          <button class="btn btn-primary" (click)="booking.set(true)"><app-icon name="calendar-plus" [size]="16" /> {{ 'book.submit' | t }}</button>
          @if (p.hasAccount || p.email) {
            <button class="btn" (click)="writing.set(true)"><app-icon name="message" [size]="16" /> {{ 'patientDetail.write' | t }}</button>
          }
          <button class="btn" (click)="editing.set(true)"><app-icon name="edit" [size]="16" /> {{ 'common.edit' | t }}</button>
          @if (!p.hasAccount) {
            <button class="btn btn-danger btn-icon" (click)="remove(p)" [title]="'patientDetail.deleteFile' | t" [attr.aria-label]="'patientDetail.deleteFile' | t"><app-icon name="trash" [size]="16" /></button>
          }
        </div>
      </div>

      @if (!p.hasAccount) {
        <app-banner tone="warning" [title]="'patientDetail.noAccountTitle' | t" icon="user-x" style="display: block; margin-bottom: 20px">
          {{ 'patientDetail.noAccountText' | t }}
          {{ (p.email ? 'patientDetail.noAccountInvite' : 'patientDetail.noAccountAddEmail') | t }}
          <div actions>
            @if (p.email) {
              <button class="btn btn-sm btn-primary" [class.is-loading]="inviting()" (click)="invite(p)">
                <app-icon name="send" [size]="14" /> {{ (p.invitationPending ? 'patientDetail.resendInvite' : 'patientDetail.invite') | t }}
              </button>
            } @else {
              <button class="btn btn-sm" (click)="editing.set(true)">{{ 'patientDetail.addEmail' | t }}</button>
            }
          </div>
        </app-banner>
      }

      <div class="layout">
        <div class="stack" style="--gap: 20px">
          <div class="card card-pad">
            <div class="card-title"><h3>{{ 'patients.colContact' | t }}</h3><app-icon name="user" class="muted" /></div>
            <dl class="kv">
              <dt>{{ 'common.email' | t }}</dt>
              <dd>@if (p.email) {<a class="link" [href]="'mailto:' + p.email">{{ p.email }}</a>} @else {—}</dd>
              <dt>{{ 'common.phone' | t }}</dt>
              <dd>@if (p.phone) {<a class="link" [href]="'tel:' + p.phone">{{ p.phone }}</a>} @else {—}</dd>
              <dt>{{ 'patientDetail.birth' | t }}</dt>
              <dd>{{ p.dateOfBirth ? d(p.dateOfBirth) + ' (' + ('patients.age' | t: { n: ageOf(p) }) + ')' : '—' }}</dd>
              <dt>{{ 'common.gender' | t }}</dt>
              <dd>{{ p.gender ? i18n.t(p.gender === 'F' ? 'common.genderF' : p.gender === 'M' ? 'common.genderM' : 'common.genderX') : '—' }}</dd>
              <dt>{{ 'common.address' | t }}</dt>
              <dd>{{ p.address || '—' }}@if (p.postalCode || p.city) {<br />{{ p.postalCode }} {{ p.city }}}</dd>
              <dt>{{ 'patientDetail.created' | t }}</dt>
              <dd>{{ d(p.createdAt) }}</dd>
              <dt>{{ 'profile.lastLogin' | t }}</dt>
              <dd>{{ p.lastLoginAt ? dt(p.lastLoginAt) : ('patientDetail.never' | t) }}</dd>
            </dl>
          </div>
          <div class="card card-pad">
            <div class="card-title"><h3>{{ 'patientDetail.notes' | t }}</h3><app-badge size="sm" icon="lock">{{ 'patientDetail.private' | t }}</app-badge></div>
            @if (p.medicalNotes) {
              <p class="notes">{{ p.medicalNotes }}</p>
            } @else {
              <p class="muted">{{ 'patientDetail.noNotes' | t }} <button class="link" style="border: 0; background: none; cursor: pointer; padding: 0" (click)="editing.set(true)">{{ 'common.add' | t }}</button></p>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-head card-title"><h3>{{ 'patientDetail.appointments' | t }}</h3></div>
          @if (apptLoading()) {
            <app-skeleton-list [count]="3" [avatar]="false" [framed]="false" />
          } @else if (appointments().length === 0) {
            <app-empty-state [compact]="true" illustration="calendar" [title]="'agenda.emptyTitle' | t" [message]="'patientDetail.noAppointmentsText' | t">
              <button class="btn btn-sm btn-primary" (click)="booking.set(true)">{{ 'book.submit' | t }}</button>
            </app-empty-state>
          } @else {
            <div class="list">
              @for (a of appointments(); track a.id) {
                <app-appointment-item [appointment]="a">
                  @if (a.status === 'PENDING') {
                    <button class="btn btn-sm btn-accent" (click)="act(a, 'CONFIRMED')"><app-icon name="check" [size]="14" /> {{ 'common.confirm' | t }}</button>
                  }
                  @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                    <button class="btn btn-sm" (click)="rescheduling.set(a)"><app-icon name="calendar-clock" [size]="14" /> {{ 'reschedule.submit' | t }}</button>
                    <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" [title]="'common.cancel' | t" [attr.aria-label]="'common.cancel' | t"><app-icon name="x" [size]="14" /></button>
                  }
                </app-appointment-item>
              }
            </div>
          }
        </div>
      </div>

      <app-patient-form-modal [open]="editing()" [patient]="p" (closed)="editing.set(false)" (saved)="patient.set($event); editing.set(false)" />
      <app-book-modal [open]="booking()" [patient]="p" (closed)="booking.set(false)" (done)="booking.set(false); reload()" />
      <app-modal [open]="writing()" [title]="'patientDetail.writeTitle' | t" [subtitle]="p.hasAccount ? ('patientDetail.writeAccount' | t) : ('patientDetail.writeEmail' | t: { email: p.email })" (closed)="writing.set(false)">
        <div class="stack" style="--gap: 16px">
          <div class="field">
            <label class="label" for="w-subject">{{ 'contact.subject' | t }}</label>
            <input id="w-subject" class="input" [(ngModel)]="msgSubject" maxlength="150" />
          </div>
          <div class="field">
            <label class="label" for="w-body">{{ 'contact.message' | t }}</label>
            <textarea id="w-body" class="textarea" [(ngModel)]="msgBody" rows="6" maxlength="5000"></textarea>
          </div>
        </div>
        <ng-container footer>
          <button class="btn btn-ghost" (click)="writing.set(false)">{{ 'common.cancel' | t }}</button>
          <button class="btn btn-primary" [disabled]="!msgSubject().trim() || !msgBody().trim() || sending()" [class.is-loading]="sending()" (click)="write(p)">
            <app-icon name="send" [size]="15" /> {{ 'common.send' | t }}
          </button>
        </ng-container>
      </app-modal>
    }
    <app-reschedule-modal [appointment]="rescheduling()" (closed)="rescheduling.set(null)" (done)="rescheduling.set(null); reload()" />
  `,
})
export class PatientDetailPage {
  readonly id = input.required<string>();
  private api = inject(DoctorApi);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  private actions = inject(AppointmentActions);
  protected readonly i18n = inject(I18n);

  protected readonly patient = signal<Patient | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly apptLoading = signal(true);
  protected readonly editing = signal(false);
  protected readonly booking = signal(false);
  protected readonly writing = signal(false);
  protected readonly inviting = signal(false);
  protected readonly sending = signal(false);
  protected readonly rescheduling = signal<Appointment | null>(null);
  protected readonly msgSubject = signal('');
  protected readonly msgBody = signal('');
  protected readonly d = formatDate;
  protected readonly dt = formatDateTime;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.loading.set(true);
        this.error.set(null);
        this.api.patient(id).subscribe({
          next: (p) => {
            this.patient.set(p);
            this.loading.set(false);
          },
          error: (e) => {
            this.error.set(errorMessage(e));
            this.loading.set(false);
          },
        });
        this.loadAppointments();
      });
    });
  }

  reload() {
    this.loadAppointments();
    this.api.patient(this.id()).subscribe({ next: (p) => this.patient.set(p), error: () => {} });
  }

  private loadAppointments() {
    this.apptLoading.set(true);
    this.api.patientAppointments(this.id()).subscribe({
      next: (l) => {
        this.appointments.set(l);
        this.apptLoading.set(false);
      },
      error: () => this.apptLoading.set(false),
    });
  }

  protected ageOf(p: Patient) {
    return age(p.dateOfBirth);
  }

  async act(a: Appointment, status: AppointmentStatus) {
    const updated = await this.actions.setStatus(a, status);
    if (updated) this.appointments.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
  }

  invite(p: Patient) {
    this.inviting.set(true);
    this.api.invite(p.id).subscribe({
      next: () => {
        this.inviting.set(false);
        this.patient.update((x) => (x ? { ...x, invitationPending: true } : x));
        this.toast.success(this.i18n.t('patientDetail.toastInvited'), this.i18n.t('patientDetail.toastInvitedText', { email: p.email }));
      },
      error: (e) => {
        this.inviting.set(false);
        this.toast.error(this.i18n.t('patientDetail.toastInviteError'), errorMessage(e));
      },
    });
  }

  write(p: Patient) {
    this.sending.set(true);
    this.api.writeToPatient(p.id, { subject: this.msgSubject().trim(), body: this.msgBody().trim() }).subscribe({
      next: (d) => {
        this.sending.set(false);
        this.writing.set(false);
        this.msgSubject.set('');
        this.msgBody.set('');
        this.toast.success(this.i18n.t('contact.sentTitle'));
        this.router.navigate(['/cabinet/messages', d.thread.id]);
      },
      error: (e) => {
        this.sending.set(false);
        this.toast.error(this.i18n.t('auth.forgot.toastError'), errorMessage(e));
      },
    });
  }

  async remove(p: Patient) {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('patientDetail.deleteTitle'),
      message: this.i18n.t('patientDetail.deleteText', { name: `${p.firstName} ${p.lastName}` }),
      confirmLabel: this.i18n.t('common.delete'),
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deletePatient(p.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('patientDetail.toastDeleted'));
        this.router.navigateByUrl('/cabinet/patients');
      },
      error: (e) => this.toast.error(this.i18n.t('common.deleteError'), errorMessage(e)),
    });
  }
}
