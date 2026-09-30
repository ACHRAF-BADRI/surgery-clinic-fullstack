import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeTone } from '../core/format';
import { IconComponent } from './icon';

/** Pill badge: semantic tone, optional pulsing dot, optional icon. */
@Component({
  selector: 'app-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"badge tone-" + tone() + (outline() ? " outline" : "") + (size() === "sm" ? " sm" : "")',
  },
  styles: `
    :host {
      --c: var(--neutral);
      --bg: var(--neutral-soft);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--bg);
      color: var(--c);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
      line-height: 1;
      border: 1px solid transparent;
      transition: background-color .3s, color .3s;
    }
    :host(.sm) { height: 22px; padding: 0 8px; font-size: 0.68rem; }
    :host(.outline) { background: transparent; border-color: color-mix(in srgb, var(--c) 35%, transparent); }
    :host(.tone-accent) { --c: var(--accent); --bg: var(--accent-soft); }
    :host(.tone-success) { --c: var(--success); --bg: var(--success-soft); }
    :host(.tone-warning) { --c: var(--warning); --bg: var(--warning-soft); }
    :host(.tone-danger) { --c: var(--danger); --bg: var(--danger-soft); }
    :host(.tone-info) { --c: var(--info); --bg: var(--info-soft); }
    .dot { position: relative; width: 7px; height: 7px; border-radius: 50%; background: var(--c); }
    .dot.pulse::after {
      content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--c);
      animation: ping 1.8s cubic-bezier(0, 0, .2, 1) infinite;
    }
    @keyframes ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
  `,
  template: `
    @if (dot()) {
      <span class="dot" [class.pulse]="pulse()"></span>
    }
    @if (icon()) {
      <app-icon [name]="icon()!" [size]="13" [stroke]="2.2" />
    }
    <ng-content />
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly icon = input<string | null>(null);
  readonly dot = input(false);
  readonly pulse = input(false);
  readonly outline = input(false);
  readonly size = input<'md' | 'sm'>('md');
}
