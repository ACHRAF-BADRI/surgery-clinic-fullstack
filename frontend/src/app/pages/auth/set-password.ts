import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { matchValidator, passwordValidator } from '../../core/validators';
import { EmptyStateComponent } from '../../ui/empty-state';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { AuthFrameComponent } from './auth-frame';

/** Password setup from an emailed link (clinic invitation or reset). */
@Component({
  selector: 'app-set-password',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, FieldErrorComponent, IconComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-frame title="Choisissez votre mot de passe" subtitle="Il vous permettra d'accéder à votre espace patient.">
      @if (!token()) {
        <app-empty-state illustration="lock" [compact]="true" title="Lien incomplet"
          message="Ce lien ne contient pas de jeton valide. Demandez un nouveau lien.">
          <a class="btn btn-primary" routerLink="/mot-de-passe-oublie">Recevoir un nouveau lien</a>
        </app-empty-state>
      } @else if (invalid()) {
        <app-empty-state illustration="error" [compact]="true" title="Lien expiré ou invalide" [message]="invalid()!">
          <a class="btn btn-primary" routerLink="/mot-de-passe-oublie">Recevoir un nouveau lien</a>
        </app-empty-state>
      } @else {
        <form class="stack" style="--gap: 18px" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="label" for="password">Nouveau mot de passe</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" />
            <app-field-error [control]="form.controls.password" label="Le mot de passe" />
          </div>
          <div class="field">
            <label class="label" for="confirm">Confirmation</label>
            <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
            <app-field-error [control]="form.controls.confirm" label="La confirmation" />
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" [class.is-loading]="loading()" [disabled]="loading()">
            Enregistrer et me connecter <app-icon name="arrow-right" [size]="16" />
          </button>
        </form>
      }
    </app-auth-frame>
  `,
})
export class SetPasswordPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly token = input<string>();
  protected readonly loading = signal(false);
  protected readonly invalid = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, passwordValidator]],
      confirm: ['', Validators.required],
    },
    { validators: matchValidator('password', 'confirm') },
  );

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.setPassword(this.token()!, this.form.getRawValue().password).subscribe({
      next: (r) => {
        this.toast.success('Mot de passe enregistré', 'Bienvenue dans votre espace.');
        this.router.navigateByUrl(this.auth.homeFor(r.user.role));
      },
      error: (e) => {
        this.loading.set(false);
        this.invalid.set(errorMessage(e));
      },
    });
  }
}
