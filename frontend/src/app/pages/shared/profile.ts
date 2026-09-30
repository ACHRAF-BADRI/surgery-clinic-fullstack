import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage, formatDate, ROLE_TONES } from '../../core/format';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';
import { ToastService } from '../../core/toast.service';
import { applyServerErrors, matchValidator, passwordValidator, phoneValidator } from '../../core/validators';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { SkeletonComponent } from '../../ui/skeleton';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AvatarComponent, BadgeComponent, FieldErrorComponent, IconComponent, SkeletonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .layout { display: grid; gap: 20px; align-items: start; }
    @media (min-width: 1000px) { .layout { grid-template-columns: 300px 1fr; } }
    .id { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
    .id h3 { margin-top: 6px; }
  `,
  template: `
    <div class="page-head"><div><h1>{{ 'profile.title' | t }}</h1><p>{{ 'profile.subtitle' | t }}</p></div></div>

    <div class="layout">
      <div class="card card-pad id">
        @if (auth.user(); as u) {
          <app-avatar [name]="auth.displayName()" [size]="84" />
          <h3>{{ auth.displayName() }}</h3>
          <app-badge [tone]="ROLE_TONES[u.role]">{{ i18n.role(u.role) }}</app-badge>
          <p class="muted" style="font-size: .85rem">{{ u.email }}</p>
          <hr class="divider" style="width: 100%; margin: 8px 0" />
          <dl class="kv" style="width: 100%; text-align: left">
            <dt>{{ 'profile.memberSince' | t }}</dt><dd>{{ date(u.createdAt) }}</dd>
            <dt>{{ 'profile.lastLogin' | t }}</dt><dd>{{ date(u.lastLoginAt) }}</dd>
          </dl>
        } @else {
          <app-skeleton width="84px" height="84px" [circle]="true" />
          <app-skeleton width="60%" height="20px" />
        }
      </div>

      <div class="stack" style="--gap: 20px">
        <form class="card card-pad" [formGroup]="info" (ngSubmit)="saveInfo()" novalidate>
          <div class="card-title"><h3>{{ 'profile.personalInfo' | t }}</h3><app-icon name="user" class="muted" /></div>
          <div class="form-grid">
            <div class="field">
              <label class="label" for="firstName">{{ 'common.firstName' | t }}</label>
              <input id="firstName" class="input" formControlName="firstName" autocomplete="given-name" />
              <app-field-error [control]="info.controls.firstName" />
            </div>
            <div class="field">
              <label class="label" for="lastName">{{ 'common.lastName' | t }}</label>
              <input id="lastName" class="input" formControlName="lastName" autocomplete="family-name" />
              <app-field-error [control]="info.controls.lastName" />
            </div>
            <div class="field">
              <label class="label" for="phone">{{ 'common.phone' | t }}</label>
              <input id="phone" class="input" type="tel" formControlName="phone" autocomplete="tel" />
              <app-field-error [control]="info.controls.phone" />
            </div>
            <div class="field">
              <label class="label" for="dob">{{ 'common.dateOfBirth' | t }}</label>
              <input id="dob" class="input" type="date" formControlName="dateOfBirth" />
            </div>
            <div class="field">
              <label class="label" for="gender">{{ 'common.gender' | t }}</label>
              <select id="gender" class="select" formControlName="gender">
                <option value="">{{ 'common.genderUnset' | t }}</option>
                <option value="F">{{ 'common.genderF' | t }}</option>
                <option value="M">{{ 'common.genderM' | t }}</option>
                <option value="X">{{ 'common.genderX' | t }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="postalCode">{{ 'common.postalCode' | t }}</label>
              <input id="postalCode" class="input" formControlName="postalCode" autocomplete="postal-code" />
            </div>
            <div class="field full">
              <label class="label" for="address">{{ 'common.address' | t }}</label>
              <input id="address" class="input" formControlName="address" autocomplete="street-address" />
            </div>
            <div class="field">
              <label class="label" for="city">{{ 'common.city' | t }}</label>
              <input id="city" class="input" formControlName="city" autocomplete="address-level2" />
            </div>
          </div>
          <div class="row" style="justify-content: flex-end; margin-top: 22px">
            <button class="btn btn-primary" type="submit" [class.is-loading]="savingInfo()" [disabled]="savingInfo() || info.pristine">
              <app-icon name="check" [size]="16" /> {{ 'common.save' | t }}
            </button>
          </div>
        </form>

        <form class="card card-pad" [formGroup]="pwd" (ngSubmit)="savePassword()" novalidate>
          <div class="card-title"><h3>{{ 'common.password' | t }}</h3><app-icon name="key" class="muted" /></div>
          <div class="form-grid">
            <div class="field full">
              <label class="label" for="current">{{ 'profile.currentPassword' | t }}</label>
              <input id="current" class="input" type="password" formControlName="currentPassword" autocomplete="current-password" />
              <app-field-error [control]="pwd.controls.currentPassword" />
            </div>
            <div class="field">
              <label class="label" for="new">{{ 'auth.setPassword.newPassword' | t }}</label>
              <input id="new" class="input" type="password" formControlName="newPassword" autocomplete="new-password" />
              <app-field-error [control]="pwd.controls.newPassword" />
            </div>
            <div class="field">
              <label class="label" for="confirm">{{ 'common.confirmation' | t }}</label>
              <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
              <app-field-error [control]="pwd.controls.confirm" />
            </div>
          </div>
          <div class="row" style="justify-content: flex-end; margin-top: 22px">
            <button class="btn btn-primary" type="submit" [class.is-loading]="savingPwd()" [disabled]="savingPwd()">
              <app-icon name="lock" [size]="16" /> {{ 'profile.changePassword' | t }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ProfilePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder).nonNullable;
  protected readonly i18n = inject(I18n);
  protected readonly ROLE_TONES = ROLE_TONES;
  protected readonly date = formatDate;
  protected readonly savingInfo = signal(false);
  protected readonly savingPwd = signal(false);

  protected readonly info = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    phone: ['', phoneValidator],
    dateOfBirth: [''],
    gender: [''],
    address: [''],
    city: [''],
    postalCode: [''],
  });

  protected readonly pwd = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordValidator]],
      confirm: ['', Validators.required],
    },
    { validators: matchValidator('newPassword', 'confirm') },
  );

  ngOnInit() {
    this.fill();
    this.auth.refresh().subscribe({ next: () => this.fill(), error: () => {} });
  }

  private fill() {
    const u = this.auth.user();
    if (!u) return;
    this.info.reset({
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      dateOfBirth: u.dateOfBirth ?? '',
      gender: u.gender ?? '',
      address: u.address ?? '',
      city: u.city ?? '',
      postalCode: u.postalCode ?? '',
    });
  }

  saveInfo() {
    if (this.info.invalid) {
      this.info.markAllAsTouched();
      return;
    }
    this.savingInfo.set(true);
    const v = this.info.getRawValue();
    this.auth.updateProfile({ ...v, dateOfBirth: v.dateOfBirth || undefined }).subscribe({
      next: () => {
        this.savingInfo.set(false);
        this.info.markAsPristine();
        this.toast.success(this.i18n.t('profile.toastSaved'));
      },
      error: (e) => {
        this.savingInfo.set(false);
        applyServerErrors(this.info, e);
        this.toast.error(this.i18n.t('common.saveError'), errorMessage(e));
      },
    });
  }

  savePassword() {
    if (this.pwd.invalid) {
      this.pwd.markAllAsTouched();
      return;
    }
    this.savingPwd.set(true);
    const v = this.pwd.getRawValue();
    this.auth.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwd.reset();
        this.toast.success(this.i18n.t('profile.toastPassword'), this.i18n.t('profile.toastPasswordText'));
      },
      error: (e) => {
        this.savingPwd.set(false);
        this.toast.error(this.i18n.t('common.updateError'), errorMessage(e));
      },
    });
  }
}
