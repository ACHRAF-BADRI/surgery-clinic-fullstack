import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { initials } from '../core/format';

const HUES = [28, 36, 18, 44, 10, 52];

/** Initials avatar with a stable hue derived from the name. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.38',
    '[style.--h]': 'hue()',
    '[class.muted]': 'muted()',
    'aria-hidden': 'true',
  },
  styles: `
    :host {
      flex-shrink: 0;
      display: inline-grid;
      place-items: center;
      border-radius: 50%;
      font-family: var(--font-display);
      font-weight: 600;
      letter-spacing: .02em;
      color: color-mix(in srgb, hsl(var(--h) 45% 45%) 70%, var(--text));
      background: color-mix(in srgb, hsl(var(--h) 50% 62%) 24%, var(--surface));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, hsl(var(--h) 45% 55%) 30%, transparent);
    }
    :host(.muted) { filter: grayscale(.9); opacity: .75; }
  `,
  template: `{{ text() }}`,
})
export class AvatarComponent {
  readonly name = input('');
  readonly size = input(40);
  readonly muted = input(false);
  protected readonly text = computed(() => initials(this.name()) || '?');
  protected readonly hue = computed(() => {
    let h = 0;
    for (const ch of this.name()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return HUES[h % HUES.length];
  });
}
