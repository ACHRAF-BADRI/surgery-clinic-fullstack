import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorCode, errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { applyServerErrors, matchValidator, passwordValidator, phoneValidator } from '../../core/validators';
import { BannerComponent } from '../../ui/banner';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { AuthFrameComponent } from './auth-frame';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, FieldErrorComponent, IconComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .meter { display: flex; gap: 4px; margin-top: 4px; }
    .meter span { flex: 1; height: 4px; border-radius: 4px; background: var(--surface-3); transition: background-color .3s; }
    .meter.s1 span:nth-child(-n + 1) { background: var(--danger); }
    .meter.s2 span:nth-child(-n + 2) { background: var(--warning); }
    .meter.s3 span:nth-child(-n + 3) { background: var(--success); }
    .meter.s4 span { background: var(--success); }
  `,
  template: `
    <app-auth-frame title="Créer mon espace patient" subtitle="Quelques informations pour vous connaître.">
      @if (fileExists()) {
        <app-banner tone="info" title="Vous êtes déjà suivi(e) au cabinet" style="display: block; margin-bottom: 20px">
          Un dossier existe déjà à cette adresse. Recevez un lien par email pour activer votre compte.
          <div actions><a class="btn btn-primary btn-sm" routerLink="/mot-de-passe-oublie" [queryParams]="{ email: form.controls.email.value }">Activer mon compte</a></div>
        </app-banner>
      }
      <form class="stack" style="--gap: 18px" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="firstName">Prénom <span class="req">*</span></label>
            <input id="firstName" class="input" formControlName="firstName" autocomplete="given-name" />
            <app-field-error [control]="form.controls.firstName" label="Le prénom" />
          </div>
          <div class="field">
            <label class="label" for="lastName">Nom <span class="req">*</span></label>
            <input id="lastName" class="input" formControlName="lastName" autocomplete="family-name" />
            <app-field-error [control]="form.controls.lastName" label="Le nom" />
          </div>
          <div class="field">
            <label class="label" for="email">Email <span class="req">*</span></label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
            <app-field-error [control]="form.controls.email" label="L'email" />
          </div>
          <div class="field">
            <label class="label" for="phone">Téléphone</label>
            <input id="phone" class="input" type="tel" formControlName="phone" autocomplete="tel" />
            <app-field-error [control]="form.controls.phone" />
          </div>
          <div class="field">
            <label class="label" for="dob">Date de naissance</label>
            <input id="dob" class="input" type="date" formControlName="dateOfBirth" [max]="today" />
          </div>
          <div class="field">
            <label class="label" for="password">Mot de passe <span class="req">*</span></label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" />
            <div class="meter" [class]="'s' + strength()" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <app-field-error [control]="form.controls.password" label="Le mot de passe" />
          </div>
          <div class="field full">
            <label class="label" for="confirm">Confirmer le mot de passe <span class="req">*</span></label>
            <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
            <app-field-error [control]="form.controls.confirm" label="La confirmation" />
          </div>
        </div>
        <label class="check">
          <input type="checkbox" formControlName="consent" />
          J'accepte que mes données soient traitées par le cabinet pour la gestion de mon suivi.
        </label>
        @if (form.controls.consent.touched && !form.controls.consent.value) {
          <span class="field-error">Votre consentement est nécessaire pour créer un compte.</span>
        }
        <button class="btn btn-primary btn-lg btn-block" type="submit" [class.is-loading]="loading()" [disabled]="loading()">
          Créer mon compte <app-icon name="arrow-right" [size]="16" />
        </button>
        <p class="muted" style="text-align: center; font-size: .9rem">
          Déjà inscrit(e) ? <a class="link" routerLink="/connexion" [queryParams]="{ returnUrl: returnUrl() }">Se connecter</a>
        </p>
      </form>
    </app-auth-frame>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly returnUrl = input<string>();
  protected readonly loading = signal(false);
  protected readonly fileExists = signal(false);
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(60)]],
      lastName: ['', [Validators.required, Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', phoneValidator],
      dateOfBirth: [''],
      password: ['', [Validators.required, passwordValidator]],
      confirm: ['', Validators.required],
      consent: [false, Validators.requiredTrue],
    },
    { validators: matchValidator('password', 'confirm') },
  );

  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly strength = computed(() => {
    const p = this.password();
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
    return Math.max(1, s);
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.fileExists.set(false);
    const v = this.form.getRawValue();
    this.auth
      .register({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || undefined,
        dateOfBirth: v.dateOfBirth || null,
        password: v.password,
      })
      .subscribe({
        next: (r) => {
          this.toast.success(`Bienvenue ${r.user.firstName} !`, 'Votre espace patient est prêt.');
          const target = this.returnUrl();
          this.router.navigateByUrl(target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeFor(r.user.role));
        },
        error: (e) => {
          this.loading.set(false);
          applyServerErrors(this.form, e);
          if (errorCode(e) === 'PATIENT_FILE_EXISTS') this.fileExists.set(true);
          else this.toast.error('Inscription impossible', errorMessage(e));
        },
      });
  }
}
