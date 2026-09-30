import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

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
  readonly label = input('Ce champ');
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
    if (e['required']) return `${this.label()} est obligatoire.`;
    if (e['email']) return 'Adresse email invalide.';
    if (e['minlength']) return `${e['minlength'].requiredLength} caractères minimum.`;
    if (e['maxlength']) return `${e['maxlength'].requiredLength} caractères maximum.`;
    if (e['password']) return '8 caractères minimum, avec au moins une lettre et un chiffre.';
    if (e['phone']) return 'Numéro de téléphone invalide.';
    if (e['mismatch']) return 'Les mots de passe ne correspondent pas.';
    if (e['server']) return e['server'];
    return 'Valeur invalide.';
  });
}
