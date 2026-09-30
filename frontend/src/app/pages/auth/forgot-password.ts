import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../ui/empty-state';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { AuthFrameComponent } from './auth-frame';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, FieldErrorComponent, IconComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-frame title="Mot de passe oublié" subtitle="Recevez un lien sécurisé pour choisir un nouveau mot de passe ou activer votre compte.">
      @if (sent()) {
        <app-empty-state illustration="messages" [compact]="true" title="Vérifiez votre boîte mail"
          message="Si un compte ou un dossier correspond à cette adresse, un lien valable 24 h vient de vous être envoyé.">
          <a class="btn" routerLink="/connexion">Retour à la connexion</a>
        </app-empty-state>
      } @else {
        <form class="stack" style="--gap: 18px" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="label" for="email">Email</label>
            <div class="input-icon">
              <app-icon name="mail" [size]="17" />
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
            </div>
            <app-field-error [control]="form.controls.email" label="L'email" />
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" [class.is-loading]="loading()" [disabled]="loading()">
            Envoyer le lien <app-icon name="send" [size]="16" />
          </button>
          <p class="muted" style="text-align: center; font-size: .9rem"><a class="link" routerLink="/connexion">Retour à la connexion</a></p>
        </form>
      }
    </app-auth-frame>
  `,
})
export class ForgotPasswordPage implements OnInit {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  readonly email = input<string>();
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  ngOnInit() {
    if (this.email()) this.form.controls.email.setValue(this.email()!);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error('Envoi impossible', errorMessage(e));
      },
    });
  }
}
