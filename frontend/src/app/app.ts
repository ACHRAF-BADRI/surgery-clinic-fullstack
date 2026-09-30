import { ChangeDetectionStrategy, Component } from '@angular/core';
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
export class App {}
