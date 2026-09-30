import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/api';
import { errorMessage, formatMonthLabel, relativeTime, ROLE_LABELS, ROLE_TONES } from '../../core/format';
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
  imports: [RouterLink, StatCardComponent, BarChartComponent, BarListComponent, EmptyStateComponent, IconComponent, SkeletonListComponent, SkeletonComponent, AvatarComponent, BadgeComponent],
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
      <div><h1>Administration</h1><p>Vue d'ensemble des comptes et de l'activité.</p></div>
      <div class="row">
        <button class="btn" (click)="load()" [disabled]="loading()"><app-icon name="refresh" [size]="16" /> Actualiser</button>
        <a class="btn btn-primary" routerLink="/admin/utilisateurs"><app-icon name="users" [size]="16" /> Gérer les utilisateurs</a>
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
        <app-empty-state illustration="error" title="Données indisponibles" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
        </app-empty-state>
      </div>
    } @else if (data(); as d) {
      <div class="grid grid-4 stagger">
        <app-stat-card label="Utilisateurs" [value]="d.totalUsers" icon="users" [hint]="d.newUsersThisMonth + ' nouveaux ce mois-ci'" link="/admin/utilisateurs" />
        <app-stat-card label="Patients" [value]="d.patients" icon="heart" [hint]="d.patientsWithoutAccount + ' sans compte'" link="/admin/utilisateurs" [query]="{ role: 'PATIENT' }" />
        <app-stat-card label="Équipe" [value]="d.doctors + d.admins" icon="shield" [hint]="d.doctors + ' docteur(s) · ' + d.admins + ' admin(s)'" />
        <app-stat-card label="Comptes restreints" [value]="d.restricted" icon="ban" [highlight]="d.restricted > 0" hint="accès bloqué" link="/admin/utilisateurs" [query]="{ statut: 'RESTRICTED' }" />
        <app-stat-card label="Actifs (30 j)" [value]="d.activeLast30Days" icon="activity" hint="connectés au moins une fois" />
      </div>

      <div class="charts">
        <div class="card">
          <div class="card-head"><h3>Inscriptions par mois</h3><span class="sub">Tous rôles confondus · 12 derniers mois</span></div>
          <div style="padding: 0 18px 18px">
            <app-bar-chart [data]="signups()" ariaLabel="Nouveaux utilisateurs par mois" unit="inscription(s)" [highlightCurrent]="true" />
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title"><div><h3>Répartition par rôle</h3><span class="sub">{{ d.totalUsers }} comptes</span></div></div>
          <app-bar-list [data]="d.byRole" />
          <hr class="divider" />
          <app-bar-list [data]="accountSplit()" />
        </div>
      </div>

      <div class="lists">
        <div class="card">
          <div class="card-head card-title" style="margin: 0"><h3>Derniers inscrits</h3></div>
          @for (u of d.recentUsers; track u.id) {
            <div class="u">
              <app-avatar [name]="u.firstName + ' ' + u.lastName" [size]="36" />
              <div class="info"><div class="n">{{ u.firstName }} {{ u.lastName }}</div><div class="e">{{ u.email || 'Pas d’email' }}</div></div>
              <app-badge [tone]="roleTones[u.role]" size="sm">{{ roleLabels[u.role] }}</app-badge>
              @if (!u.hasAccount) {
                <app-badge tone="warning" size="sm">Sans compte</app-badge>
              }
              <span class="when">{{ rel(u.createdAt) }}</span>
            </div>
          } @empty {
            <app-empty-state [compact]="true" illustration="users" title="Aucun utilisateur" />
          }
        </div>
        <div class="card">
          <div class="card-head card-title" style="margin: 0"><h3>Dernières connexions</h3></div>
          @for (u of d.recentLogins; track u.id) {
            <div class="u">
              <app-avatar [name]="u.firstName + ' ' + u.lastName" [size]="36" />
              <div class="info"><div class="n">{{ u.firstName }} {{ u.lastName }}</div><div class="e">{{ u.email }}</div></div>
              <app-badge [tone]="roleTones[u.role]" size="sm">{{ roleLabels[u.role] }}</app-badge>
              <span class="when">{{ rel(u.lastLoginAt) }}</span>
            </div>
          } @empty {
            <app-empty-state [compact]="true" illustration="lock" title="Aucune connexion récente" />
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
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleTones = ROLE_TONES;
  protected readonly rel = relativeTime;

  protected readonly signups = computed<ChartDatum[]>(() => {
    const now = new Date().toISOString().slice(0, 7);
    return (this.data()?.signupsByMonth ?? []).map((p) => ({
      label: formatMonthLabel(p.label),
      value: p.value,
      detail: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${p.label}-15T12:00:00Z`)),
      current: p.label === now,
    }));
  });

  protected readonly accountSplit = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Patients avec compte', value: d.patients - d.patientsWithoutAccount },
      { label: 'Patients sans compte (créés par le cabinet)', value: d.patientsWithoutAccount },
    ];
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
}
