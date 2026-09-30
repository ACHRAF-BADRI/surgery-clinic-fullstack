import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n, Lang, TranslatePipe } from '../core/i18n/i18n';

/** FR | EN switch with a sliding indicator. */
@Component({
  selector: 'app-lang-toggle',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .switch {
      position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; height: 40px; padding: 4px;
      border: 1px solid var(--border); border-radius: 999px; background: var(--surface);
    }
    .thumb {
      position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px;
      background: var(--ink); transition: transform .35s var(--ease);
    }
    .switch.en .thumb { transform: translateX(100%); }
    button {
      position: relative; z-index: 1; border: 0; background: transparent; cursor: pointer; padding: 0 11px;
      font-size: .74rem; font-weight: 700; letter-spacing: .06em; color: var(--text-2); transition: color .3s var(--ease);
    }
    button.active { color: var(--ink-contrast); }
  `,
  template: `
    <div class="switch" [class.en]="i18n.lang() === 'en'" role="group" [attr.aria-label]="'lang.label' | t">
      <span class="thumb" aria-hidden="true"></span>
      @for (l of langs; track l) {
        <button type="button" [class.active]="i18n.lang() === l" [attr.aria-pressed]="i18n.lang() === l"
          [attr.lang]="l" [title]="(l === 'fr' ? 'lang.fr' : 'lang.en') | t" (click)="i18n.set(l)">
          {{ l.toUpperCase() }}
        </button>
      }
    </div>
  `,
})
export class LangToggleComponent {
  protected readonly i18n = inject(I18n);
  protected readonly langs: Lang[] = ['fr', 'en'];
}
