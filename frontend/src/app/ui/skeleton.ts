import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Loading block with an animated shimmer. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--skeleton-base);
      border-radius: 8px;
    }
    :host::after {
      content: "";
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, var(--skeleton-shine), transparent);
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
  `,
  template: ``,
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('14px');
  readonly circle = input(false);
  readonly rounded = input('8px');
  protected readonly radius = computed(() => (this.circle() ? '50%' : this.rounded()));
}

/** Ready-made loading templates (list, cards, stats, chat). */
@Component({
  selector: 'app-skeleton-list',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-label': 'Chargement…' },
  styles: `
    :host { display: block; }
    .row { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    .row:last-child { border-bottom: 0; }
    .lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .cards { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }
    .card { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: 12px; }
    .stats { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); }
    .stat { padding: 20px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: 12px; }
    .bubbles { display: flex; flex-direction: column; gap: 14px; padding: 8px 0; }
    .bubble { max-width: 70%; }
    .bubble.right { align-self: flex-end; }
    .framed { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); overflow: hidden; }
  `,
  template: `
    @switch (variant()) {
      @case ('cards') {
        <div class="cards">
          @for (i of items(); track i) {
            <div class="card">
              <app-skeleton width="44px" height="44px" rounded="12px" />
              <app-skeleton width="60%" height="20px" />
              <app-skeleton width="100%" />
              <app-skeleton width="80%" />
            </div>
          }
        </div>
      }
      @case ('stats') {
        <div class="stats">
          @for (i of items(); track i) {
            <div class="stat">
              <app-skeleton width="40%" height="12px" />
              <app-skeleton width="55%" height="30px" />
              <app-skeleton width="70%" height="10px" />
            </div>
          }
        </div>
      }
      @case ('chat') {
        <div class="bubbles">
          @for (i of items(); track i) {
            <div class="bubble" [class.right]="i % 2 === 1">
              <app-skeleton [width]="i % 2 ? '260px' : '320px'" height="64px" rounded="16px" />
            </div>
          }
        </div>
      }
      @default {
        <div [class.framed]="framed()">
          @for (i of items(); track i) {
            <div class="row">
              @if (avatar()) {
                <app-skeleton width="42px" height="42px" [circle]="true" />
              }
              <div class="lines">
                <app-skeleton [width]="i % 2 ? '45%' : '35%'" height="14px" />
                <app-skeleton [width]="i % 2 ? '70%' : '60%'" height="11px" />
              </div>
              <app-skeleton width="86px" height="26px" rounded="999px" />
            </div>
          }
        </div>
      }
    }
    <span class="sr-only">Chargement…</span>
  `,
})
export class SkeletonListComponent {
  readonly variant = input<'list' | 'cards' | 'stats' | 'chat'>('list');
  readonly count = input(5);
  readonly avatar = input(true);
  readonly framed = input(true);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
