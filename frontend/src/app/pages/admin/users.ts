import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AdminApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage, formatDate, relativeTime, ROLE_LABELS, ROLE_TONES } from '../../core/format';
import { AccountStatus, Page, Role, User } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { applyServerErrors, clean, passwordValidator, phoneValidator } from '../../core/validators';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { ModalComponent } from '../../ui/modal';
import { SkeletonListComponent } from '../../ui/skeleton';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const base = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `${base}#${(bytes[0] % 90) + 10}`;
}

@Component({
  selector: 'app-users',
  imports: [
    FormsModule, ReactiveFormsModule, AvatarComponent, BadgeComponent, BannerComponent, EmptyStateComponent, FieldErrorComponent,
    IconComponent, ModalComponent, SkeletonListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
    .toolbar .input-icon { flex: 1; min-width: 220px; max-width: 380px; }
    .toolbar .select { width: auto; min-width: 150px; }
    .who { display: flex; align-items: center; gap: 12px; }
    .who .n { font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .who .e { font-size: .78rem; color: var(--text-3); }
    .icons { display: inline-flex; gap: 4px; }
    .reason { font-size: .74rem; color: var(--danger); margin-top: 4px; max-width: 220px; }
    .pwd { display: flex; gap: 8px; }
  `,
  template: `
    <div class="page-head">
      <div><h1>Utilisateurs</h1><p>Créez, modifiez, restreignez les comptes et gérez les rôles.</p></div>
      <button class="btn btn-primary" (click)="openCreate()"><app-icon name="user-plus" [size]="17" /> Nouvel utilisateur</button>
    </div>

    <div class="toolbar">
      <div class="input-icon">
        <app-icon name="search" [size]="17" />
        <input class="input" type="search" placeholder="Nom, email, téléphone…" [value]="query()" (input)="onSearch($any($event.target).value)" aria-label="Rechercher" />
      </div>
      <div class="segmented" role="tablist" aria-label="Rôle">
        <button [class.active]="roleFilter() === ''" (click)="setRole('')">Tous</button>
        <button [class.active]="roleFilter() === 'PATIENT'" (click)="setRole('PATIENT')">Patients</button>
        <button [class.active]="roleFilter() === 'DOCTOR'" (click)="setRole('DOCTOR')">Docteurs</button>
        <button [class.active]="roleFilter() === 'ADMIN'" (click)="setRole('ADMIN')">Admins</button>
      </div>
      <select class="select" [ngModel]="statusFilter()" (ngModelChange)="setStatus($event)" aria-label="Statut">
        <option value="">Tous les statuts</option>
        <option value="ACTIVE">Actifs</option>
        <option value="RESTRICTED">Restreints</option>
      </select>
      <select class="select" [ngModel]="accountFilter()" (ngModelChange)="setAccount($event)" aria-label="Compte">
        <option value="">Avec et sans compte</option>
        <option value="with">Avec compte</option>
        <option value="without">Sans compte</option>
      </select>
    </div>

    @if (loading() && !page()) {
      <app-skeleton-list [count]="8" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="error" title="Liste indisponible" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
        </app-empty-state>
      </div>
    } @else if (page()!.items.length === 0) {
      <div class="card">
        <app-empty-state illustration="search" title="Aucun utilisateur" message="Aucun compte ne correspond à ces critères.">
          <button class="btn" (click)="resetFilters()">Réinitialiser les filtres</button>
        </app-empty-state>
      </div>
    } @else {
      <div class="table-wrap" [style.opacity]="loading() ? .6 : 1">
        <table class="table responsive">
          <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Inscription</th><th>Dernière connexion</th><th></th></tr></thead>
          <tbody>
            @for (u of page()!.items; track u.id) {
              <tr>
                <td data-label="Utilisateur">
                  <div class="who">
                    <app-avatar [name]="u.firstName + ' ' + u.lastName" [size]="38" [muted]="u.status === 'RESTRICTED'" />
                    <div>
                      <div class="n">{{ u.firstName }} {{ u.lastName }} @if (u.id === me()) {<app-badge size="sm" [outline]="true">Vous</app-badge>}</div>
                      <div class="e">{{ u.email || 'Pas d’email' }}{{ u.phone ? ' · ' + u.phone : '' }}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Rôle">
                  <app-badge [tone]="roleTones[u.role]">{{ roleLabels[u.role] }}</app-badge>
                  @if (!u.hasAccount) {
                    <div style="margin-top: 4px"><app-badge tone="warning" size="sm" icon="user-x">Sans compte</app-badge></div>
                  }
                </td>
                <td data-label="Statut">
                  @if (u.status === 'ACTIVE') {
                    <app-badge tone="success" [dot]="true">Actif</app-badge>
                  } @else {
                    <app-badge tone="danger" icon="ban">Restreint</app-badge>
                    @if (u.restrictionReason) {
                      <div class="reason">{{ u.restrictionReason }}</div>
                    }
                  }
                </td>
                <td data-label="Inscription">{{ d(u.createdAt) }}</td>
                <td data-label="Dernière connexion">{{ u.lastLoginAt ? rel(u.lastLoginAt) : '—' }}</td>
                <td class="actions">
                  <span class="icons">
                    <button class="btn btn-ghost btn-icon btn-sm" title="Modifier" aria-label="Modifier" (click)="openEdit(u)"><app-icon name="edit" [size]="15" /></button>
                    <button class="btn btn-ghost btn-icon btn-sm" title="Changer le rôle" aria-label="Changer le rôle" [disabled]="u.id === me()" (click)="openRole(u)"><app-icon name="shield" [size]="15" /></button>
                    <button class="btn btn-ghost btn-icon btn-sm" [title]="u.hasAccount ? 'Nouveau mot de passe' : 'Activer avec un mot de passe'" aria-label="Mot de passe" (click)="openPassword(u)"><app-icon name="key" [size]="15" /></button>
                    @if (u.status === 'ACTIVE') {
                      <button class="btn btn-ghost btn-icon btn-sm" title="Restreindre" aria-label="Restreindre" [disabled]="u.id === me()" (click)="restrict(u)"><app-icon name="lock" [size]="15" /></button>
                    } @else {
                      <button class="btn btn-ghost btn-icon btn-sm" title="Réactiver" aria-label="Réactiver" (click)="unrestrict(u)"><app-icon name="unlock" [size]="15" /></button>
                    }
                    <button class="btn btn-danger btn-icon btn-sm" title="Supprimer" aria-label="Supprimer" [disabled]="u.id === me()" (click)="remove(u)"><app-icon name="trash" [size]="15" /></button>
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (pages() > 1) {
        <div class="pagination">
          <span class="muted" style="font-size: .85rem">{{ page()!.total }} utilisateur(s) · page {{ pageIndex() + 1 }} / {{ pages() }}</span>
          <div class="row" style="--gap: 8px">
            <button class="btn btn-sm" [disabled]="pageIndex() === 0" (click)="go(pageIndex() - 1)"><app-icon name="chevron-left" [size]="15" /> Précédent</button>
            <button class="btn btn-sm" [disabled]="pageIndex() + 1 >= pages()" (click)="go(pageIndex() + 1)">Suivant <app-icon name="chevron-right" [size]="15" /></button>
          </div>
        </div>
      }
    }

    <!-- Create / edit -->
    <app-modal [open]="formOpen()" [title]="editingUser() ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'" width="640px" (closed)="formOpen.set(false)">
      <form id="user-form" [formGroup]="form" (ngSubmit)="saveUser()" novalidate>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="u-first">Prénom <span class="req">*</span></label>
            <input id="u-first" class="input" formControlName="firstName" />
            <app-field-error [control]="form.controls.firstName" label="Le prénom" />
          </div>
          <div class="field">
            <label class="label" for="u-last">Nom <span class="req">*</span></label>
            <input id="u-last" class="input" formControlName="lastName" />
            <app-field-error [control]="form.controls.lastName" label="Le nom" />
          </div>
          <div class="field">
            <label class="label" for="u-email">Email @if (!editingUser() || editingUser()!.hasAccount) {<span class="req">*</span>}</label>
            <input id="u-email" class="input" type="email" formControlName="email" />
            <app-field-error [control]="form.controls.email" label="L'email" />
          </div>
          <div class="field">
            <label class="label" for="u-phone">Téléphone</label>
            <input id="u-phone" class="input" type="tel" formControlName="phone" />
            <app-field-error [control]="form.controls.phone" />
          </div>
          @if (!editingUser()) {
            <div class="field">
              <label class="label" for="u-role">Rôle</label>
              <select id="u-role" class="select" formControlName="role">
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Docteur</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="u-pwd">Mot de passe initial <span class="req">*</span></label>
              <div class="pwd">
                <input id="u-pwd" class="input" formControlName="password" autocomplete="new-password" />
                <button class="btn btn-icon" type="button" title="Générer" aria-label="Générer un mot de passe" (click)="form.controls.password.setValue(gen())"><app-icon name="refresh" [size]="16" /></button>
              </div>
              <app-field-error [control]="form.controls.password" label="Le mot de passe" />
            </div>
          }
        </div>
      </form>
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="formOpen.set(false)">Annuler</button>
        <button class="btn btn-primary" type="submit" form="user-form" [class.is-loading]="saving()" [disabled]="saving()">
          <app-icon name="check" [size]="16" /> {{ editingUser() ? 'Enregistrer' : 'Créer' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Role -->
    <app-modal [open]="!!roleUser()" title="Changer le rôle" [subtitle]="roleUser() ? roleUser()!.firstName + ' ' + roleUser()!.lastName : ''" width="460px" (closed)="roleUser.set(null)">
      <div class="stack" style="--gap: 10px">
        @for (r of roles; track r) {
          <label class="check" style="padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px">
            <input type="radio" name="role" [value]="r" [ngModel]="newRole()" (ngModelChange)="newRole.set($event)" />
            <app-badge [tone]="roleTones[r]">{{ roleLabels[r] }}</app-badge>
            <span class="muted" style="font-size: .8rem">{{ roleHelp[r] }}</span>
          </label>
        }
        @if (roleUser() && !roleUser()!.hasAccount && newRole() !== 'PATIENT') {
          <app-banner tone="warning">Ce patient n'a pas de compte : définissez d'abord un mot de passe.</app-banner>
        }
      </div>
      <ng-container footer>
        <button class="btn btn-ghost" (click)="roleUser.set(null)">Annuler</button>
        <button class="btn btn-primary" [disabled]="saving() || newRole() === roleUser()?.role" [class.is-loading]="saving()" (click)="saveRole()">Appliquer</button>
      </ng-container>
    </app-modal>

    <!-- Password -->
    <app-modal [open]="!!pwdUser()" [title]="pwdUser()?.hasAccount ? 'Nouveau mot de passe' : 'Activer le compte'"
      [subtitle]="pwdUser() ? pwdUser()!.firstName + ' ' + pwdUser()!.lastName + (pwdUser()!.email ? ' · ' + pwdUser()!.email : '') : ''" width="480px" (closed)="pwdUser.set(null)">
      <div class="stack" style="--gap: 14px">
        @if (pwdUser() && !pwdUser()!.email) {
          <app-banner tone="warning">Ajoutez d'abord un email à cet utilisateur pour qu'il puisse se connecter.</app-banner>
        }
        <div class="field">
          <label class="label" for="np">Mot de passe</label>
          <div class="pwd">
            <input id="np" class="input" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" autocomplete="new-password" />
            <button class="btn btn-icon" type="button" title="Générer" aria-label="Générer" (click)="newPassword.set(gen())"><app-icon name="refresh" [size]="16" /></button>
            <button class="btn btn-icon" type="button" title="Copier" aria-label="Copier" (click)="copy(newPassword())"><app-icon name="file" [size]="16" /></button>
          </div>
          <span class="field-hint">8 caractères minimum, avec au moins une lettre et un chiffre. Communiquez-le de façon sécurisée.</span>
        </div>
      </div>
      <ng-container footer>
        <button class="btn btn-ghost" (click)="pwdUser.set(null)">Annuler</button>
        <button class="btn btn-primary" [disabled]="saving() || !pwdValid()" [class.is-loading]="saving()" (click)="savePassword()">
          <app-icon name="key" [size]="15" /> Enregistrer
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class UsersPage implements OnInit {
  private api = inject(AdminApi);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder).nonNullable;

  readonly role = input<string>();
  readonly statut = input<string>();

  protected readonly roles: Role[] = ['PATIENT', 'DOCTOR', 'ADMIN'];
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleTones = ROLE_TONES;
  protected readonly roleHelp: Record<Role, string> = {
    PATIENT: 'Espace patient',
    DOCTOR: 'Agenda, patients, messagerie',
    ADMIN: 'Accès complet',
  };
  protected readonly d = formatDate;
  protected readonly rel = relativeTime;
  protected readonly gen = generatePassword;
  protected readonly me = computed(() => this.auth.user()?.id);

  protected readonly query = signal('');
  protected readonly roleFilter = linkedSignal<Role | ''>(() => (this.role() as Role) ?? '');
  protected readonly statusFilter = linkedSignal<AccountStatus | ''>(() => (this.statut() as AccountStatus) ?? '');
  protected readonly accountFilter = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly page = signal<Page<User> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pages = computed(() => {
    const p = this.page();
    return p ? Math.ceil(p.total / p.size) : 0;
  });

  protected readonly formOpen = signal(false);
  protected readonly editingUser = signal<User | null>(null);
  protected readonly saving = signal(false);
  protected readonly roleUser = signal<User | null>(null);
  protected readonly newRole = signal<Role>('PATIENT');
  protected readonly pwdUser = signal<User | null>(null);
  protected readonly newPassword = signal('');
  protected readonly pwdValid = computed(() => /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/.test(this.newPassword()));

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', phoneValidator],
    role: ['PATIENT' as Role],
    password: ['', [Validators.required, passwordValidator]],
  });

  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });
  }

  ngOnInit() {
    this.load();
  }

  onSearch(q: string) {
    this.query.set(q);
    this.search$.next(q.trim());
  }

  setRole(r: Role | '') {
    this.roleFilter.set(r);
    this.pageIndex.set(0);
    this.load();
  }

  setStatus(s: AccountStatus | '') {
    this.statusFilter.set(s);
    this.pageIndex.set(0);
    this.load();
  }

  setAccount(a: string) {
    this.accountFilter.set(a);
    this.pageIndex.set(0);
    this.load();
  }

  resetFilters() {
    this.query.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
    this.accountFilter.set('');
    this.pageIndex.set(0);
    this.load();
  }

  go(i: number) {
    this.pageIndex.set(i);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .users({ q: this.query().trim(), role: this.roleFilter(), status: this.statusFilter(), account: this.accountFilter(), page: this.pageIndex() })
      .subscribe({
        next: (p) => {
          this.page.set(p);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }

  openCreate() {
    this.editingUser.set(null);
    this.form.reset({ firstName: '', lastName: '', email: '', phone: '', role: 'PATIENT', password: generatePassword() });
    this.form.controls.password.enable();
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.email.updateValueAndValidity();
    this.formOpen.set(true);
  }

  openEdit(u: User) {
    this.editingUser.set(u);
    this.form.reset({ firstName: u.firstName, lastName: u.lastName, email: u.email ?? '', phone: u.phone ?? '', role: u.role, password: '' });
    this.form.controls.password.disable();
    this.form.controls.email.setValidators(u.hasAccount ? [Validators.required, Validators.email] : [Validators.email]);
    this.form.controls.email.updateValueAndValidity();
    this.formOpen.set(true);
  }

  saveUser() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const editing = this.editingUser();
    this.saving.set(true);
    const req = editing
      ? this.api.update(editing.id, clean({ firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, dateOfBirth: editing.dateOfBirth, address: editing.address, city: editing.city, postalCode: editing.postalCode }))
      : this.api.create(clean({ firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, role: v.role, password: v.password }));
    req.subscribe({
      next: (u) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(editing ? 'Utilisateur mis à jour' : 'Utilisateur créé', editing ? undefined : `Communiquez le mot de passe à ${u.firstName} de façon sécurisée.`);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        applyServerErrors(this.form, e);
        this.toast.error('Enregistrement impossible', errorMessage(e));
      },
    });
  }

  openRole(u: User) {
    this.newRole.set(u.role);
    this.roleUser.set(u);
  }

  saveRole() {
    const u = this.roleUser();
    if (!u) return;
    this.saving.set(true);
    this.api.setRole(u.id, this.newRole()).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.roleUser.set(null);
        this.replace(r);
        this.toast.success('Rôle modifié', `${r.firstName} est désormais ${ROLE_LABELS[r.role].toLowerCase()}.`);
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error('Modification impossible', errorMessage(e));
      },
    });
  }

  openPassword(u: User) {
    this.newPassword.set(generatePassword());
    this.pwdUser.set(u);
  }

  savePassword() {
    const u = this.pwdUser();
    if (!u) return;
    this.saving.set(true);
    this.api.setPassword(u.id, this.newPassword()).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.pwdUser.set(null);
        this.replace(r);
        this.toast.success('Mot de passe défini', u.hasAccount ? undefined : 'Le compte est désormais actif.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error('Modification impossible', errorMessage(e));
      },
    });
  }

  async restrict(u: User) {
    const r = await this.confirm.ask({
      title: `Restreindre ${u.firstName} ${u.lastName} ?`,
      message: "L'utilisateur sera immédiatement déconnecté et ne pourra plus se connecter.",
      confirmLabel: 'Restreindre',
      tone: 'danger',
      input: { label: 'Motif (affiché à l’utilisateur)', placeholder: 'Ex. : comportement inapproprié', required: false },
    });
    if (!r.confirmed) return;
    this.api.setStatus(u.id, 'RESTRICTED', r.value || undefined).subscribe({
      next: (x) => {
        this.replace(x);
        this.toast.warning('Compte restreint', `${x.firstName} ${x.lastName} ne peut plus se connecter.`);
      },
      error: (e) => this.toast.error('Action impossible', errorMessage(e)),
    });
  }

  unrestrict(u: User) {
    this.api.setStatus(u.id, 'ACTIVE').subscribe({
      next: (x) => {
        this.replace(x);
        this.toast.success('Compte réactivé');
      },
      error: (e) => this.toast.error('Action impossible', errorMessage(e)),
    });
  }

  async remove(u: User) {
    const ok = await this.confirm.confirm({
      title: 'Supprimer cet utilisateur ?',
      message: `${u.firstName} ${u.lastName} sera définitivement supprimé(e)${u.role === 'PATIENT' ? ', ainsi que ses rendez-vous et conversations' : ''}.`,
      confirmLabel: 'Supprimer définitivement',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.delete(u.id).subscribe({
      next: () => {
        this.toast.success('Utilisateur supprimé');
        this.load();
      },
      error: (e) => this.toast.error('Suppression impossible', errorMessage(e)),
    });
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => this.toast.info('Copié dans le presse-papiers'),
      () => this.toast.error('Copie impossible'),
    );
  }

  private replace(u: User) {
    this.page.update((p) => (p ? { ...p, items: p.items.map((x) => (x.id === u.id ? u : x)) } : p));
  }
}
