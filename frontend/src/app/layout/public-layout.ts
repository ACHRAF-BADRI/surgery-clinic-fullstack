import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { BRAND } from '../core/config';
import { AvatarComponent } from '../ui/avatar';
import { IconComponent } from '../ui/icon';
import { LogoComponent } from '../ui/logo';
import { ThemeToggleComponent } from '../ui/theme-toggle';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, ThemeToggleComponent, IconComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    header {
      position: sticky; top: 0; z-index: 50; height: var(--header-h);
      transition: background-color .35s var(--ease), border-color .35s var(--ease), backdrop-filter .35s;
      border-bottom: 1px solid transparent;
    }
    header.scrolled {
      background: color-mix(in srgb, var(--bg) 82%, transparent);
      backdrop-filter: blur(18px) saturate(1.3);
      -webkit-backdrop-filter: blur(18px) saturate(1.3);
      border-bottom-color: var(--border);
    }
    .bar { height: 100%; display: flex; align-items: center; gap: 16px; }
    nav.desktop { display: none; margin-left: 28px; gap: 4px; }
    nav.desktop a {
      position: relative; padding: 8px 14px; font-size: .9rem; font-weight: 600; color: var(--text-2);
      border-radius: 999px; transition: color .2s;
    }
    nav.desktop a:hover, nav.desktop a.active { color: var(--text); }
    nav.desktop a::after {
      content: ""; position: absolute; left: 14px; right: 14px; bottom: 3px; height: 1.5px;
      background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform .35s var(--ease);
    }
    nav.desktop a.active::after, nav.desktop a:hover::after { transform: scaleX(1); }
    .actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .desktop-only { display: none; }
    .account { display: inline-flex; align-items: center; gap: 10px; padding: 4px 14px 4px 4px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); font-weight: 600; font-size: .86rem; }
    .account:hover { border-color: var(--accent-line); }
    .burger {
      width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface);
      display: grid; place-items: center; cursor: pointer; color: var(--text);
    }
    @media (min-width: 960px) {
      nav.desktop { display: flex; }
      .desktop-only { display: inline-flex; }
      .burger { display: none; }
    }

    .mobile {
      position: fixed; inset: var(--header-h) 0 0 0; z-index: 49; padding: 24px 16px 32px;
      background: var(--bg); display: flex; flex-direction: column; gap: 6px;
      animation: fade-in .25s var(--ease) both; overflow-y: auto;
    }
    .mobile a.item {
      font-family: var(--font-display); font-size: 1.9rem; padding: 10px 4px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; animation: fade-up .45s var(--ease) both;
    }
    .mobile a.item:nth-child(2) { animation-delay: .04s; }
    .mobile a.item:nth-child(3) { animation-delay: .08s; }
    .mobile a.item:nth-child(4) { animation-delay: .12s; }
    .mobile .cta { margin-top: 24px; display: grid; gap: 10px; }
    @media (min-width: 960px) { .mobile { display: none; } }

    main { flex: 1; }

    footer { margin-top: 40px; border-top: 1px solid var(--border); background: var(--bg-tint); }
    .foot { display: grid; gap: 36px; padding-block: 56px 32px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
    .foot h4 { font-family: var(--font-body); font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; color: var(--text-3); margin-bottom: 14px; font-weight: 700; }
    .foot ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; font-size: .9rem; color: var(--text-2); }
    .foot a:hover { color: var(--accent); }
    .foot .line { display: flex; gap: 10px; align-items: flex-start; }
    .legal { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding-block: 20px; border-top: 1px solid var(--border); font-size: .8rem; color: var(--text-3); }
  `,
  template: `
    <header [class.scrolled]="scrolled() || menuOpen()">
      <div class="container bar">
        <app-logo />
        <nav class="desktop" aria-label="Navigation principale">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Accueil</a>
          <a routerLink="/interventions" routerLinkActive="active">Interventions</a>
          <a routerLink="/rendez-vous" routerLinkActive="active">Rendez-vous</a>
          <a routerLink="/contact" routerLinkActive="active">Contact</a>
        </nav>
        <div class="actions">
          <app-theme-toggle />
          @if (auth.isLoggedIn()) {
            <a class="account desktop-only" [routerLink]="auth.homeFor()">
              <app-avatar [name]="auth.displayName()" [size]="30" />
              Mon espace
            </a>
          } @else {
            <a class="btn btn-ghost desktop-only" routerLink="/connexion">Connexion</a>
            <a class="btn btn-primary desktop-only" routerLink="/rendez-vous">
              Prendre rendez-vous <app-icon name="arrow-right" [size]="16" />
            </a>
          }
          <button class="burger" type="button" (click)="menuOpen.set(!menuOpen())"
            [attr.aria-expanded]="menuOpen()" aria-label="Menu">
            <app-icon [name]="menuOpen() ? 'x' : 'menu'" />
          </button>
        </div>
      </div>
    </header>

    @if (menuOpen()) {
      <div class="mobile" role="dialog" aria-label="Menu">
        <a class="item" routerLink="/">Accueil <app-icon name="arrow-right" /></a>
        <a class="item" routerLink="/interventions">Interventions <app-icon name="arrow-right" /></a>
        <a class="item" routerLink="/rendez-vous">Rendez-vous <app-icon name="arrow-right" /></a>
        <a class="item" routerLink="/contact">Contact <app-icon name="arrow-right" /></a>
        <div class="cta">
          @if (auth.isLoggedIn()) {
            <a class="btn btn-primary btn-lg" [routerLink]="auth.homeFor()">Mon espace</a>
          } @else {
            <a class="btn btn-primary btn-lg" routerLink="/rendez-vous">Prendre rendez-vous</a>
            <a class="btn btn-lg" routerLink="/connexion">Connexion</a>
          }
        </div>
      </div>
    }

    <main><router-outlet /></main>

    <footer>
      <div class="container">
        <div class="foot">
          <div class="stack" style="--gap: 14px">
            <app-logo />
            <p class="text-2" style="font-size: .9rem; max-width: 300px">
              {{ BRAND.tagline }}. Une approche sur mesure, sûre et naturelle.
            </p>
          </div>
          <div>
            <h4>Le cabinet</h4>
            <ul>
              <li class="line"><app-icon name="map-pin" [size]="16" /> {{ BRAND.address }}</li>
              <li class="line"><app-icon name="phone" [size]="16" /> <a [href]="'tel:' + BRAND.phoneHref">{{ BRAND.phone }}</a></li>
              <li class="line"><app-icon name="mail" [size]="16" /> <a [href]="'mailto:' + BRAND.email">{{ BRAND.email }}</a></li>
            </ul>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a routerLink="/interventions">Interventions</a></li>
              <li><a routerLink="/rendez-vous">Prendre rendez-vous</a></li>
              <li><a routerLink="/contact">Écrire au docteur</a></li>
              <li><a routerLink="/connexion">Espace patient</a></li>
            </ul>
          </div>
          <div>
            <h4>Urgence</h4>
            <p class="text-2" style="font-size: .9rem">
              En cas d'urgence médicale, composez le <strong>15</strong> ou le <strong>112</strong>.
              La messagerie n'est pas adaptée aux urgences.
            </p>
          </div>
        </div>
        <div class="legal">
          <span>© {{ year }} {{ BRAND.name }} — Tous droits réservés</span>
          <span>Données de santé protégées · RGPD</span>
        </div>
      </div>
    </footer>
  `,
})
export class PublicLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly BRAND = BRAND;
  protected readonly year = new Date().getFullYear();
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 8);
  }
}
