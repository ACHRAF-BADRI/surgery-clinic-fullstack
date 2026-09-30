import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon';

/** Stat tile (hero number). */
@Component({
  selector: 'app-stat-card',
  imports: [IconComponent, RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .stat {
      display: flex; flex-direction: column; gap: 6px; height: 100%;
      padding: 20px 22px; border-radius: var(--radius-lg);
      background: var(--surface); border: 1px solid var(--border);
      transition: border-color .3s var(--ease), box-shadow .3s var(--ease), transform .3s var(--ease);
    }
    a.stat:hover { border-color: var(--accent-line); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .label { font-size: .8rem; font-weight: 600; color: var(--text-2); }
    .icon {
      width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center;
      background: var(--accent-soft); color: var(--accent);
    }
    .value {
      font-family: var(--font-display); font-size: 2.5rem; line-height: 1; font-weight: 500;
      margin-top: 6px; letter-spacing: -.02em; color: var(--text);
    }
    .hint { font-size: .78rem; color: var(--text-3); }
    .highlight .icon { background: var(--ink); color: var(--ink-contrast); }
  `,
  template: `
    @if (link()) {
      <a class="stat" [routerLink]="link()" [queryParams]="query()" [class.highlight]="highlight()">
        <ng-container *ngTemplateOutlet="body" />
      </a>
    } @else {
      <div class="stat" [class.highlight]="highlight()"><ng-container *ngTemplateOutlet="body" /></div>
    }
    <ng-template #body>
      <div class="top">
        <span class="label">{{ label() }}</span>
        <span class="icon"><app-icon [name]="icon()" [size]="17" /></span>
      </div>
      <div class="value">{{ value() }}</div>
      @if (hint()) {
        <div class="hint">{{ hint() }}</div>
      }
    </ng-template>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('activity');
  readonly hint = input('');
  readonly link = input<string | null>(null);
  readonly query = input<Record<string, string> | null>(null);
  readonly highlight = input(false);
}
