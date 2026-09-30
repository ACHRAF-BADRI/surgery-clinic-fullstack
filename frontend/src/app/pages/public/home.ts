import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { PublicApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BRAND } from '../../core/config';
import { ClinicInfo } from '../../core/models';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { IconComponent } from '../../ui/icon';
import { SkeletonComponent } from '../../ui/skeleton';

type Load<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error' };

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, BadgeComponent, BannerComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .hero { position: relative; overflow: hidden; padding-block: clamp(32px, 6vw, 72px) clamp(56px, 8vw, 110px); }
    .hero::before {
      content: ""; position: absolute; inset: -20% -10% auto auto; width: 70vw; height: 70vw; max-width: 900px; max-height: 900px;
      background: radial-gradient(closest-side, var(--accent-soft), transparent 70%); z-index: -1; opacity: .9;
    }
    .hero-grid { display: grid; gap: 48px; align-items: center; }
    @media (min-width: 980px) { .hero-grid { grid-template-columns: 1.1fr .9fr; } }
    .hero h1 { margin: 18px 0 22px; }
    .hero h1 em { font-style: italic; color: var(--accent); }
    .hero .lead { max-width: 540px; }
    .ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
    .trust { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 36px; }

    .art { position: relative; aspect-ratio: 4 / 5; max-width: 460px; width: 100%; justify-self: center; }
    .arch {
      position: absolute; inset: 0; border-radius: 999px 999px 32px 32px; overflow: hidden;
      background: linear-gradient(165deg, var(--surface-3), var(--accent-soft) 55%, var(--surface-2));
      border: 1px solid var(--accent-line);
      box-shadow: var(--shadow-lg);
    }
    .arch svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .draw { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 900; stroke-dashoffset: 900; animation: draw 3.2s var(--ease) .3s forwards; }
    .draw.thin { stroke-width: 1.2; stroke: var(--text-3); animation-delay: .8s; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    .glow { fill: var(--gold); opacity: .25; filter: blur(30px); }
    .float-card {
      position: absolute; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 16px;
      background: color-mix(in srgb, var(--surface) 82%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--border); box-shadow: var(--shadow-md); font-size: .82rem; animation: bob 6s ease-in-out infinite;
    }
    .float-card strong { display: block; font-size: .9rem; }
    .float-card .ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: var(--ink); color: var(--ink-contrast); }
    .fc1 { left: -6%; bottom: 16%; }
    .fc2 { right: -4%; top: 12%; animation-delay: 1.5s; }
    @media (max-width: 520px) { .fc1 { left: 0; } .fc2 { right: 0; } }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

    .strip { border-block: 1px solid var(--border); background: var(--surface); }
    .strip .grid { padding-block: 28px; text-align: center; }
    .num { font-family: var(--font-display); font-size: 2.6rem; line-height: 1; }
    .num-label { font-size: .8rem; color: var(--text-3); margin-top: 6px; letter-spacing: .04em; }

    .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 40px; }
    .head h2 { margin-top: 12px; max-width: 620px; }
    .expertise { padding: 28px; display: flex; flex-direction: column; gap: 14px; min-height: 250px; }
    .expertise .ic { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); transition: all .4s var(--ease); }
    .expertise:hover .ic { background: var(--ink); color: var(--ink-contrast); transform: rotate(-6deg); }
    .expertise h3 { font-size: 1.55rem; }
    .expertise p { color: var(--text-2); font-size: .92rem; flex: 1; }
    .expertise .more { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: .85rem; color: var(--accent); }

    .doctor { display: grid; gap: 48px; align-items: center; }
    @media (min-width: 900px) { .doctor { grid-template-columns: .85fr 1.15fr; } }
    .portrait {
      aspect-ratio: 1; border-radius: var(--radius-xl); position: relative; overflow: hidden;
      background: linear-gradient(145deg, #2a231d, #1a1613); display: grid; place-items: center;
    }
    .portrait .mono { font-family: var(--font-display); font-size: clamp(5rem, 14vw, 9rem); color: #e6c797; font-style: italic; }
    .portrait .caption { position: absolute; left: 20px; bottom: 20px; right: 20px; color: #f3ece2; font-size: .85rem; }
    .quote { font-family: var(--font-display); font-size: clamp(1.4rem, 2.4vw, 1.9rem); line-height: 1.35; font-style: italic; margin: 22px 0; }
    .values { display: grid; gap: 14px; margin-top: 28px; }
    .value { display: flex; gap: 14px; align-items: flex-start; }
    .value .ic { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--accent-line); color: var(--accent); }

    .steps { counter-reset: step; }
    .step { padding: 26px; position: relative; }
    .step::before {
      counter-increment: step; content: "0" counter(step); font-family: var(--font-display); font-size: 3rem; line-height: 1;
      color: var(--accent-line); display: block; margin-bottom: 18px;
    }
    .step h4 { font-size: 1.3rem; margin-bottom: 8px; }
    .step p { color: var(--text-2); font-size: .9rem; }

    .info { display: grid; gap: 20px; }
    @media (min-width: 900px) { .info { grid-template-columns: 1fr 1fr; } }
    .hours { list-style: none; padding: 0; margin: 0; }
    .hours li { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px dashed var(--border); font-size: .92rem; }
    .hours li:last-child { border-bottom: 0; }
    .hours .today { color: var(--accent); font-weight: 700; }
  `,
  template: `
    <section class="hero">
      <div class="container hero-grid">
        <div class="animate-in">
          <app-badge tone="accent" [dot]="true" [pulse]="true">Nouveaux créneaux disponibles en ligne</app-badge>
          <h1>Révéler votre beauté, <em>naturellement.</em></h1>
          <p class="lead">
            {{ BRAND.doctor }} vous accompagne en chirurgie plastique, esthétique et reconstructrice avec une approche
            sur mesure, sûre et respectueuse de votre singularité.
          </p>
          <div class="ctas">
            <a class="btn btn-primary btn-lg" routerLink="/rendez-vous">
              <app-icon name="calendar-plus" /> Prendre rendez-vous
            </a>
            <a class="btn btn-lg" routerLink="/contact"><app-icon name="message" /> Poser une question</a>
          </div>
          <div class="trust">
            <app-badge icon="shield-check" [outline]="true" tone="success">Données de santé protégées</app-badge>
            <app-badge icon="clock" [outline]="true">Réponse sous 48 h</app-badge>
            <app-badge icon="award" [outline]="true" tone="accent">Chirurgienne qualifiée</app-badge>
          </div>
        </div>

        <div class="art animate-in" style="animation-delay: .15s">
          <div class="arch">
            <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <circle class="glow" cx="260" cy="170" r="110" />
              <path class="draw" d="M262 78c-50 0-86 38-90 90-2 22-10 36-24 54-5 7 0 13 9 15l9 2c-4 11-2 20 5 24-5 7-2 16 7 20 2 13 5 27 22 31 20 5 40 2 53 20l5 64" />
              <path class="draw" d="M262 78c58 0 100 44 100 112 0 78-44 124-44 196" />
              <path class="draw thin" d="M196 204c10-4 20-4 30 2" />
              <path class="draw thin" d="M120 420c40-30 100-44 160-40s96 24 120 48" />
              <path class="draw thin" d="M300 130c20 18 30 44 28 74" />
            </svg>
          </div>
          <div class="float-card fc1">
            <span class="ic"><app-icon name="calendar" [size]="17" /></span>
            <span><strong>Rendez-vous en ligne</strong><span class="muted">24 h/24 · 7 j/7</span></span>
          </div>
          <div class="float-card fc2">
            <span class="ic"><app-icon name="sparkles" [size]="17" /></span>
            <span><strong>Résultats naturels</strong><span class="muted">Approche sur mesure</span></span>
          </div>
        </div>
      </div>
    </section>

    <section class="strip">
      <div class="container grid grid-4 stagger">
        <div><div class="num">15+</div><div class="num-label">années d'expérience</div></div>
        <div><div class="num">13</div><div class="num-label">interventions proposées</div></div>
        <div><div class="num">45 min</div><div class="num-label">de première consultation</div></div>
        <div><div class="num">48 h</div><div class="num-label">pour répondre à vos messages</div></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="head">
          <div>
            <span class="eyebrow">Expertises</span>
            <h2>Une chirurgie de précision, au service de l'harmonie.</h2>
          </div>
          <a class="btn" routerLink="/interventions">Toutes les interventions <app-icon name="arrow-right" [size]="16" /></a>
        </div>
        <div class="grid grid-3 stagger">
          @for (e of expertises; track e.title) {
            <a class="card card-hover expertise" routerLink="/interventions" [queryParams]="{ categorie: e.title }">
              <span class="ic"><app-icon [name]="e.icon" [size]="22" /></span>
              <h3>{{ e.title }}</h3>
              <p>{{ e.text }}</p>
              <span class="more">Découvrir <app-icon name="arrow-right" [size]="15" /></span>
            </a>
          }
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--bg-tint)">
      <div class="container doctor">
        <div class="portrait">
          <span class="mono">CL</span>
          <div class="caption"><strong>{{ BRAND.doctor }}</strong><br />{{ BRAND.doctorTitle }}</div>
        </div>
        <div>
          <span class="eyebrow">Le docteur</span>
          <h2 style="margin-top: 12px">Une écoute attentive, un geste d'exception.</h2>
          <p class="quote">« Mon objectif n'est pas de transformer, mais de révéler ce qui vous ressemble déjà. »</p>
          <p class="lead">
            Chaque projet débute par une consultation approfondie : analyse morphologique, écoute de vos attentes,
            explication détaillée des techniques, des risques et du parcours de soins. Un délai de réflexion est
            toujours respecté avant toute intervention.
          </p>
          <div class="values">
            @for (v of values; track v) {
              <div class="value"><span class="ic"><app-icon name="check" [size]="16" /></span><span>{{ v }}</span></div>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="head">
          <div>
            <span class="eyebrow">Votre parcours</span>
            <h2>Simple, transparent, entièrement accompagné.</h2>
          </div>
        </div>
        <div class="grid grid-4 steps stagger">
          <div class="card step"><h4>Réservez en ligne</h4><p>Créez votre espace patient et choisissez un créneau en quelques clics.</p></div>
          <div class="card step"><h4>Consultation</h4><p>Un échange approfondi pour définir ensemble le projet le plus adapté.</p></div>
          <div class="card step"><h4>Intervention</h4><p>Dans un établissement agréé, avec une équipe dédiée à votre confort.</p></div>
          <div class="card step"><h4>Suivi</h4><p>Contrôles post-opératoires et messagerie sécurisée avec le docteur.</p></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top: 0">
      <div class="container info">
        <div class="card card-pad">
          <div class="card-title"><h3>Horaires du cabinet</h3><app-icon name="clock" class="muted" /></div>
          @switch (clinic().state) {
            @case ('loading') {
              <div class="stack" style="--gap: 16px">
                @for (i of [1, 2, 3, 4, 5, 6, 7]; track i) {
                  <div class="row" style="justify-content: space-between">
                    <app-skeleton width="90px" /><app-skeleton width="120px" />
                  </div>
                }
              </div>
            }
            @case ('error') {
              <app-banner tone="warning" title="Horaires momentanément indisponibles">
                Le serveur démarre peut-être (hébergement en veille). Réessayez dans quelques secondes.
              </app-banner>
            }
            @case ('ok') {
              <ul class="hours">
                @for (h of okClinic()!.openingHours; track h.day) {
                  <li [class.today]="h.day.toLowerCase() === today">
                    <span>{{ h.day }}</span><span [class.muted]="h.hours === 'Fermé'">{{ h.hours }}</span>
                  </li>
                }
              </ul>
            }
          }
        </div>
        <div class="card card-pad stack" style="--gap: 18px">
          <div class="card-title" style="margin: 0"><h3>Nous trouver</h3><app-icon name="map-pin" class="muted" /></div>
          <p class="text-2">{{ BRAND.address }}</p>
          <div class="row">
            <a class="btn btn-sm" [href]="'tel:' + BRAND.phoneHref"><app-icon name="phone" [size]="15" /> {{ BRAND.phone }}</a>
            <a class="btn btn-sm" routerLink="/contact"><app-icon name="mail" [size]="15" /> Écrire au cabinet</a>
          </div>
          <app-banner tone="premium" title="Votre espace patient">
            Suivez vos rendez-vous, échangez avec le docteur et retrouvez tout votre parcours au même endroit.
            <div actions>
              @if (auth.isLoggedIn()) {
                <a class="btn btn-accent btn-sm" [routerLink]="auth.homeFor()">Accéder à mon espace</a>
              } @else {
                <a class="btn btn-accent btn-sm" routerLink="/inscription">Créer mon espace</a>
                <a class="btn btn-sm" style="--btn-bg: transparent; --btn-fg: #f3ece2; --btn-border: #5a4a36" routerLink="/connexion">Se connecter</a>
              }
            </div>
          </app-banner>
        </div>
      </div>
    </section>
  `,
})
export class HomePage {
  protected readonly BRAND = BRAND;
  protected readonly auth = inject(AuthService);
  protected readonly today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: BRAND.timeZone }).format(new Date());

  protected readonly clinic = toSignal(
    inject(PublicApi)
      .clinic()
      .pipe(
        map((data): Load<ClinicInfo> => ({ state: 'ok', data })),
        catchError(() => of<Load<ClinicInfo>>({ state: 'error' })),
        startWith<Load<ClinicInfo>>({ state: 'loading' }),
      ),
    { requireSync: true },
  );

  protected okClinic() {
    const c = this.clinic();
    return c.state === 'ok' ? c.data : null;
  }

  protected readonly expertises = [
    { title: 'Visage', icon: 'sparkles', text: 'Rhinoplastie, blépharoplastie, lifting cervico-facial, otoplastie : sublimer les traits sans les figer.' },
    { title: 'Seins', icon: 'heart', text: 'Augmentation, réduction ou lifting mammaire, avec un résultat harmonieux et adapté à votre silhouette.' },
    { title: 'Silhouette', icon: 'activity', text: 'Liposuccion, abdominoplastie et lipofilling pour redessiner les courbes du corps.' },
    { title: 'Médecine esthétique', icon: 'star', text: 'Acide hyaluronique et toxine botulique : des gestes précis, sans éviction sociale.' },
    { title: 'Reconstructrice', icon: 'shield', text: 'Reconstruction mammaire, cicatrices, séquelles de brûlures ou de traumatismes.' },
    { title: 'Consultation', icon: 'calendar', text: 'Un premier rendez-vous de 45 minutes pour construire ensemble votre projet, sans engagement.' },
  ];

  protected readonly values = [
    'Consultation d’information détaillée et devis personnalisé',
    'Délai de réflexion légal systématiquement respecté',
    'Interventions en établissement agréé, sous anesthésie adaptée',
    'Suivi post-opératoire rapproché et messagerie dédiée',
  ];
}
