import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { IconComponent } from './icon';
import { TranslatePipe } from '../core/i18n/i18n';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'premium';

const ICONS: Record<BannerTone, string> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  accent: 'sparkles',
  premium: 'sparkles',
};

/** Info banner: semantic tones + dark "premium" variant with an animated sheen. */
@Component({
  selector: 'app-banner',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .banner {
      --c: var(--info);
      --bg: var(--info-soft);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 18px;
      border-radius: var(--radius-md);
      background: var(--bg);
      border: 1px solid color-mix(in srgb, var(--c) 22%, transparent);
      animation: scale-in .45s var(--ease) both;
    }
    .banner.leaving { animation: fade-out .3s var(--ease) both; }
    @keyframes fade-out { to { opacity: 0; transform: translateY(-6px); } }
    .success { --c: var(--success); --bg: var(--success-soft); }
    .warning { --c: var(--warning); --bg: var(--warning-soft); }
    .danger { --c: var(--danger); --bg: var(--danger-soft); }
    .accent { --c: var(--accent); --bg: var(--accent-soft); }
    .premium {
      --c: #e6c797;
      background: linear-gradient(120deg, #1f1b17 0%, #2d251d 55%, #3a2e22 100%);
      color: #f3ece2;
      border-color: #4d3f2c;
    }
    .premium::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 30%, rgba(230, 199, 151, .16) 45%, transparent 60%);
      transform: translateX(-100%);
      animation: sheen 4.5s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes sheen { 60%, 100% { transform: translateX(100%); } }
    .icon {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 14%, transparent);
    }
    .body { flex: 1; min-width: 0; }
    .title { font-weight: 700; font-size: .92rem; color: inherit; }
    .banner:not(.premium) .title { color: var(--text); }
    .text { font-size: .87rem; margin-top: 2px; opacity: .9; }
    .banner:not(.premium) .text { color: var(--text-2); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .actions:empty { display: none; }
    .close {
      flex-shrink: 0; border: 0; background: transparent; color: inherit; opacity: .6; cursor: pointer;
      width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;
    }
    .close:hover { opacity: 1; background: color-mix(in srgb, var(--c) 14%, transparent); }
  `,
  template: `
    @if (visible()) {
      <div class="banner" [class]="tone()" [class.leaving]="leaving()" role="status">
        <span class="icon"><app-icon [name]="icon() ?? ICONS[tone()]" [size]="18" /></span>
        <div class="body">
          @if (title()) {
            <div class="title">{{ title() }}</div>
          }
          <div class="text"><ng-content /></div>
          <div class="actions"><ng-content select="[actions]" /></div>
        </div>
        @if (dismissible()) {
          <button class="close" type="button" (click)="dismiss()" [attr.aria-label]="'common.close' | t">
            <app-icon name="x" [size]="16" />
          </button>
        }
      </div>
    }
  `,
})
export class BannerComponent {
  protected readonly ICONS = ICONS;
  readonly tone = input<BannerTone>('info');
  readonly title = input<string>('');
  readonly icon = input<string | null>(null);
  readonly dismissible = input(false);
  readonly dismissed = output<void>();
  protected readonly visible = signal(true);
  protected readonly leaving = signal(false);

  dismiss() {
    this.leaving.set(true);
    setTimeout(() => {
      this.visible.set(false);
      this.dismissed.emit();
    }, 280);
  }
}
