import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api';
import { errorMessage, formatMonthLabel, formatMonthLong, relativeTime, ROLE_TONES } from '../../core/format';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';
import { AdminDashboard } from '../../core/models';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { BarChartComponent, BarListComponent, ChartDatum } from '../../ui/charts';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonComponent, SkeletonListComponent } from '../../ui/skeleton';
import { StatCardComponent } from '../../ui/stat-card';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, StatCardComponent, BarChartComponent, BarListComponent, EmptyStateComponent, IconComponent, SkeletonListComponent, SkeletonComponent, AvatarComponent, BadgeComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .charts, .lists { display: grid; gap: 20px; margin-top: 20px; align-items: start; }
    @media (min-width: 1100px) { .charts { grid-template-columns: 1.6fr 1fr; } .lists { grid-template-columns: 1fr 1fr; } }
    .sub { font-size: .8rem; color: var(--text-3); }
    .u { display: flex; align-items: center; gap: 12px; padding: 12px 22px; border-top: 1px solid var(--border); }
    .u .n { font-weight: 700; font-size: .88rem; }
    .u .e { font-size: .78rem; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .u .info { flex: 1; min-width: 0; }
    .u .when { font-size: .76rem; color: var(--text-3); white-space: nowrap; }
    .card-head { padding: 20px 22px 12px; }
  `,
  template: `
    <div class="page-head">
      <div><h1>{{ 'adminDashboard.title' | t }}</h1><p>{{ 'adminDashboard.subtitle' | t }}</p></div>
      <div class="row">
        <button class="btn" (click)="load()" [disabled]="loading()"><app-icon name="refresh" [size]="16" /> {{ 'common.refresh' | t }}</button>
        <a class="btn btn-primary" routerLink="/admin/utilisateurs"><app-icon name="users" [size]="16" /> {{ 'adminDashboard.manage' | t }}</a>
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
        <app-empty-state illustration="error" [title]="'adminDashboard.error' | t" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> {{ 'common.retry' | t }}</button>
        </app-empty-state>
      </div>
    } @else if (data(); as d) {
      <div class="grid grid-4 stagger">
        <app-stat-card [label]="'adminDashboard.users' | t" [value]="d.totalUsers" icon="users" [hint]="'adminDashboard.usersHint' | t: { n: d.newUsersThisMonth }" link="/admin/utilisateurs" />
        <app-stat-card [label]="'doctorDashboard.patients' | t" [value]="d.patients" icon="heart" [hint]="'doctorDashboard.patientsHint' | t: { n: d.patientsWithoutAccount }" link="/admin/utilisateurs" [query]="{ role: 'PATIENT' }" />
        <app-stat-card [label]="'adminDashboard.team' | t" [value]="d.doctors + d.admins" icon="shield" [hint]="'adminDashboard.teamHint' | t: { doctors: d.doctors, admins: d.admins }" />
        <app-stat-card [label]="'adminDashboard.restricted' | t" [value]="d.restricted" icon="ban" [highlight]="d.restricted > 0" [hint]="'adminDashboard.restrictedHint' | t" link="/admin/utilisateurs" [query]="{ statut: 'RESTRICTED' }" />
        <app-stat-card [label]="'adminDashboard.active' | t" [value]="d.activeLast30Days" icon="activity" [hint]="'adminDashboard.activeHint' | t" />
      </div>

      <div class="charts">
        <div class="card">
          <div class="card-head"><h3>{{ 'adminDashboard.signups' | t }}</h3><span class="sub">{{ 'adminDashboard.signupsSub' | t }}</span></div>
          <div style="padding: 0 18px 18px">
            <app-bar-chart [data]="signups()" [ariaLabel]="'adminDashboard.signups' | t" [unit]="'adminDashboard.unitSignups' | t" [highlightCurrent]="true" />
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title"><div><h3>{{ 'adminDashboard.byRole' | t }}</h3><span class="sub">{{ 'adminDashboard.accounts' | t: { n: d.totalUsers } }}</span></div></div>
          <app-bar-list [data]="byRole()" />
          <hr class="divider" />
          <app-bar-list [data]="accountSplit()" />
        </div>
      </div>

      <div class="lists">
        <div class="card">
          <div class="card-head card-title" style="margin: 0"><h3>{{ 'adminDashboard.recentUsers' | t }}</h3></div>
          @for (u of d.recentUsers; track u.id) {
            <div class="u">
              <app-avatar [name]="u.firstName + ' ' + u.lastName" [size]="36" />
              <div class="info"><div class="n">{{ u.firstName }} {{ u.lastName }}</div><div class="e">{{ u.email || ('adminDashboard.noEmail' | t) }}</div></div>
              <app-badge [tone]="roleTones[u.role]" size="sm">{{ i18n.role(u.role) }}</app-badge>
              @if (!u.hasAccount) {
                <app-badge tone="warning" size="sm">{{ 'badges.noAccount' | t }}</app-badge>
              }
              <span class="when">{{ rel(u.createdAt) }}</span>
            </div>
          } @empty {
            <app-empty-state [compact]="true" illustration="users" [title]="'adminDashboard.noUsers' | t" />
          }
        </div>
        <div class="card">
          <div class="card-head card-title" style="margin: 0"><h3>{{ 'adminDashboard.recentLogins' | t }}</h3></div>
          @for (u of d.recentLogins; track u.id) {
            <div class="u">
              <app-avatar [name]="u.firstName + ' ' + u.lastName" [size]="36" />
              <div class="info"><div class="n">{{ u.firstName }} {{ u.lastName }}</div><div class="e">{{ u.email }}</div></div>
              <app-badge [tone]="roleTones[u.role]" size="sm">{{ i18n.role(u.role) }}</app-badge>
              <span class="when">{{ rel(u.lastLoginAt) }}</span>
            </div>
          } @empty {
            <app-empty-state [compact]="true" illustration="lock" [title]="'adminDashboard.noLogins' | t" />
          }
        </div>
      </div>
    }
  `,
})
export class AdminDashboardPage {
  private api = inject(AdminApi);
  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly i18n = inject(I18n);
  protected readonly roleTones = ROLE_TONES;
  protected readonly rel = relativeTime;

  protected readonly signups = computed<ChartDatum[]>(() => {
    const now = new Date().toISOString().slice(0, 7);
    return (this.data()?.signupsByMonth ?? []).map((p) => ({
      label: formatMonthLabel(p.label),
      value: p.value,
      detail: formatMonthLong(p.label),
      current: p.label === now,
    }));
  });

  protected readonly accountSplit = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: this.i18n.t('adminDashboard.withAccount'), value: d.patients - d.patientsWithoutAccount },
      { label: this.i18n.t('adminDashboard.withoutAccount'), value: d.patientsWithoutAccount },
    ];
  });

  protected readonly byRole = computed(() =>
    (this.data()?.byRole ?? []).map((c) => ({ label: this.i18n.rolePlural(c.key), value: c.value })),
  );

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
}
