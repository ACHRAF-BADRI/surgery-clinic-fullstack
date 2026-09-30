import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PatientApi, PublicApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BRAND } from '../../core/config';
import { errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { applyServerErrors, clean, phoneValidator } from '../../core/validators';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { UnreadService } from '../../core/unread.service';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink, BannerComponent, EmptyStateComponent, FieldErrorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .layout { display: grid; gap: 40px; align-items: start; }
    @media (min-width: 980px) { .layout { grid-template-columns: .8fr 1.2fr; } }
    .side h1 { margin: 14px 0 16px; }
    .info { display: grid; gap: 14px; margin-top: 32px; }
    .info a, .info div { display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border); transition: border-color .2s; }
    .info a:hover { border-color: var(--accent-line); }
    .info .ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); flex-shrink: 0; }
    .info small { display: block; color: var(--text-3); font-size: .75rem; }
    form { display: grid; gap: 18px; }
    .counter { font-size: .75rem; color: var(--text-3); text-align: right; }
  `,
  template: `
    <section class="section" style="padding-top: 48px">
      <div class="container layout">
        <div class="side animate-in">
          <span class="eyebrow">Contact</span>
          <h1>Écrivez au docteur.</h1>
          <p class="lead">
            Une question sur une intervention, un devis, un suivi ? Le cabinet vous répond généralement sous 48 heures ouvrées.
          </p>
          <div class="info">
            <a [href]="'tel:' + BRAND.phoneHref"><span class="ic"><app-icon name="phone" /></span><span><small>Téléphone</small>{{ BRAND.phone }}</span></a>
            <a [href]="'mailto:' + BRAND.email"><span class="ic"><app-icon name="mail" /></span><span><small>Email</small>{{ BRAND.email }}</span></a>
            <div><span class="ic"><app-icon name="map-pin" /></span><span><small>Adresse</small>{{ BRAND.address }}</span></div>
          </div>
        </div>

        <div class="card card-pad animate-in" style="animation-delay: .1s">
          @if (sent()) {
            <app-empty-state illustration="success" title="Message envoyé !"
              [message]="isPatient() ? 'Retrouvez la conversation et la réponse du docteur dans votre messagerie.' : 'Merci ! Le cabinet vous répondra par email à l’adresse indiquée.'">
              <button class="btn" (click)="reset()">Écrire un autre message</button>
              @if (!auth.isLoggedIn()) {
                <a class="btn btn-primary" routerLink="/inscription">Créer mon espace patient</a>
              }
            </app-empty-state>
          } @else if (isStaff()) {
            <app-banner tone="info" title="Vous êtes connecté en tant que membre du cabinet">
              Les messages des patients arrivent directement dans votre messagerie.
              <div actions><a class="btn btn-primary btn-sm" routerLink="/cabinet/messages">Ouvrir la messagerie</a></div>
            </app-banner>
          } @else {
            <div style="margin-bottom: 22px">
              @if (isPatient()) {
                <app-banner tone="success" title="Vous êtes connecté" icon="user-check">
                  Votre message sera ajouté à votre messagerie sécurisée : vous pourrez y suivre la réponse du docteur.
                </app-banner>
              } @else {
                <app-banner tone="accent" title="Pas de compte ? Aucun problème." icon="mail" [dismissible]="true">
                  Envoyez votre message en tant qu'invité : la réponse vous parviendra par email.
                  Pour suivre vos échanges et prendre rendez-vous, <a class="link" routerLink="/inscription">créez votre espace</a>.
                </app-banner>
              }
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (!isPatient()) {
                <div class="form-grid">
                  <div class="field">
                    <label class="label" for="name">Nom complet <span class="req">*</span></label>
                    <input id="name" class="input" formControlName="name" autocomplete="name" />
                    <app-field-error [control]="form.controls.name" label="Le nom" />
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
                    <label class="label" for="procedure">Intervention concernée</label>
                    <select id="procedure" class="select" formControlName="procedure">
                      <option value="">— Aucune en particulier —</option>
                      @for (p of procedures(); track p.code) {
                        <option [value]="p.code">{{ p.label }}</option>
                      }
                    </select>
                  </div>
                </div>
              } @else {
                <div class="field">
                  <label class="label" for="procedure">Intervention concernée</label>
                  <select id="procedure" class="select" formControlName="procedure">
                    <option value="">— Aucune en particulier —</option>
                    @for (p of procedures(); track p.code) {
                      <option [value]="p.code">{{ p.label }}</option>
                    }
                  </select>
                </div>
              }
              <div class="field">
                <label class="label" for="subject">Sujet <span class="req">*</span></label>
                <input id="subject" class="input" formControlName="subject" placeholder="Ex. : Question sur la rhinoplastie" />
                <app-field-error [control]="form.controls.subject" label="Le sujet" />
              </div>
              <div class="field">
                <label class="label" for="body">Message <span class="req">*</span></label>
                <textarea id="body" class="textarea" formControlName="body" rows="6"
                  placeholder="Décrivez votre demande. N'indiquez pas d'informations médicales sensibles si vous n'êtes pas connecté."></textarea>
                <div class="row" style="justify-content: space-between">
                  <app-field-error [control]="form.controls.body" label="Le message" />
                  <span class="counter">{{ form.controls.body.value.length }} / 5000</span>
                </div>
              </div>
              <div class="honeypot" aria-hidden="true">
                <label for="website">Site web</label>
                <input id="website" formControlName="website" tabindex="-1" autocomplete="off" />
              </div>
              <p class="muted" style="font-size: .78rem">
                En envoyant ce message, vous acceptez que vos données soient utilisées par le cabinet pour vous répondre.
              </p>
              <div class="row">
                <button class="btn btn-primary btn-lg" type="submit" [class.is-loading]="sending()" [disabled]="sending()">
                  <app-icon name="send" [size]="16" /> Envoyer le message
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </section>
  `,
})
export class ContactPage {
  protected readonly BRAND = BRAND;
  protected readonly auth = inject(AuthService);
  private publicApi = inject(PublicApi);
  private patientApi = inject(PatientApi);
  private toast = inject(ToastService);
  private router = inject(Router);
  private unread = inject(UnreadService);

  protected readonly isPatient = computed(() => this.auth.role() === 'PATIENT');
  protected readonly isStaff = computed(() => this.auth.role() === 'DOCTOR' || this.auth.role() === 'ADMIN');
  private readonly clinic = toSignal(this.publicApi.clinic().pipe(catchError(() => of(null))), { initialValue: null });
  protected readonly procedures = computed(() => this.clinic()?.procedures ?? []);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', phoneValidator],
    procedure: [''],
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    website: [''],
  });

  constructor() {
    if (this.isPatient()) {
      this.form.controls.name.disable();
      this.form.controls.email.disable();
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    if (this.isPatient()) {
      this.patientApi.newThread({ subject: v.subject, procedure: v.procedure || null, body: v.body }).subscribe({
        next: (d) => {
          this.toast.success('Message envoyé', 'Le docteur a été notifié.');
          this.unread.refresh();
          this.router.navigate(['/espace/messages', d.thread.id]);
        },
        error: (e) => this.fail(e),
      });
      return;
    }
    this.publicApi.contact(clean({ ...v, procedure: v.procedure || null })).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.toast.success('Message envoyé', 'Le cabinet vous répondra par email.');
      },
      error: (e) => this.fail(e),
    });
  }

  reset() {
    this.form.reset();
    this.sent.set(false);
  }

  private fail(e: unknown) {
    this.sending.set(false);
    applyServerErrors(this.form, e);
    this.toast.error("Le message n'a pas pu être envoyé", errorMessage(e));
  }
}
