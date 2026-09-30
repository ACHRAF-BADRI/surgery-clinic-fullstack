import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api';
import { errorMessage } from '../../core/format';
import { Procedure } from '../../core/models';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonListComponent } from '../../ui/skeleton';
import { BadgeComponent } from '../../ui/badge';

const CATEGORY_ICONS: Partial<Record<string, string>> = {
  Visage: 'sparkles',
  Seins: 'heart',
  Silhouette: 'activity',
  'Médecine esthétique': 'star',
  Reconstructrice: 'shield',
};

@Component({
  selector: 'app-procedures',
  imports: [RouterLink, IconComponent, EmptyStateComponent, SkeletonListComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .intro { max-width: 720px; margin-bottom: 36px; }
    .intro h1 { margin: 14px 0 16px; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
    .proc { padding: 26px; display: flex; flex-direction: column; gap: 12px; min-height: 240px; }
    .proc .top { display: flex; justify-content: space-between; align-items: center; }
    .proc .ic { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
    .proc h3 { font-size: 1.55rem; }
    .proc p { color: var(--text-2); font-size: .92rem; flex: 1; }
    .proc a.more { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 700; font-size: .86rem; }
    .proc a.more app-icon { transition: transform .3s var(--ease); }
    .proc:hover a.more app-icon { transform: translateX(4px); }
  `,
  template: `
    <section class="section" style="padding-top: 48px">
      <div class="container">
        <div class="intro animate-in">
          <span class="eyebrow">Interventions</span>
          <h1>Des soins sur mesure.</h1>
          <p class="lead">
            Chaque intervention est précédée d'une consultation d'information. Les techniques, les suites opératoires
            et les résultats attendus sont toujours expliqués avec transparence.
          </p>
        </div>

        @if (!loading() && !error()) {
          <div class="filters" role="tablist" aria-label="Catégories">
            <button class="chip" [class.active]="!active()" (click)="active.set(null)" role="tab">Toutes</button>
            @for (c of categories(); track c) {
              <button class="chip" [class.active]="active() === c" (click)="active.set(c)" role="tab">
                <app-icon [name]="icons[c] ?? 'sparkles'" [size]="15" /> {{ c }}
              </button>
            }
          </div>
        }

        @if (loading()) {
          <app-skeleton-list variant="cards" [count]="6" />
        } @else if (error()) {
          <app-empty-state illustration="offline" title="Impossible de charger les interventions" [message]="error()!">
            <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
          </app-empty-state>
        } @else if (filtered().length === 0) {
          <app-empty-state illustration="search" title="Aucune intervention dans cette catégorie">
            <button class="btn" (click)="active.set(null)">Voir toutes les interventions</button>
          </app-empty-state>
        } @else {
          <div class="grid grid-3 stagger">
            @for (p of filtered(); track p.code) {
              <article class="card card-hover proc">
                <div class="top">
                  <span class="ic"><app-icon [name]="icons[p.category] ?? 'sparkles'" [size]="20" /></span>
                  <app-badge size="sm" tone="accent">{{ p.category }}</app-badge>
                </div>
                <h3>{{ p.label }}</h3>
                <p>{{ p.description }}</p>
                <a class="more" routerLink="/rendez-vous" [queryParams]="{ intervention: p.code }">
                  Prendre rendez-vous <app-icon name="arrow-right" [size]="15" />
                </a>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ProceduresPage {
  private api = inject(PublicApi);
  protected readonly icons = CATEGORY_ICONS;
  /** Initial filter from ?categorie=… */
  readonly categorie = input<string>();

  protected readonly procedures = signal<Procedure[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly active = linkedSignal<string | null>(() => this.categorie() ?? null);

  protected readonly categories = computed(() => [...new Set(this.procedures().map((p) => p.category))]);
  protected readonly filtered = computed(() => {
    const a = this.active();
    return a ? this.procedures().filter((p) => p.category === a) : this.procedures();
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.resetClinicCache();
    this.api.clinic().subscribe({
      next: (c) => {
        this.procedures.set(c.procedures);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
