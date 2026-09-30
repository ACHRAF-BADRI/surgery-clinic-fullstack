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

@Component({
  selector: 'app-patient-detail',
  imports: [
    FormsModule, RouterLink, AvatarComponent, BadgeComponent, BannerComponent, EmptyStateComponent, IconComponent, SkeletonComponent,
    SkeletonListComponent, AppointmentItemComponent, BookModalComponent, RescheduleModalComponent, PatientFormModalComponent, ModalComponent,
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
    <a class="btn btn-ghost btn-sm" routerLink="/cabinet/patients" style="margin-bottom: 16px"><app-icon name="arrow-left" [size]="15" /> Patients</a>

    @if (loading()) {
      <div class="hero">
        <app-skeleton width="84px" height="84px" [circle]="true" />
        <div class="t stack" style="--gap: 10px"><app-skeleton width="260px" height="32px" /><app-skeleton width="180px" /></div>
      </div>
      <app-skeleton-list [count]="4" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="notfound" title="Dossier introuvable" [message]="error()!">
          <a class="btn btn-primary" routerLink="/cabinet/patients">Retour aux patients</a>
        </app-empty-state>
      </div>
    } @else if (patient(); as p) {
      <div class="hero animate-in">
        <app-avatar [name]="p.firstName + ' ' + p.lastName" [size]="84" [muted]="p.status === 'RESTRICTED'" />
        <div class="t">
          <h1>{{ p.firstName }} {{ p.lastName }}</h1>
          <div class="badges">
            @if (p.hasAccount) {
              <app-badge tone="success" icon="user-check">Compte actif</app-badge>
            } @else {
              <app-badge tone="warning" icon="user-x">Sans compte</app-badge>
            }
            @if (p.invitationPending) {
              <app-badge tone="info" icon="mail" [outline]="true">Invitation envoyée</app-badge>
            }
            @if (p.status === 'RESTRICTED') {
              <app-badge tone="danger" icon="ban">Compte restreint</app-badge>
            }
            <app-badge [outline]="true">{{ p.appointmentCount }} rendez-vous</app-badge>
          </div>
        </div>
        <div class="row" style="--gap: 8px">
          <button class="btn btn-primary" (click)="booking.set(true)"><app-icon name="calendar-plus" [size]="16" /> Planifier</button>
          @if (p.hasAccount || p.email) {
            <button class="btn" (click)="writing.set(true)"><app-icon name="message" [size]="16" /> Écrire</button>
          }
          <button class="btn" (click)="editing.set(true)"><app-icon name="edit" [size]="16" /> Modifier</button>
          @if (!p.hasAccount) {
            <button class="btn btn-danger btn-icon" (click)="remove(p)" title="Supprimer le dossier" aria-label="Supprimer le dossier"><app-icon name="trash" [size]="16" /></button>
          }
        </div>
      </div>

      @if (!p.hasAccount) {
        <app-banner tone="warning" title="Patient sans compte" icon="user-x" style="display: block; margin-bottom: 20px">
          Ce dossier a été créé par le cabinet : le patient ne peut pas se connecter ni voir ses rendez-vous en ligne.
          @if (p.email) {
            Envoyez-lui une invitation pour qu'il crée son mot de passe.
          } @else {
            Ajoutez son email pour pouvoir l'inviter.
          }
          <div actions>
            @if (p.email) {
              <button class="btn btn-sm btn-primary" [class.is-loading]="inviting()" (click)="invite(p)">
                <app-icon name="send" [size]="14" /> {{ p.invitationPending ? "Renvoyer l'invitation" : 'Inviter à créer un compte' }}
              </button>
            } @else {
              <button class="btn btn-sm" (click)="editing.set(true)">Ajouter un email</button>
            }
          </div>
        </app-banner>
      }

      <div class="layout">
        <div class="stack" style="--gap: 20px">
          <div class="card card-pad">
            <div class="card-title"><h3>Coordonnées</h3><app-icon name="user" class="muted" /></div>
            <dl class="kv">
              <dt>Email</dt>
              <dd>@if (p.email) {<a class="link" [href]="'mailto:' + p.email">{{ p.email }}</a>} @else {—}</dd>
              <dt>Téléphone</dt>
              <dd>@if (p.phone) {<a class="link" [href]="'tel:' + p.phone">{{ p.phone }}</a>} @else {—}</dd>
              <dt>Naissance</dt>
              <dd>{{ p.dateOfBirth ? d(p.dateOfBirth) + ' (' + ageOf(p) + ' ans)' : '—' }}</dd>
              <dt>Genre</dt>
              <dd>{{ genders[p.gender ?? ''] ?? '—' }}</dd>
              <dt>Adresse</dt>
              <dd>{{ p.address || '—' }}@if (p.postalCode || p.city) {<br />{{ p.postalCode }} {{ p.city }}}</dd>
              <dt>Dossier créé</dt>
              <dd>{{ d(p.createdAt) }}</dd>
              <dt>Dernière connexion</dt>
              <dd>{{ p.lastLoginAt ? dt(p.lastLoginAt) : 'Jamais' }}</dd>
            </dl>
          </div>
          <div class="card card-pad">
            <div class="card-title"><h3>Notes médicales</h3><app-badge size="sm" icon="lock">Privé</app-badge></div>
            @if (p.medicalNotes) {
              <p class="notes">{{ p.medicalNotes }}</p>
            } @else {
              <p class="muted">Aucune note. <button class="link" style="border: 0; background: none; cursor: pointer; padding: 0" (click)="editing.set(true)">Ajouter</button></p>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-head card-title"><h3>Rendez-vous</h3></div>
          @if (apptLoading()) {
            <app-skeleton-list [count]="3" [avatar]="false" [framed]="false" />
          } @else if (appointments().length === 0) {
            <app-empty-state [compact]="true" illustration="calendar" title="Aucun rendez-vous" message="Planifiez le premier rendez-vous de ce patient.">
              <button class="btn btn-sm btn-primary" (click)="booking.set(true)">Planifier</button>
            </app-empty-state>
          } @else {
            <div class="list">
              @for (a of appointments(); track a.id) {
                <app-appointment-item [appointment]="a">
                  @if (a.status === 'PENDING') {
                    <button class="btn btn-sm btn-accent" (click)="act(a, 'CONFIRMED')"><app-icon name="check" [size]="14" /> Confirmer</button>
                  }
                  @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                    <button class="btn btn-sm" (click)="rescheduling.set(a)"><app-icon name="calendar-clock" [size]="14" /> Déplacer</button>
                    <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" title="Annuler" aria-label="Annuler"><app-icon name="x" [size]="14" /></button>
                  }
                </app-appointment-item>
              }
            </div>
          }
        </div>
      </div>

      <app-patient-form-modal [open]="editing()" [patient]="p" (closed)="editing.set(false)" (saved)="patient.set($event); editing.set(false)" />
      <app-book-modal [open]="booking()" [patient]="p" (closed)="booking.set(false)" (done)="booking.set(false); reload()" />
      <app-modal [open]="writing()" title="Écrire au patient" [subtitle]="p.hasAccount ? 'Visible dans sa messagerie et notifié par email.' : 'Envoyé par email à ' + p.email" (closed)="writing.set(false)">
        <div class="stack" style="--gap: 16px">
          <div class="field">
            <label class="label" for="w-subject">Sujet</label>
            <input id="w-subject" class="input" [(ngModel)]="msgSubject" maxlength="150" />
          </div>
          <div class="field">
            <label class="label" for="w-body">Message</label>
            <textarea id="w-body" class="textarea" [(ngModel)]="msgBody" rows="6" maxlength="5000"></textarea>
          </div>
        </div>
        <ng-container footer>
          <button class="btn btn-ghost" (click)="writing.set(false)">Annuler</button>
          <button class="btn btn-primary" [disabled]="!msgSubject().trim() || !msgBody().trim() || sending()" [class.is-loading]="sending()" (click)="write(p)">
            <app-icon name="send" [size]="15" /> Envoyer
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
  protected readonly genders: Partial<Record<string, string>> = { F: 'Femme', M: 'Homme', X: 'Autre' };

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
        this.toast.success('Invitation envoyée', `${p.email} a reçu un lien valable 7 jours.`);
      },
      error: (e) => {
        this.inviting.set(false);
        this.toast.error("Invitation impossible", errorMessage(e));
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
        this.toast.success('Message envoyé');
        this.router.navigate(['/cabinet/messages', d.thread.id]);
      },
      error: (e) => {
        this.sending.set(false);
        this.toast.error('Envoi impossible', errorMessage(e));
      },
    });
  }

  async remove(p: Patient) {
    const ok = await this.confirm.confirm({
      title: 'Supprimer ce dossier ?',
      message: `Le dossier de ${p.firstName} ${p.lastName} et tous ses rendez-vous seront définitivement supprimés.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deletePatient(p.id).subscribe({
      next: () => {
        this.toast.success('Dossier supprimé');
        this.router.navigateByUrl('/cabinet/patients');
      },
      error: (e) => this.toast.error('Suppression impossible', errorMessage(e)),
    });
  }
}
