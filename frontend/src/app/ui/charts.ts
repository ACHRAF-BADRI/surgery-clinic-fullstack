import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartDatum {
  label: string;
  value: number;
  /** Long label for the tooltip (e.g. "septembre 2026"). */
  detail?: string;
  /** Highlights the bar (e.g. current month). */
  current?: boolean;
}

/**
 * Single-series SVG column chart: thin bars (≤ 24px) with rounded ends, subtle grid,
 * values above bars, hover tooltip and an accessible table.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; position: relative; }
    svg { width: 100%; height: auto; overflow: visible; }
    .grid { stroke: var(--chart-grid); stroke-width: 1; }
    .axis { fill: var(--text-3); font-size: 11px; font-family: var(--font-body); }
    .val { fill: var(--text-2); font-size: 11px; font-weight: 700; font-family: var(--font-body); }
    .bar { fill: var(--chart-bar); transition: opacity .2s; }
    .bar.muted { fill: var(--chart-bar-muted); }
    .bar-grow { transform-box: fill-box; transform-origin: bottom; animation: grow .8s var(--ease) both; }
    @keyframes grow { from { transform: scaleY(0); } }
    .hit { fill: transparent; cursor: default; }
    .dim .bar { opacity: .45; }
    .dim .bar.on { opacity: 1; }
    .tip {
      position: absolute; pointer-events: none; transform: translate(-50%, calc(-100% - 10px));
      padding: 8px 12px; border-radius: 10px; background: var(--ink); color: var(--ink-contrast);
      font-size: .78rem; white-space: nowrap; box-shadow: var(--shadow-md); animation: fade-in .15s both;
    }
    .tip strong { font-size: .95rem; display: block; }
  `,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="ariaLabel()">
      <g [class.dim]="hover() !== null">
        @for (t of ticks(); track t.v) {
          <line class="grid" [attr.x1]="PAD_L" [attr.x2]="W - 4" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="axis" [attr.x]="PAD_L - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.v }}</text>
        }
        @for (b of bars(); track b.label; let i = $index) {
          @if (b.h > 0) {
            <path class="bar bar-grow" [class.muted]="!b.current && highlightCurrent()" [class.on]="hover() === i"
              [attr.d]="b.path" [style.animation-delay.ms]="i * 40" />
          }
          @if (b.value > 0) {
            <text class="val" [attr.x]="b.cx" [attr.y]="b.y - 6" text-anchor="middle">{{ b.value }}</text>
          }
          <text class="axis" [attr.x]="b.cx" [attr.y]="H - 6" text-anchor="middle">{{ b.label }}</text>
          <rect class="hit" [attr.x]="b.cx - step() / 2" [attr.y]="PAD_T" [attr.width]="step()" [attr.height]="H - PAD_T - PAD_B"
            (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)" />
        }
      </g>
    </svg>
    @if (hover() !== null) {
      @let b = bars()[hover()!];
      <div class="tip" [style.left.%]="(b.cx / W) * 100" [style.top.%]="(b.y / H) * 100">
        <strong>{{ b.value }} {{ unit() }}</strong>{{ b.detail ?? b.label }}
      </div>
    }
    <table class="sr-only">
      <caption>{{ ariaLabel() }}</caption>
      <tbody>
        @for (d of data(); track d.label) {
          <tr><th scope="row">{{ d.detail ?? d.label }}</th><td>{{ d.value }}</td></tr>
        }
      </tbody>
    </table>
  `,
})
export class BarChartComponent {
  readonly data = input.required<ChartDatum[]>();
  readonly ariaLabel = input('Graphique');
  readonly unit = input('');
  readonly highlightCurrent = input(false);

  protected readonly W = 640;
  protected readonly H = 240;
  protected readonly PAD_L = 34;
  protected readonly PAD_T = 20;
  protected readonly PAD_B = 28;
  protected readonly hover = signal<number | null>(null);

  private readonly max = computed(() => {
    const m = Math.max(1, ...this.data().map((d) => d.value));
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const nice = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((v) => v >= m) ?? m;
    return Math.max(nice, 4);
  });

  protected readonly step = computed(() => (this.W - this.PAD_L - 4) / Math.max(1, this.data().length));

  protected readonly ticks = computed(() => {
    const max = this.max();
    return [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = Math.round(max * f);
      return { v, y: this.yOf(v) };
    });
  });

  protected readonly bars = computed(() => {
    const step = this.step();
    const bw = Math.min(24, step * 0.5);
    const base = this.H - this.PAD_B;
    return this.data().map((d, i) => {
      const cx = this.PAD_L + step * i + step / 2;
      const y = this.yOf(d.value);
      const h = base - y;
      const r = Math.min(4, h, bw / 2);
      const x = cx - bw / 2;
      // Rounded top corners, square base.
      const path = `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${base} Z`;
      return { ...d, cx, y, h, path };
    });
  });

  private yOf(v: number) {
    return this.H - this.PAD_B - (v / this.max()) * (this.H - this.PAD_B - this.PAD_T);
  }
}

/** Horizontal bar list (rankings): label, thin bar and value. */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; }
    .row { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; }
    .label { font-size: .86rem; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .value { font-size: .84rem; font-weight: 700; color: var(--text-2); font-variant-numeric: tabular-nums; }
    .track { grid-column: 1 / -1; height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
    .fill {
      height: 100%; border-radius: 999px; background: var(--chart-bar);
      transform-origin: left; animation: grow-x .9s var(--ease) both;
    }
    @keyframes grow-x { from { transform: scaleX(0); } }
  `,
  template: `
    @for (d of data(); track d.label; let i = $index) {
      <div class="row" [attr.title]="d.label + ' : ' + d.value">
        <span class="label">{{ d.label }}</span>
        <span class="value">{{ d.value }}</span>
        <div class="track"><div class="fill" [style.width.%]="(d.value / max()) * 100" [style.animation-delay.ms]="i * 60"></div></div>
      </div>
    }
  `,
})
export class BarListComponent {
  readonly data = input.required<{ label: string; value: number }[]>();
  protected readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
}
