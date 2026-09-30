import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorApi, PatientInput } from '../../core/api';
import { errorMessage } from '../../core/format';
import { Patient } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { applyServerErrors, phoneValidator } from '../../core/validators';
import { BannerComponent } from '../../ui/banner';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { ModalComponent } from '../../ui/modal';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';

/** Creation (without account) or edit of a patient record by the doctor. */
@Component({
  selector: 'app-patient-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, FieldErrorComponent, IconComponent, BannerComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="(patient() ? 'patientForm.editTitle' : 'patients.new') | t" width="680px"
      [subtitle]="patient() ? '' : ('patientForm.createSubtitle' | t)" (closed)="closed.emit()">
      @if (!patient()) {
        <app-banner tone="warning" icon="user-x" style="display: block; margin-bottom: 18px">
          {{ 'patientForm.noAccountInfo' | t }}
        </app-banner>
      }
      <form id="patient-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="pf-first">{{ 'common.firstName' | t }} <span class="req">*</span></label>
            <input id="pf-first" class="input" formControlName="firstName" />
            <app-field-error [control]="form.controls.firstName" />
          </div>
          <div class="field">
            <label class="label" for="pf-last">{{ 'common.lastName' | t }} <span class="req">*</span></label>
            <input id="pf-last" class="input" formControlName="lastName" />
            <app-field-error [control]="form.controls.lastName" />
          </div>
          <div class="field">
            <label class="label" for="pf-email">{{ 'common.email' | t }} @if (patient()?.hasAccount) {<span class="req">*</span>}</label>
            <input id="pf-email" class="input" type="email" formControlName="email" />
            <app-field-error [control]="form.controls.email" />
          </div>
          <div class="field">
            <label class="label" for="pf-phone">{{ 'common.phone' | t }}</label>
            <input id="pf-phone" class="input" type="tel" formControlName="phone" />
            <app-field-error [control]="form.controls.phone" />
          </div>
          <div class="field">
            <label class="label" for="pf-dob">{{ 'common.dateOfBirth' | t }}</label>
            <input id="pf-dob" class="input" type="date" formControlName="dateOfBirth" />
          </div>
          <div class="field">
            <label class="label" for="pf-gender">{{ 'common.gender' | t }}</label>
            <select id="pf-gender" class="select" formControlName="gender">
              <option value="">{{ 'common.genderUnset' | t }}</option>
              <option value="F">{{ 'common.genderF' | t }}</option>
              <option value="M">{{ 'common.genderM' | t }}</option>
              <option value="X">{{ 'common.genderX' | t }}</option>
            </select>
          </div>
          <div class="field full">
            <label class="label" for="pf-address">{{ 'common.address' | t }}</label>
            <input id="pf-address" class="input" formControlName="address" />
          </div>
          <div class="field">
            <label class="label" for="pf-zip">{{ 'common.postalCode' | t }}</label>
            <input id="pf-zip" class="input" formControlName="postalCode" />
          </div>
          <div class="field">
            <label class="label" for="pf-city">{{ 'common.city' | t }}</label>
            <input id="pf-city" class="input" formControlName="city" />
          </div>
          <div class="field full">
            <label class="label" for="pf-notes">{{ 'patientForm.notes' | t }}</label>
            <textarea id="pf-notes" class="textarea" formControlName="medicalNotes" [placeholder]="'patientForm.notesPlaceholder' | t"></textarea>
          </div>
        </div>
      </form>
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">{{ 'common.cancel' | t }}</button>
        <button class="btn btn-primary" type="submit" form="patient-form" [class.is-loading]="saving()" [disabled]="saving()">
          <app-icon name="check" [size]="16" /> {{ (patient() ? 'common.save' : 'patientForm.create') | t }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class PatientFormModalComponent {
  private api = inject(DoctorApi);
  private toast = inject(ToastService);
  private i18n = inject(I18n);
  readonly open = input(false);
  readonly patient = input<Patient | null>(null);
  readonly saved = output<Patient>();
  readonly closed = output<void>();
  protected readonly saving = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', Validators.email],
    phone: ['', phoneValidator],
    dateOfBirth: [''],
    gender: [''],
    address: [''],
    city: [''],
    postalCode: [''],
    medicalNotes: [''],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const p = this.patient();
      untracked(() => {
        this.form.reset({
          firstName: p?.firstName ?? '',
          lastName: p?.lastName ?? '',
          email: p?.email ?? '',
          phone: p?.phone ?? '',
          dateOfBirth: p?.dateOfBirth ?? '',
          gender: p?.gender ?? '',
          address: p?.address ?? '',
          city: p?.city ?? '',
          postalCode: p?.postalCode ?? '',
          medicalNotes: p?.medicalNotes ?? '',
        });
        const email = this.form.controls.email;
        email.setValidators(p?.hasAccount ? [Validators.required, Validators.email] : [Validators.email]);
        email.updateValueAndValidity();
      });
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim() === '' ? undefined : val])) as unknown as PatientInput;
    const p = this.patient();
    this.saving.set(true);
    (p ? this.api.updatePatient(p.id, body) : this.api.createPatient(body)).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(this.i18n.t(p ? 'patientForm.toastUpdated' : 'patientForm.toastCreated'), p ? undefined : this.i18n.t('patientForm.toastCreatedText', { name: `${res.firstName} ${res.lastName}` }));
        this.saved.emit(res);
      },
      error: (e) => {
        this.saving.set(false);
        applyServerErrors(this.form, e);
        this.toast.error(this.i18n.t('common.saveError'), errorMessage(e));
      },
    });
  }
}
