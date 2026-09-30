import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/format';
import { Appointment } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { AppointmentItemComponent } from '../../ui/appointment-item';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonListComponent } from '../../ui/skeleton';

@Component({
  selector: 'app-my-appointments',
  imports: [RouterLink, AppointmentItemComponent, EmptyStateComponent, SkeletonListComponent, IconComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .list { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); overflow: hidden; }
    .list > app-appointment-item + app-appointment-item { border-top: 1px solid var(--border); }
    h2.sub { font-size: 1.5rem; margin: 32px 0 14px; }
  `,
  template: `
    <div class="page-head">
      <div>
        <h1>Bonjour {{ auth.user()?.firstName }}</h1>
        <p>Retrouvez vos rendez-vous passés et à venir.</p>
      </div>
      <a class="btn btn-primary" routerLink="/rendez-vous"><app-icon name="calendar-plus" [size]="17" /> Nouveau rendez-vous</a>
    </div>

    @if (pendingCount() > 0) {
      <app-banner tone="warning" title="Demande en attente de confirmation" icon="clock" [dismissible]="true" style="display: block; margin-bottom: 20px">
        {{ pendingCount() }} demande(s) en attente. Vous recevrez un email dès que le cabinet l'aura confirmée.
      </app-banner>
    }

    @if (loading()) {
      <app-skeleton-list [count]="4" [avatar]="false" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="error" title="Impossible de charger vos rendez-vous" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
        </app-empty-state>
      </div>
    } @else if (appointments().length === 0) {
      <div class="card">
        <app-empty-state illustration="calendar" title="Aucun rendez-vous pour le moment"
          message="Réservez votre première consultation en ligne en quelques clics.">
          <a class="btn btn-primary" routerLink="/rendez-vous">Prendre rendez-vous</a>
          <a class="btn" routerLink="/interventions">Découvrir les interventions</a>
        </app-empty-state>
      </div>
    } @else {
      <h2 class="sub" style="margin-top: 0">À venir</h2>
      @if (upcoming().length === 0) {
        <div class="card">
          <app-empty-state [compact]="true" illustration="calendar" title="Rien de prévu" message="Aucun rendez-vous à venir.">
            <a class="btn btn-sm btn-primary" routerLink="/rendez-vous">Réserver</a>
          </app-empty-state>
        </div>
      } @else {
        <div class="list stagger">
          @for (a of upcoming(); track a.id) {
            <app-appointment-item [appointment]="a">
              @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                <button class="btn btn-sm btn-danger" [class.is-loading]="busy() === a.id" (click)="cancel(a)">
                  <app-icon name="x" [size]="14" /> Annuler
                </button>
              }
            </app-appointment-item>
          }
        </div>
      }

      @if (past().length) {
        <h2 class="sub">Historique</h2>
        <div class="list">
          @for (a of past(); track a.id) {
            <app-appointment-item [appointment]="a" [showNote]="false" />
          }
        </div>
      }
    }
  `,
})
export class MyAppointmentsPage {
  protected readonly auth = inject(AuthService);
  private api = inject(PatientApi);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  protected readonly upcoming = computed(() =>
    this.appointments()
      .filter((a) => new Date(a.endAt) > new Date() && a.status !== 'CANCELLED')
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  );
  protected readonly past = computed(() => this.appointments().filter((a) => !this.upcoming().includes(a)));
  protected readonly pendingCount = computed(() => this.upcoming().filter((a) => a.status === 'PENDING').length);

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.appointments().subscribe({
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

  async cancel(a: Appointment) {
    const r = await this.confirm.ask({
      title: 'Annuler ce rendez-vous ?',
      message: 'Le créneau sera libéré et le cabinet sera prévenu.',
      confirmLabel: 'Annuler le rendez-vous',
      cancelLabel: 'Garder',
      tone: 'danger',
      input: { label: 'Motif (facultatif)', placeholder: 'Ex. : empêchement professionnel' },
    });
    if (!r.confirmed) return;
    this.busy.set(a.id);
    this.api.cancel(a.id, r.value || undefined).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.appointments.update((l) => l.map((x) => (x.id === updated.id ? updated : x)));
        this.toast.success('Rendez-vous annulé', 'Le cabinet a été informé.');
      },
      error: (e) => {
        this.busy.set(null);
        this.toast.error('Annulation impossible', errorMessage(e));
      },
    });
  }
}
