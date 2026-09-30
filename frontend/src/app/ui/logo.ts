import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../core/config';
import { TranslatePipe } from '../core/i18n/i18n';

@Component({
  selector: 'app-logo',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    a { display: inline-flex; align-items: center; gap: 12px; color: var(--text); }
    .mark {
      width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center;
      background: var(--ink); transition: transform .5s var(--ease);
    }
    a:hover .mark { transform: rotate(-8deg) scale(1.04); }
    .mark path { fill: var(--gold); }
    .name { font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; line-height: 1; letter-spacing: .01em; }
    .sub { display: block; font-size: .62rem; letter-spacing: .24em; text-transform: uppercase; color: var(--text-3); margin-top: 4px; font-weight: 600; }
    .compact .sub { display: none; }
  `,
  template: `
    <a routerLink="/" [class.compact]="compact()" [attr.aria-label]="BRAND.name + ' — ' + ('nav.home' | t)">
      <span class="mark">
        <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 9c3.6 8.8 9.4 14.6 18.2 18.2C41.4 30.8 35.6 36.6 32 45.4 28.4 36.6 22.6 30.8 13.8 27.2 22.6 23.6 28.4 17.8 32 9Z" />
          <path d="M32 50a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        </svg>
      </span>
      <span>
        <span class="name">{{ BRAND.name }}</span>
        <span class="sub">{{ 'brand.sub' | t }}</span>
      </span>
    </a>
  `,
})
export class LogoComponent {
  protected readonly BRAND = BRAND;
  readonly compact = input(false);
}
