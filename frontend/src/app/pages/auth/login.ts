import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorCode, errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { BannerComponent } from '../../ui/banner';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { AuthFrameComponent } from './auth-frame';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, FieldErrorComponent, IconComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-frame title="Bon retour parmi nous" subtitle="Connectez-vous à votre espace.">
      @if (returnUrl() === '/rendez-vous') {
        <app-banner tone="accent" icon="calendar" style="display: block; margin-bottom: 20px">
          Connectez-vous pour finaliser votre rendez-vous : votre sélection est conservée.
        </app-banner>
      }
      @if (restricted()) {
        <app-banner tone="danger" title="Compte restreint" style="display: block; margin-bottom: 20px">{{ restricted() }}</app-banner>
      }
      <form class="stack" style="--gap: 18px" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label class="label" for="email">Email</label>
          <div class="input-icon">
            <app-icon name="mail" [size]="17" />
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
          </div>
          <app-field-error [control]="form.controls.email" label="L'email" />
        </div>
        <div class="field">
          <div class="row" style="justify-content: space-between">
            <label class="label" for="password">Mot de passe</label>
            <a class="link" style="font-size: .8rem" routerLink="/mot-de-passe-oublie">Mot de passe oublié ?</a>
          </div>
          <div class="input-icon" style="position: relative">
            <app-icon name="lock" [size]="17" />
            <input id="password" class="input" [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" style="padding-right: 48px" />
            <button type="button" class="btn btn-ghost btn-icon btn-sm" style="position: absolute; right: 6px; top: 6px"
              (click)="show.set(!show())" [attr.aria-label]="show() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
              <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="17" />
            </button>
          </div>
          <app-field-error [control]="form.controls.password" label="Le mot de passe" />
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="submit" [class.is-loading]="loading()" [disabled]="loading()">
          Se connecter <app-icon name="arrow-right" [size]="16" />
        </button>
        <p class="muted" style="text-align: center; font-size: .9rem">
          Pas encore de compte ?
          <a class="link" routerLink="/inscription" [queryParams]="{ returnUrl: returnUrl() }">Créer mon espace</a>
        </p>
        <p class="muted" style="text-align: center; font-size: .82rem">
          Ou <a class="link" routerLink="/contact">continuer en tant qu'invité</a> pour envoyer un message.
        </p>
      </form>
    </app-auth-frame>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly returnUrl = input<string>();
  protected readonly loading = signal(false);
  protected readonly show = signal(false);
  protected readonly restricted = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.restricted.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (r) => {
        this.toast.success(`Bonjour ${r.user.firstName} !`, 'Vous êtes connecté.');
        const target = this.returnUrl();
        const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeFor(r.user.role);
        this.router.navigateByUrl(safe);
      },
      error: (e) => {
        this.loading.set(false);
        if (errorCode(e) === 'ACCOUNT_RESTRICTED') this.restricted.set(errorMessage(e));
        else this.toast.error('Connexion impossible', errorMessage(e));
      },
    });
  }
}
