import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18n } from './core/i18n/i18n';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './ui/confirm-dialog';
import { ToastsComponent } from './ui/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toasts />
    <app-confirm-dialog />
  `,
})
export class App {
  // Instantiated at startup so <html lang> follows the selected language.
  private readonly i18n = inject(I18n);
}
