import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ROLE_TONES } from '../core/format';
import { I18n, TKey, TranslatePipe } from '../core/i18n/i18n';
import { UnreadService } from '../core/unread.service';
import { AvatarComponent } from '../ui/avatar';
import { BadgeComponent } from '../ui/badge';
import { IconComponent } from '../ui/icon';
import { LogoComponent } from '../ui/logo';
import { ThemeToggleComponent } from '../ui/theme-toggle';
import { LangToggleComponent } from '../ui/lang-toggle';

interface NavItem {
  label: TKey;
  icon: string;
  link: string;
  unread?: boolean;
  exact?: boolean;
}

interface NavSection {
  title?: TKey;
  items: NavItem[];
}

/** Shell of signed-in areas: sidebar (drawer on mobile) and content. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, IconComponent, AvatarComponent, BadgeComponent, ThemeToggleComponent, LangToggleComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; min-height: 100dvh; }
    aside {
      position: fixed; z-index: 60; inset: 0 auto 0 0; width: 272px;
      display: flex; flex-direction: column; gap: 8px; padding: 22px 16px 16px;
      background: var(--surface); border-right: 1px solid var(--border);
      transform: translateX(-100%); transition: transform .4s var(--ease), background-color .4s;
    }
    aside.open { transform: none; box-shadow: var(--shadow-lg); }
    .scrim { position: fixed; inset: 0; z-index: 55; background: rgba(18, 14, 12, .4); backdrop-filter: blur(3px); animation: fade-in .25s both; }
    .brand { padding: 0 8px 18px; }
    nav { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; margin-top: 8px; }
    .section-title { font-size: .66rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--text-3); padding: 0 12px 6px; }
    nav a {
      position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px;
      font-size: .9rem; font-weight: 600; color: var(--text-2);
      transition: background-color .2s var(--ease), color .2s var(--ease);
    }
    nav a:hover { background: var(--surface-2); color: var(--text); }
    nav a.active { background: var(--accent-soft); color: var(--text); }
    nav a.active::before {
      content: ""; position: absolute; left: -16px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0;
      background: var(--accent); animation: fade-in .3s both;
    }
    nav a.active app-icon { color: var(--accent); }
    .count {
      margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; display: grid; place-items: center;
      background: var(--accent); color: var(--accent-contrast); font-size: .72rem; font-weight: 700;
      animation: scale-in .3s var(--ease) both;
    }
    /* On mobile the language switch lives in the drawer, to keep the top bar uncluttered. */
    .drawer-lang { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 4px 4px 12px; font-size: .84rem; font-weight: 600; color: var(--text-2); }
    .topbar-lang { display: none; }
    .me {
      display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .me .who { flex: 1; min-width: 0; }
    .me .name { font-weight: 700; font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .logout {
      border: 0; background: transparent; color: var(--text-3); width: 34px; height: 34px; border-radius: 10px;
      display: grid; place-items: center; cursor: pointer;
    }
    .logout:hover { background: var(--danger-soft); color: var(--danger); }

    .topbar {
      position: sticky; top: 0; z-index: 40; height: 64px; display: flex; align-items: center; gap: 12px; padding: 0 16px;
      background: color-mix(in srgb, var(--bg) 85%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    .topbar .right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .icon-btn {
      width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface);
      display: grid; place-items: center; cursor: pointer; color: var(--text); flex-shrink: 0;
    }
    main { padding: 28px 16px 64px; max-width: 1240px; margin: 0 auto; }

    @media (min-width: 1024px) {
      aside { transform: none; }
      .scrim, .burger, .drawer-lang { display: none; }
      .topbar-lang { display: block; }
      .content { margin-left: 272px; }
      .topbar { padding: 0 32px; }
      .topbar .mobile-logo { display: none; }
      main { padding: 36px 40px 80px; }
    }
  `,
  template: `
    <aside [class.open]="drawer()" [attr.aria-label]="'shell.navigation' | t">
      <div class="brand"><app-logo /></div>
      <nav>
        @for (section of sections(); track $index) {
          <div>
            @if (section.title) {
              <div class="section-title">{{ section.title | t }}</div>
            }
            @for (item of section.items; track item.link) {
              <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!item.exact }">
                <app-icon [name]="item.icon" [size]="18" />
                {{ item.label | t }}
                @if (item.unread && unread.count() > 0) {
                  <span class="count" [attr.aria-label]="'shell.unread' | t: { count: unread.count() }">{{ unread.count() }}</span>
                }
              </a>
            }
          </div>
        }
      </nav>
      <div class="drawer-lang"><span>{{ 'lang.label' | t }}</span><app-lang-toggle /></div>
      <div class="me">
        <app-avatar [name]="auth.displayName()" [size]="38" />
        <div class="who">
          <div class="name">{{ auth.displayName() }}</div>
          @if (auth.role(); as role) {
            <app-badge [tone]="ROLE_TONES[role]" size="sm">{{ i18n.role(role) }}</app-badge>
          }
        </div>
        <button class="logout" type="button" (click)="auth.logout()" [title]="'shell.logout' | t" [attr.aria-label]="'shell.logout' | t">
          <app-icon name="log-out" [size]="17" />
        </button>
      </div>
    </aside>
    @if (drawer()) {
      <div class="scrim" (click)="drawer.set(false)"></div>
    }

    <div class="content">
      <div class="topbar">
        <button class="icon-btn burger" type="button" (click)="drawer.set(true)" [attr.aria-label]="'shell.openMenu' | t">
          <app-icon name="menu" />
        </button>
        <span class="mobile-logo"><app-logo [compact]="true" /></span>
        <div class="right">
          <a class="btn btn-ghost btn-sm" routerLink="/">
            <app-icon name="arrow-left" [size]="15" /> {{ 'shell.site' | t }}
          </a>
          <app-lang-toggle class="topbar-lang" />
          <app-theme-toggle />
        </div>
      </div>
      <main><router-outlet /></main>
    </div>
  `,
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly unread = inject(UnreadService);
  protected readonly i18n = inject(I18n);
  protected readonly ROLE_TONES = ROLE_TONES;
  protected readonly drawer = signal(false);

  protected readonly sections = computed<NavSection[]>(() => {
    const doctorItems: NavItem[] = [
      { label: 'shell.dashboard', icon: 'dashboard', link: '/cabinet/tableau-de-bord' },
      { label: 'shell.agenda', icon: 'calendar', link: '/cabinet/agenda' },
      { label: 'shell.patients', icon: 'users', link: '/cabinet/patients' },
      { label: 'shell.messages', icon: 'message', link: '/cabinet/messages', unread: true },
    ];
    switch (this.auth.role()) {
      case 'ADMIN':
        return [
          {
            title: 'shell.administration',
            items: [
              { label: 'shell.overview', icon: 'activity', link: '/admin/tableau-de-bord' },
              { label: 'shell.users', icon: 'shield', link: '/admin/utilisateurs' },
            ],
          },
          { title: 'shell.clinic', items: doctorItems },
          { title: 'shell.account', items: [{ label: 'shell.profile', icon: 'user', link: '/admin/profil' }] },
        ];
      case 'DOCTOR':
        return [
          { title: 'shell.clinic', items: doctorItems },
          { title: 'shell.account', items: [{ label: 'shell.profile', icon: 'user', link: '/cabinet/profil' }] },
        ];
      default:
        return [
          {
            title: 'shell.mySpace',
            items: [
              { label: 'shell.myAppointments', icon: 'calendar', link: '/espace/rendez-vous' },
              { label: 'shell.book', icon: 'calendar-plus', link: '/rendez-vous' },
              { label: 'shell.messages', icon: 'message', link: '/espace/messages', unread: true },
              { label: 'shell.profile', icon: 'user', link: '/espace/profil' },
            ],
          },
        ];
    }
  });

  constructor() {
    this.unread.start(inject(DestroyRef));
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.drawer.set(false));
  }
}
