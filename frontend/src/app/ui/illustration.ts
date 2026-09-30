import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IllustrationKind =
  | 'empty'
  | 'calendar'
  | 'messages'
  | 'search'
  | 'error'
  | 'offline'
  | 'notfound'
  | 'lock'
  | 'success'
  | 'users';

/**
 * Line-art vector illustrations tinted by theme variables
 * (they adapt to light / dark mode automatically).
 */
@Component({
  selector: 'app-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host { display: inline-block; }
    svg { width: 100%; height: auto; overflow: visible; }
    .blob { fill: var(--accent-soft); }
    .paper { fill: var(--surface); stroke: var(--border-strong); stroke-width: 1.5; }
    .line { fill: none; stroke: var(--text-3); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .accent { fill: none; stroke: var(--accent); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    .fill-accent { fill: var(--accent); }
    .fill-soft { fill: var(--surface-3); }
    .danger { fill: none; stroke: var(--danger); stroke-width: 2.4; stroke-linecap: round; }
    .spark { fill: var(--gold); animation: twinkle 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
    .spark.d2 { animation-delay: 1s; }
    .spark.d3 { animation-delay: 2s; }
    .float { animation: float 5s ease-in-out infinite; }
    @keyframes twinkle { 0%, 100% { opacity: .35; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.1); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  `,
  template: `
    <svg viewBox="0 0 220 170" [style.max-width.px]="size()">
      <path class="blob" d="M38 92c-6-34 22-66 60-72 34-5 72 6 88 34 16 27 6 64-22 80-30 18-78 22-104 2-12-9-19-25-22-44Z" />
      <path class="spark" d="M186 26l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2z" />
      <path class="spark d2" d="M28 44l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
      <circle class="spark d3" cx="196" cy="118" r="3" />

      @switch (kind()) {
        @case ('calendar') {
          <g class="float">
            <rect class="paper" x="62" y="40" width="96" height="92" rx="14" />
            <path class="fill-soft" d="M62 54a14 14 0 0 1 14-14h68a14 14 0 0 1 14 14v10H62z" />
            <path class="line" d="M84 32v18M136 32v18" />
            @for (r of [0, 1, 2]; track r) {
              @for (c of [0, 1, 2, 3]; track c) {
                <rect [attr.x]="76 + c * 18" [attr.y]="76 + r * 16" width="10" height="8" rx="2.5"
                  [attr.class]="r === 1 && c === 2 ? 'fill-accent' : 'fill-soft'" />
              }
            }
          </g>
          <circle class="paper" cx="160" cy="124" r="20" />
          <path class="accent" d="M160 114v10l7 4" />
        }
        @case ('messages') {
          <g class="float">
            <path class="paper" d="M52 50a12 12 0 0 1 12-12h72a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12H86l-18 16v-16h-4a12 12 0 0 1-12-12z" />
            <path class="line" d="M70 60h58M70 74h40" />
          </g>
          <path class="paper" d="M108 88a10 10 0 0 1 10-10h48a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10h-2v14l-16-14h-30a10 10 0 0 1-10-10z" />
          <circle class="fill-accent" cx="126" cy="102" r="3.2" />
          <circle class="fill-accent" cx="142" cy="102" r="3.2" />
          <circle class="fill-accent" cx="158" cy="102" r="3.2" />
        }
        @case ('search') {
          <rect class="paper" x="56" y="42" width="82" height="96" rx="12" />
          <path class="line" d="M72 64h50M72 80h36M72 96h44" />
          <g class="float">
            <circle class="paper" cx="140" cy="100" r="26" />
            <circle class="accent" cx="140" cy="100" r="16" />
            <path class="accent" d="m152 112 18 18" />
          </g>
        }
        @case ('error') {
          <g class="float">
            <path class="paper" d="M66 116a24 24 0 0 1-2-48 32 32 0 0 1 62-8 26 26 0 0 1 32 26 22 22 0 0 1-6 30z" />
            <path class="danger" d="M104 72v18M104 102h.01" />
          </g>
          <path class="line" d="M70 138h28M112 138h40" />
          <path class="accent" d="M98 138l7-9 7 9" />
        }
        @case ('offline') {
          <g class="float">
            <circle class="paper" cx="110" cy="88" r="46" />
            <path class="line" d="M84 84a36 36 0 0 1 52 0M93 96a22 22 0 0 1 34 0" />
            <circle class="fill-accent" cx="110" cy="110" r="4" />
            <path class="danger" d="M76 54l68 68" />
          </g>
        }
        @case ('notfound') {
          <g class="float">
            <circle class="paper" cx="110" cy="86" r="50" />
            <circle class="line" cx="110" cy="86" r="38" style="stroke-dasharray: 3 6" />
            <path class="fill-accent" d="M110 50l10 36h-20z" />
            <path class="fill-soft" d="M110 122l-10-36h20z" />
            <circle class="paper" cx="110" cy="86" r="5" />
          </g>
        }
        @case ('lock') {
          <g class="float">
            <path class="line" d="M88 76V62a22 22 0 0 1 44 0v14" />
            <rect class="paper" x="72" y="74" width="76" height="62" rx="14" />
            <circle class="fill-accent" cx="110" cy="100" r="7" />
            <path class="accent" d="M110 106v12" />
          </g>
        }
        @case ('success') {
          <g class="float">
            <circle class="paper" cx="110" cy="86" r="46" />
            <circle class="fill-soft" cx="110" cy="86" r="34" />
            <path class="accent" d="m92 87 12 12 24-26" style="stroke-width: 4" />
          </g>
        }
        @case ('users') {
          <g class="float">
            <circle class="paper" cx="86" cy="70" r="20" />
            <path class="paper" d="M50 132a36 36 0 0 1 72 0z" />
          </g>
          <circle class="paper" cx="140" cy="78" r="16" />
          <path class="paper" d="M112 132a28 28 0 0 1 56 0z" />
          <circle class="fill-accent" cx="160" cy="58" r="10" />
          <path d="M160 53v10M155 58h10" style="stroke: var(--accent-contrast); stroke-width: 2; stroke-linecap: round" />
        }
        @default {
          <g class="float">
            <path class="paper" d="M60 76l50-22 50 22v50l-50 22-50-22z" />
            <path class="line" d="M60 76l50 22 50-22M110 98v50" />
            <path class="fill-soft" d="M60 76l50-22 50 22-50 22z" />
          </g>
          <path class="accent" d="M92 44c6-10 30-10 36 0" />
        }
      }
    </svg>
  `,
})
export class IllustrationComponent {
  readonly kind = input<IllustrationKind>('empty');
  readonly size = input(220);
}
