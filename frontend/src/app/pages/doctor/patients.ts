import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { DoctorApi } from '../../core/api';
import { age, errorMessage, formatDate, formatDateTime } from '../../core/format';
import { Page, Patient } from '../../core/models';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { EmptyStateComponent } from '../../ui/empty-state';
import { IconComponent } from '../../ui/icon';
import { SkeletonListComponent } from '../../ui/skeleton';
import { PatientFormModalComponent } from './patient-form-modal';
import { I18n, TranslatePipe } from '../../core/i18n/i18n';

@Component({
  selector: 'app-patients',
  imports: [RouterLink, AvatarComponent, BadgeComponent, EmptyStateComponent, IconComponent, SkeletonListComponent, PatientFormModalComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
    .toolbar .input-icon { flex: 1; min-width: 240px; max-width: 460px; }
    .who { display: flex; align-items: center; gap: 12px; }
    .who .n { font-weight: 700; }
    .who .s { font-size: .78rem; color: var(--text-3); }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .contact { font-size: .84rem; display: flex; flex-direction: column; gap: 2px; }
  `,
  template: `
    <div class="page-head">
      <div><h1>{{ 'patients.title' | t }}</h1><p>{{ 'patients.subtitle' | t }}</p></div>
      <button class="btn btn-primary" (click)="creating.set(true)"><app-icon name="user-plus" [size]="17" /> {{ 'patients.new' | t }}</button>
    </div>

    <div class="toolbar">
      <div class="input-icon">
        <app-icon name="search" [size]="17" />
        <input class="input" type="search" [placeholder]="'patients.searchPlaceholder' | t" [value]="query()" (input)="onSearch($any($event.target).value)" [attr.aria-label]="'patients.search' | t" />
      </div>
      <div class="segmented" role="tablist">
        <button [class.active]="account() === ''" (click)="setAccount('')">{{ 'agenda.all' | t }}</button>
        <button [class.active]="account() === 'with'" (click)="setAccount('with')">{{ 'patients.withAccount' | t }}</button>
        <button [class.active]="account() === 'without'" (click)="setAccount('without')">{{ 'badges.noAccount' | t }}</button>
      </div>
      @if (page(); as p) {
        <span class="muted" style="margin-left: auto; font-size: .85rem">{{ 'patients.count' | t: { n: p.total } }}</span>
      }
    </div>

    @if (loading() && !page()) {
      <app-skeleton-list [count]="8" />
    } @else if (error()) {
      <div class="card">
        <app-empty-state illustration="error" [title]="'patients.error' | t" [message]="error()!">
          <button class="btn btn-primary" (click)="load()"><app-icon name="refresh" [size]="16" /> {{ 'common.retry' | t }}</button>
        </app-empty-state>
      </div>
    } @else if (page()!.items.length === 0) {
      <div class="card">
        @if (query() || account()) {
          <app-empty-state illustration="search" [title]="'patients.noResult' | t" [message]="'patients.noResultText' | t">
            <button class="btn" (click)="onSearch(''); setAccount('')">{{ 'common.reset' | t }}</button>
          </app-empty-state>
        } @else {
          <app-empty-state illustration="users" [title]="'patients.emptyTitle' | t" [message]="'patients.emptyText' | t">
            <button class="btn btn-primary" (click)="creating.set(true)">{{ 'patients.add' | t }}</button>
          </app-empty-state>
        }
      </div>
    } @else {
      <div class="table-wrap" [style.opacity]="loading() ? .6 : 1">
        <table class="table responsive">
          <thead>
            <tr><th>{{ 'patients.colPatient' | t }}</th><th>{{ 'patients.colContact' | t }}</th><th>{{ 'patients.colNext' | t }}</th><th>{{ 'patients.colCount' | t }}</th><th></th></tr>
          </thead>
          <tbody>
            @for (p of page()!.items; track p.id) {
              <tr class="clickable" (click)="open(p)">
                <td [attr.data-label]="'patients.colPatient' | t">
                  <div class="who">
                    <app-avatar [name]="p.firstName + ' ' + p.lastName" [size]="40" [muted]="p.status === 'RESTRICTED'" />
                    <div>
                      <div class="n">{{ p.firstName }} {{ p.lastName }}</div>
                      <div class="s">{{ ageOf(p) }}{{ p.city ? ' · ' + p.city : '' }}</div>
                      <div class="badges">
                        @if (!p.hasAccount) {
                          <app-badge tone="warning" icon="user-x" size="sm">{{ 'badges.noAccount' | t }}</app-badge>
                        }
                        @if (p.invitationPending) {
                          <app-badge tone="info" icon="mail" size="sm" [outline]="true">{{ 'badges.invited' | t }}</app-badge>
                        }
                        @if (p.status === 'RESTRICTED') {
                          <app-badge tone="danger" icon="ban" size="sm">{{ 'badges.restricted' | t }}</app-badge>
                        }
                      </div>
                    </div>
                  </div>
                </td>
                <td [attr.data-label]="'patients.colContact' | t">
                  <div class="contact">
                    <span>{{ p.email || '—' }}</span>
                    <span class="muted">{{ p.phone || '' }}</span>
                  </div>
                </td>
                <td [attr.data-label]="'patients.colNext' | t">
                  @if (p.nextAppointmentAt) {
                    <app-badge tone="accent" icon="calendar">{{ dt(p.nextAppointmentAt) }}</app-badge>
                  } @else {
                    <span class="muted">{{ p.lastAppointmentAt ? ('patients.last' | t: { date: d(p.lastAppointmentAt) }) : ('patients.none' | t) }}</span>
                  }
                </td>
                <td [attr.data-label]="'patients.colCount' | t">{{ p.appointmentCount }}</td>
                <td class="actions">
                  <a class="btn btn-sm" [routerLink]="['/cabinet/patients', p.id]" (click)="$event.stopPropagation()">
                    {{ 'messages.file' | t }} <app-icon name="arrow-right" [size]="14" />
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (pages() > 1) {
        <div class="pagination">
          <span class="muted" style="font-size: .85rem">{{ 'common.page' | t: { page: pageIndex() + 1, pages: pages() } }}</span>
          <div class="row" style="--gap: 8px">
            <button class="btn btn-sm" [disabled]="pageIndex() === 0" (click)="go(pageIndex() - 1)"><app-icon name="chevron-left" [size]="15" /> {{ 'common.previous' | t }}</button>
            <button class="btn btn-sm" [disabled]="pageIndex() + 1 >= pages()" (click)="go(pageIndex() + 1)">{{ 'common.next' | t }} <app-icon name="chevron-right" [size]="15" /></button>
          </div>
        </div>
      }
    }

    <app-patient-form-modal [open]="creating()" (closed)="creating.set(false)" (saved)="created($event)" />
  `,
})
export class PatientsPage {
  private api = inject(DoctorApi);
  private router = inject(Router);
  private i18n = inject(I18n);
  protected readonly query = signal('');
  protected readonly account = signal<'' | 'with' | 'without'>('');
  protected readonly pageIndex = signal(0);
  protected readonly page = signal<Page<Patient> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly pages = computed(() => {
    const p = this.page();
    return p ? Math.ceil(p.total / p.size) : 0;
  });
  protected readonly dt = formatDateTime;
  protected readonly d = formatDate;
  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });
    this.load();
  }

  onSearch(q: string) {
    this.query.set(q);
    this.search$.next(q.trim());
  }

  setAccount(a: '' | 'with' | 'without') {
    this.account.set(a);
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
    this.api.patients(this.query().trim(), this.account(), this.pageIndex()).subscribe({
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

  open(p: Patient) {
    this.router.navigate(['/cabinet/patients', p.id]);
  }

  created(p: Patient) {
    this.creating.set(false);
    this.router.navigate(['/cabinet/patients', p.id]);
  }

  protected ageOf(p: Patient) {
    const a = age(p.dateOfBirth);
    return a === null ? this.i18n.t('patients.ageUnknown') : this.i18n.t('patients.age', { n: a });
  }
}
