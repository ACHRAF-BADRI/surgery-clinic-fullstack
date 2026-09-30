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
import { I18n, TranslatePipe } from '../../core/i18n/i18n';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent, FieldErrorComponent, IconComponent, EmptyStateComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-frame title="auth.forgot.title" subtitle="auth.forgot.subtitle">
      @if (sent()) {
        <app-empty-state illustration="messages" [compact]="true" [title]="'auth.forgot.sentTitle' | t" [message]="'auth.forgot.sentText' | t">
          <a class="btn" routerLink="/connexion">{{ 'auth.forgot.backToLogin' | t }}</a>
        </app-empty-state>
      } @else {
        <form class="stack" style="--gap: 18px" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="label" for="email">{{ 'common.email' | t }}</label>
            <div class="input-icon">
              <app-icon name="mail" [size]="17" />
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
            </div>
            <app-field-error [control]="form.controls.email" />
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" [class.is-loading]="loading()" [disabled]="loading()">
            {{ 'auth.forgot.submit' | t }} <app-icon name="send" [size]="16" />
          </button>
          <p class="muted" style="text-align: center; font-size: .9rem"><a class="link" routerLink="/connexion">{{ 'auth.forgot.backToLogin' | t }}</a></p>
        </form>
      }
    </app-auth-frame>
  `,
})
export class ForgotPasswordPage implements OnInit {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  protected readonly i18n = inject(I18n);
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
        this.toast.error(this.i18n.t('auth.forgot.toastError'), errorMessage(e));
      },
    });
  }
}
