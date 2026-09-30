import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from './icon';
import { TranslatePipe } from '../core/i18n/i18n';

@Component({
  selector: 'app-theme-toggle',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    button {
      position: relative; width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid var(--border); background: var(--surface); color: var(--text);
      display: grid; place-items: center; cursor: pointer; overflow: hidden;
      transition: border-color .2s, background-color .3s, transform .2s;
    }
    button:hover { border-color: var(--accent-line); }
    button:active { transform: scale(.94); }
    .ico { position: absolute; display: grid; place-items: center; transition: transform .5s var(--ease), opacity .3s; }
    .sun { transform: rotate(0) scale(1); }
    .moon { transform: rotate(-90deg) scale(.4); opacity: 0; }
    .dark .sun { transform: rotate(90deg) scale(.4); opacity: 0; }
    .dark .moon { transform: rotate(0) scale(1); opacity: 1; }
  `,
  template: `
    <button type="button" [class.dark]="theme.resolved() === 'dark'" (click)="theme.toggle($event)"
      [attr.aria-label]="(theme.resolved() === 'dark' ? 'theme.toLight' : 'theme.toDark') | t"
      [attr.title]="(theme.resolved() === 'dark' ? 'theme.light' : 'theme.dark') | t">
      <span class="ico sun"><app-icon name="sun" [size]="18" /></span>
      <span class="ico moon"><app-icon name="moon" [size]="17" /></span>
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
