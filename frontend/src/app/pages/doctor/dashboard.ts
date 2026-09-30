import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DoctorApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { errorMessage, formatDayLong, formatMonthLabel, formatMonthLong } from '../../core/format';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';
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
    IconComponent, SkeletonListComponent, SkeletonComponent, BannerComponent, RescheduleModalComponent, TranslatePipe,
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
        <h1>{{ 'doctorDashboard.hello' | t: { name: auth.displayName() } }}</h1>
        <p>{{ 'doctorDashboard.subtitle' | t: { date: today() } }}</p>
      </div>
      <div class="row">
        <button class="btn" (click)="load()" [disabled]="loading()"><app-icon name="refresh" [size]="16" /> {{ 'common.refresh' | t }}</button>
        <a class="btn btn-primary" routerLink="/cabinet/agenda"><app-icon name="calendar" [size]="16" /> {{ 'doctorDashboard.openAgenda' | t }}</a>
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
        <app-empty-state illustration="error" [title]="'doctorDashboard.error' | t" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> {{ 'common.retry' | t }}</button>
        </app-empty-state>
      </div>
    } @else if (data(); as d) {
      @if (d.pendingRequests > 0) {
        <app-banner tone="premium" [title]="'doctorDashboard.pendingBanner' | t: { n: d.pendingRequests }" style="display: block; margin-bottom: 20px">
          {{ 'doctorDashboard.pendingBannerText' | t }}
        </app-banner>
      }

      <div class="grid grid-4 stagger">
        <app-stat-card [label]="'doctorDashboard.today' | t" [value]="d.appointmentsToday" icon="calendar" [hint]="'doctorDashboard.todayHint' | t" link="/cabinet/agenda" />
        <app-stat-card [label]="'doctorDashboard.week' | t" [value]="d.appointmentsThisWeek" icon="calendar-clock" [hint]="'doctorDashboard.weekHint' | t" link="/cabinet/agenda" />
        <app-stat-card [label]="'doctorDashboard.pending' | t" [value]="d.pendingRequests" icon="clock" [highlight]="d.pendingRequests > 0"
          [hint]="'doctorDashboard.pendingHint' | t" link="/cabinet/agenda" [query]="{ statut: 'PENDING' }" />
        <app-stat-card [label]="'doctorDashboard.unread' | t" [value]="d.unreadThreads" icon="message" [hint]="'doctorDashboard.unreadHint' | t" link="/cabinet/messages" />
        <app-stat-card [label]="'doctorDashboard.patients' | t" [value]="d.totalPatients" icon="users" [hint]="'doctorDashboard.patientsHint' | t: { n: d.patientsWithoutAccount }" link="/cabinet/patients" />
        <app-stat-card [label]="'doctorDashboard.newPatients' | t" [value]="d.newPatientsThisMonth" icon="user-plus" [hint]="'doctorDashboard.newPatientsHint' | t" />
        <app-stat-card [label]="'doctorDashboard.cancelRate' | t" [value]="(d.cancellationRate * 100).toFixed(0) + ' %'" icon="ban" [hint]="'doctorDashboard.cancelRateHint' | t" />
      </div>

      <div class="charts">
        <div class="card">
          <div class="card-head card-title" style="margin: 0">
            <div><h3>{{ 'doctorDashboard.perMonth' | t }}</h3><span class="sub">{{ 'doctorDashboard.perMonthSub' | t }}</span></div>
          </div>
          <div style="padding: 8px 18px 18px">
            <app-bar-chart [data]="monthly()" [ariaLabel]="'doctorDashboard.perMonth' | t" [unit]="'doctorDashboard.unitAppointments' | t" [highlightCurrent]="true" />
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title"><div><h3>{{ 'doctorDashboard.topProcedures' | t }}</h3><span class="sub">{{ 'doctorDashboard.samePeriod' | t }}</span></div></div>
          @if (d.topProcedures.length) {
            <app-bar-list [data]="topProcedures()" />
          } @else {
            <app-empty-state [compact]="true" illustration="search" [title]="'doctorDashboard.noData' | t" />
          }
          <hr class="divider" />
          <div class="card-title" style="margin-bottom: 14px"><h3 style="font-size: 1.1rem">{{ 'doctorDashboard.byType' | t }}</h3></div>
          @if (d.byType.length) {
            <app-bar-list [data]="byType()" />
          }
        </div>
      </div>

      <div class="lists">
        <div class="card">
          <div class="card-head card-title">
            <h3>{{ 'doctorDashboard.upcoming' | t }}</h3>
            <a class="link" style="font-size: .85rem" routerLink="/cabinet/agenda">{{ 'doctorDashboard.seeAll' | t }}</a>
          </div>
          @if (d.upcoming.length) {
            <div class="list">
              @for (a of d.upcoming; track a.id) {
                <app-appointment-item [appointment]="a" [showPatient]="true" [showNote]="false" />
              }
            </div>
          } @else {
            <app-empty-state [compact]="true" illustration="calendar" [title]="'doctorDashboard.freeAgenda' | t" [message]="'myAppointments.nothingText' | t" />
          }
        </div>
        <div class="card">
          <div class="card-head card-title"><h3>{{ 'doctorDashboard.toConfirm' | t }}</h3></div>
          @if (d.pending.length) {
            <div class="list">
              @for (a of d.pending; track a.id) {
                <app-appointment-item [appointment]="a" [showPatient]="true">
                  <button class="btn btn-sm btn-accent" (click)="act(a, 'CONFIRMED')"><app-icon name="check" [size]="14" /> {{ 'common.confirm' | t }}</button>
                  <button class="btn btn-sm" (click)="rescheduling.set(a)" [title]="'doctorDashboard.proposeOther' | t"><app-icon name="calendar-clock" [size]="14" /></button>
                  <button class="btn btn-sm btn-danger btn-icon" (click)="act(a, 'CANCELLED')" [title]="'doctorDashboard.decline' | t" [attr.aria-label]="'doctorDashboard.decline' | t"><app-icon name="x" [size]="14" /></button>
                </app-appointment-item>
              }
            </div>
          } @else {
            <app-empty-state [compact]="true" illustration="success" [title]="'doctorDashboard.allClear' | t" [message]="'doctorDashboard.allClearText' | t" />
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
  protected readonly i18n = inject(I18n);
  protected readonly today = computed(() => formatDayLong(new Date()));
  protected readonly topProcedures = computed(() =>
    (this.data()?.topProcedures ?? []).map((c) => ({ label: this.i18n.procedure(c.key), value: c.value })),
  );
  protected readonly byType = computed(() =>
    (this.data()?.byType ?? []).map((c) => ({ label: this.i18n.apptType(c.key), value: c.value })),
  );

  protected readonly monthly = computed<ChartDatum[]>(() => {
    const now = new Date().toISOString().slice(0, 7);
    return (this.data()?.appointmentsByMonth ?? []).map((p) => ({
      label: formatMonthLabel(p.label),
      value: p.value,
      detail: formatMonthLong(p.label),
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
