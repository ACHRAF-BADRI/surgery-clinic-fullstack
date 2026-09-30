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

/** Creation (without account) or edit of a patient record by the doctor. */
@Component({
  selector: 'app-patient-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, FieldErrorComponent, IconComponent, BannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="patient() ? 'Modifier le dossier' : 'Nouveau patient'" width="680px"
      [subtitle]="patient() ? '' : 'Le dossier est créé sans compte : le patient pourra être invité plus tard.'" (closed)="closed.emit()">
      @if (!patient()) {
        <app-banner tone="warning" icon="user-x" style="display: block; margin-bottom: 18px">
          Ce patient sera marqué <strong>« Sans compte »</strong>. Ajoutez son email pour pouvoir l'inviter à créer son espace.
        </app-banner>
      }
      <form id="patient-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="pf-first">Prénom <span class="req">*</span></label>
            <input id="pf-first" class="input" formControlName="firstName" />
            <app-field-error [control]="form.controls.firstName" label="Le prénom" />
          </div>
          <div class="field">
            <label class="label" for="pf-last">Nom <span class="req">*</span></label>
            <input id="pf-last" class="input" formControlName="lastName" />
            <app-field-error [control]="form.controls.lastName" label="Le nom" />
          </div>
          <div class="field">
            <label class="label" for="pf-email">Email @if (patient()?.hasAccount) {<span class="req">*</span>}</label>
            <input id="pf-email" class="input" type="email" formControlName="email" />
            <app-field-error [control]="form.controls.email" label="L'email" />
          </div>
          <div class="field">
            <label class="label" for="pf-phone">Téléphone</label>
            <input id="pf-phone" class="input" type="tel" formControlName="phone" />
            <app-field-error [control]="form.controls.phone" />
          </div>
          <div class="field">
            <label class="label" for="pf-dob">Date de naissance</label>
            <input id="pf-dob" class="input" type="date" formControlName="dateOfBirth" />
          </div>
          <div class="field">
            <label class="label" for="pf-gender">Genre</label>
            <select id="pf-gender" class="select" formControlName="gender">
              <option value="">— Non précisé —</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
              <option value="X">Autre</option>
            </select>
          </div>
          <div class="field full">
            <label class="label" for="pf-address">Adresse</label>
            <input id="pf-address" class="input" formControlName="address" />
          </div>
          <div class="field">
            <label class="label" for="pf-zip">Code postal</label>
            <input id="pf-zip" class="input" formControlName="postalCode" />
          </div>
          <div class="field">
            <label class="label" for="pf-city">Ville</label>
            <input id="pf-city" class="input" formControlName="city" />
          </div>
          <div class="field full">
            <label class="label" for="pf-notes">Notes médicales (privées)</label>
            <textarea id="pf-notes" class="textarea" formControlName="medicalNotes" placeholder="Antécédents, allergies, traitements… Jamais visibles par le patient."></textarea>
          </div>
        </div>
      </form>
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">Annuler</button>
        <button class="btn btn-primary" type="submit" form="patient-form" [class.is-loading]="saving()" [disabled]="saving()">
          <app-icon name="check" [size]="16" /> {{ patient() ? 'Enregistrer' : 'Créer le dossier' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class PatientFormModalComponent {
  private api = inject(DoctorApi);
  private toast = inject(ToastService);
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
        this.toast.success(p ? 'Dossier mis à jour' : 'Patient créé', p ? undefined : `${res.firstName} ${res.lastName} a été ajouté(e) sans compte.`);
        this.saved.emit(res);
      },
      error: (e) => {
        this.saving.set(false);
        applyServerErrors(this.form, e);
        this.toast.error('Enregistrement impossible', errorMessage(e));
      },
    });
  }
}
