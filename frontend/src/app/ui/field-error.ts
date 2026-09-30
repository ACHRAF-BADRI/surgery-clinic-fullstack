import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { currentLang, translate } from '../core/i18n/i18n';

/** Error message for a reactive form field (shown after interaction). */
@Component({
  selector: 'app-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <span class="field-error" role="alert">{{ message() }}</span>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input.required<AbstractControl>();
  private tick = signal(0);

  constructor() {
    effect((onCleanup) => {
      const c = this.control();
      const sub = c.events.subscribe(() => this.tick.update((n) => n + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected readonly message = computed(() => {
    this.tick();
    const c = this.control();
    if (!c.errors || !(c.touched || c.dirty)) return null;
    const e = c.errors;
    if (e['required']) return translate('validation.required');
    if (e['email']) return translate('validation.email');
    if (e['minlength']) return translate('validation.minlength', { n: e['minlength'].requiredLength });
    if (e['maxlength']) return translate('validation.maxlength', { n: e['maxlength'].requiredLength });
    if (e['password']) return translate('validation.password');
    if (e['phone']) return translate('validation.phone');
    if (e['mismatch']) return translate('validation.mismatch');
    // Server messages are French; show a generic message in English.
    if (e['server']) return currentLang() === 'fr' ? e['server'] : translate('validation.invalid');
    return translate('validation.invalid');
  });
}
