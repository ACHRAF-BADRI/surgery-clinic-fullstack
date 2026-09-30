import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DoctorApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { errorMessage, formatDayLong, formatMonthLabel } from '../../core/format';
import { Appointment, AppointmentStatus, DoctorDashboard } from '../../core/models';
import { AppointmentItemComponent } from '../../ui/appointment-item';
import { BannerComponent } from '../../ui/banner';
import { BarChartComponent, BarListComponent, ChartDatum } from '../../ui/charts';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonComponent, SkeletonListComponent } from '../../ui/skeleton';
import { StatCardComponent } from '../../ui/stat-card';
import { AppointmentActions } from './appointment-actions';
import { RescheduleModalComponent } from './appointment-modals';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    RouterLink, StatCardComponent, BarChartComponent, BarListComponent, AppointmentItemComponent, EmptyStateComponent,
    IconComponent, SkeletonListComponent, SkeletonComponent, BannerComponent, RescheduleModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .charts { display: grid; gap: 20px; margin-top: 20px; align-items: start; }
    @media (min-width: 1100px) { .charts { grid-template-columns: 1.6fr 1fr; } }
    .lists { display: grid; gap: 20px; margin-top: 20px; }
    @media (min-width: 1100px) { .lists { grid-template-columns: 1fr 1fr; } }
    .list > app-appointment-item + app-appointment-item { border-top: 1px solid var(--border); }
    .card-title .sub { font-size: .8rem; color: var(--text-3); }
    .card-head { padding: 20px 22px 6px; }
  `,
  template: `
    <div class="page-head">
      <div>
        <h1>Bonjour, {{ auth.displayName() }}</h1>
        <p>{{ today }} — voici l'activité du cabinet.</p>
      </div>
      <div class="row">
        <button class="btn" (click)="load()" [disabled]="loading()"><app-icon name="refresh" [size]="16" /> Actualiser</button>
        <a class="btn btn-primary" routerLink="/cabinet/agenda"><app-icon name="calendar" [size]="16" /> Ouvrir l'agenda</a>
      </div>
    </div>

    @if (loading() && !data()) {
      <app-skeleton-list variant="stats" [count]="4" />
      <div class="charts">
        <div class="card card-pad"><app-skeleton height="260px" rounded="14px" /></div>
        <div class="card card-pad"><app-skeleton height="260px" rounded="14px" /></div>
      </div>
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="error" title="Tableau de bord indisponible" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
        </app-empty-state>
      </div>
    } @else if (data(); as d) {
      @if (d.pendingRequests > 0) {
        <app-banner tone="premium" [title]="d.pendingRequests + ' demande(s) de rendez-vous à traiter'" style="display: block; margin-bottom: 20px">
          Des patients attendent votre confirmation. Ils sont prévenus par email dès que vous validez.
        </app-banner>
      }

      <div class="grid grid-4 stagger">
        <app-stat-card label="Aujourd'hui" [value]="d.appointmentsToday" icon="calendar" hint="rendez-vous prévus" link="/cabinet/agenda" />
        <app-stat-card label="Cette semaine" [value]="d.appointmentsThisWeek" icon="calendar-clock" hint="hors annulations" link="/cabinet/agenda" />
        <app-stat-card label="Demandes en attente" [value]="d.pendingRequests" icon="clock" [highlight]="d.pendingRequests > 0"
          hint="à confirmer" link="/cabinet/agenda" [query]="{ statut: 'PENDING' }" />
        <app-stat-card label="Messages non lus" [value]="d.unreadThreads" icon="message" hint="conversations" link="/cabinet/messages" />
        <app-stat-card label="Patients" [value]="d.totalPatients" icon="users" [hint]="d.patientsWithoutAccount + ' sans compte'" link="/cabinet/patients" />
        <app-stat-card label="Nouveaux patients" [value]="d.newPatientsThisMonth" icon="user-plus" hint="ce mois-ci" />
        <app-stat-card label="Taux d'annulation" [value]="(d.cancellationRate * 100).toFixed(0) + ' %'" icon="ban" hint="6 derniers mois" />
      </div>

      <div class="charts">
        <div class="card">
          <div class="card-head card-title" style="margin: 0">
            <div><h3>Rendez-vous par mois</h3><span class="sub">Hors annulations · 6 mois passés et 2 à venir</span></div>
          </div>
          <div style="padding: 8px 18px 18px">
            <app-bar-chart [data]="monthly()" ariaLabel="Nombre de rendez-vous par mois" unit="rendez-vous" [highlightCurrent]="true" />
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title"><div><h3>Interventions demandées</h3><span class="sub">Sur la même période</span></div></div>
          @if (d.topProcedures.length) {
            <app-bar-list [data]="d.topProcedures" />
          } @else {
            <app-empty-state [compact]="true" illustration="search" title="Pas encore de données" />
          }
          <hr class="divider" />
          <div class="card-title" style="margin-bottom: 14px"><h3 style="font-size: 1.1rem">Par motif</h3></div>
          @if (d.byType.length) {
            <app-bar-list [data]="d.byType" />
          }
        </div>
      </div>

      <div class="lists">
        <div class="card">
          <div class="card-head card-title">
            <h3>Prochains rendez-vous</h3>
            <a class="link" style="font-size: .85rem" routerLink="/cabinet/agenda">Tout voir</a>
          </div>
          @if (d.upcoming.length) {
            <div class="list">
              @for (a of d.upcoming; track a.id) {
                <app-appointment-item [appointment]="a" [showPatient]="true" [showNote]="false" />
              }
            </div>
          } @else {
            <app-empty-state [compact]="true" illustration="calendar" title="Agenda libre" message="Aucun rendez-vous à venir." />
          }
        </div>
        <div class="card">
          <div class="card-head card-title"><h3>Demandes à confirmer</h3></div>
          @if (d.pending.length) {
            <div class="list">
              @for (a of d.pending; track a.id) {
                <app-appointment-item [appointment]="a" [showPatient]="true">
                  <button class="btn btn-sm btn-accent" (click)="act(a, 'CONFIRMED')"><app-icon name="check" [size]="14" /> Confirmer</button>
                  <button class="btn btn-sm" (click)="rescheduling.set(a)" title="Proposer un autre créneau"><app-icon name="calendar-clock" [size]="14" /></button>
                  <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" title="Refuser" aria-label="Refuser"><app-icon name="x" [size]="14" /></button>
                </app-appointment-item>
              }
            </div>
          } @else {
            <app-empty-state [compact]="true" illustration="success" title="Tout est à jour" message="Aucune demande en attente." />
          }
        </div>
      </div>
    }

    <app-reschedule-modal [appointment]="rescheduling()" (closed)="rescheduling.set(null)" (done)="rescheduling.set(null); load()" />
  `,
})
export class DoctorDashboardPage {
  protected readonly auth = inject(AuthService);
  private api = inject(DoctorApi);
  private actions = inject(AppointmentActions);
  protected readonly data = signal<DoctorDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rescheduling = signal<Appointment | null>(null);
  protected readonly today = formatDayLong(new Date());

  protected readonly monthly = computed<ChartDatum[]>(() => {
    const now = new Date().toISOString().slice(0, 7);
    return (this.data()?.appointmentsByMonth ?? []).map((p) => ({
      label: formatMonthLabel(p.label),
      value: p.value,
      detail: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${p.label}-15T12:00:00Z`)),
      current: p.label === now,
    }));
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  async act(a: Appointment, status: AppointmentStatus) {
    if (await this.actions.setStatus(a, status)) this.load();
  }
}
