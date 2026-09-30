import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IllustrationComponent, IllustrationKind } from './illustration';

/** Illustrated empty / error state with projected actions. */
@Component({
  selector: 'app-empty-state',
  imports: [IllustrationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      padding: clamp(28px, 6vw, 56px) 16px;
      animation: fade-up .6s var(--ease) both;
    }
    :host(.compact) { padding: 24px 12px; }
    h3 { font-size: 1.5rem; margin-top: 8px; }
    p { color: var(--text-2); max-width: 420px; font-size: .92rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 16px; }
    .actions:empty { display: none; }
  `,
  host: { '[class.compact]': 'compact()' },
  template: `
    <app-illustration [kind]="illustration()" [size]="compact() ? 150 : 210" />
    <h3>{{ title() }}</h3>
    @if (message()) {
      <p>{{ message() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
})
export class EmptyStateComponent {
  readonly illustration = input<IllustrationKind>('empty');
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly compact = input(false);
}
