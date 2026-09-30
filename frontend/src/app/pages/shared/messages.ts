import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DoctorApi, PatientApi, PublicApi } from '../../core/api';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage, formatDayLong, formatTime, relativeTime, ymdInZone } from '../../core/format';
import { Message, Thread, ThreadDetail } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { UnreadService } from '../../core/unread.service';
import { BRAND } from '../../core/config';
import { AvatarComponent } from '../../ui/avatar';
import { BadgeComponent } from '../../ui/badge';
import { BannerComponent } from '../../ui/banner';
import { EmptyStateComponent } from '../../ui/empty-state';
import { FieldErrorComponent } from '../../ui/field-error';
import { IconComponent } from '../../ui/icon';
import { ModalComponent } from '../../ui/modal';
import { SkeletonListComponent } from '../../ui/skeleton';
import { I18n, TKey, TranslatePipe } from '../../core/i18n/i18n';

type Filter = 'all' | 'unread' | 'open' | 'guest' | 'closed';

@Component({
  selector: 'app-messages',
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink, AvatarComponent, BadgeComponent, BannerComponent, EmptyStateComponent,
    IconComponent, SkeletonListComponent, ModalComponent, FieldErrorComponent, TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .shell {
      display: grid; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface);
      overflow: hidden; height: calc(100dvh - 210px); min-height: 520px;
    }
    @media (min-width: 900px) { .shell { grid-template-columns: 340px 1fr; } }
    .list { display: flex; flex-direction: column; border-right: 1px solid var(--border); min-height: 0; }
    .list-head { padding: 14px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
    .threads { overflow-y: auto; flex: 1; }
    .thread {
      display: flex; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; position: relative;
      transition: background-color .2s var(--ease);
    }
    .thread:hover { background: var(--surface-2); }
    .thread.active { background: var(--accent-soft); }
    .thread.active::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); }
    .thread .info { flex: 1; min-width: 0; }
    .thread .top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    .thread .name { font-weight: 700; font-size: .88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .thread .when { font-size: .72rem; color: var(--text-3); flex-shrink: 0; }
    .thread .subject { font-size: .82rem; font-weight: 600; color: var(--text-2); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .thread .preview { font-size: .8rem; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
    .thread.unread .name, .thread.unread .subject { color: var(--text); }
    .thread .tags { display: flex; gap: 6px; margin-top: 6px; }
    .unread-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 6px; }

    .conv { display: flex; flex-direction: column; min-height: 0; }
    .conv-head { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .conv-head .t { flex: 1; min-width: 180px; }
    .conv-head h3 { font-size: 1.3rem; }
    .conv-head .meta { font-size: .8rem; color: var(--text-2); display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 2px; }
    .conv-head .meta a:hover { color: var(--accent); }
    .msgs { flex: 1; overflow-y: auto; padding: 20px 18px; display: flex; flex-direction: column; gap: 10px; background: var(--bg); }
    .sep { align-self: center; font-size: .72rem; color: var(--text-3); padding: 4px 12px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); margin: 8px 0; }
    .bubble {
      max-width: min(78%, 560px); padding: 12px 15px; border-radius: 18px 18px 18px 6px; background: var(--surface);
      border: 1px solid var(--border); white-space: pre-wrap; word-break: break-word; font-size: .9rem; line-height: 1.55;
      animation: scale-in .3s var(--ease) both;
    }
    .bubble.mine { align-self: flex-end; background: var(--ink); color: var(--ink-contrast); border-color: var(--ink); border-radius: 18px 18px 6px 18px; }
    .bubble .by { font-size: .72rem; font-weight: 700; opacity: .7; margin-bottom: 4px; }
    .bubble .at { font-size: .68rem; opacity: .6; margin-top: 6px; text-align: right; }
    .composer { border-top: 1px solid var(--border); padding: 12px; display: flex; gap: 10px; align-items: flex-end; background: var(--surface); }
    .composer textarea { min-height: 48px; max-height: 180px; resize: none; }
    .back { display: inline-flex; }
    @media (min-width: 900px) { .back { display: none; } }
    @media (max-width: 899px) {
      .shell.has-selection .list { display: none; }
      .shell:not(.has-selection) .conv { display: none; }
    }
  `,
  template: `
    <div class="page-head">
      <div>
        <h1>{{ 'messages.title' | t }}</h1>
        <p>{{ (isDoctor() ? 'messages.subtitleDoctor' : 'messages.subtitlePatient') | t }}</p>
      </div>
      @if (!isDoctor()) {
        <button class="btn btn-primary" (click)="composeOpen.set(true)"><app-icon name="plus" [size]="17" /> {{ 'messages.new' | t }}</button>
      }
    </div>

    <div class="shell" [class.has-selection]="!!id()">
      <div class="list">
        @if (isDoctor()) {
          <div class="list-head">
            <div class="segmented" role="tablist" [attr.aria-label]="'messages.filter' | t">
              @for (f of filters; track f.key) {
                <button role="tab" [class.active]="filter() === f.key" (click)="setFilter(f.key)">{{ f.label | t }}</button>
              }
            </div>
          </div>
        }
        <div class="threads">
          @if (threadsLoading()) {
            <app-skeleton-list [count]="6" [framed]="false" />
          } @else if (threadsError()) {
            <app-empty-state [compact]="true" illustration="error" [title]="'common.loadError' | t" [message]="threadsError()!">
              <button class="btn btn-sm" (click)="loadThreads()">{{ 'common.retry' | t }}</button>
            </app-empty-state>
          } @else if (threads().length === 0) {
            <app-empty-state [compact]="true" illustration="messages" [title]="'messages.emptyTitle' | t"
              [message]="(isDoctor() ? 'messages.emptyDoctor' : 'messages.emptyPatient') | t">
              @if (!isDoctor()) {
                <button class="btn btn-sm btn-primary" (click)="composeOpen.set(true)">{{ 'footer.writeDoctor' | t }}</button>
              }
            </app-empty-state>
          } @else {
            @for (t of threads(); track t.id) {
              <a class="thread" [class.active]="t.id === id()" [class.unread]="t.unread > 0" [routerLink]="[base(), t.id]">
                <app-avatar [name]="isDoctor() ? t.participantName : BRAND.name" [size]="40" [muted]="t.status === 'CLOSED'" />
                <div class="info">
                  <div class="top">
                    <span class="name">{{ isDoctor() ? t.participantName : t.subject }}</span>
                    <span class="when">{{ rel(t.lastMessageAt) }}</span>
                  </div>
                  @if (isDoctor()) {
                    <div class="subject">{{ t.subject }}</div>
                  }
                  <div class="preview">{{ t.lastMessagePreview }}</div>
                  @if (t.guest || t.status === 'CLOSED') {
                    <div class="tags">
                      @if (t.guest) {
                        <app-badge tone="warning" size="sm" icon="user-x">{{ 'badges.guest' | t }}</app-badge>
                      }
                      @if (t.status === 'CLOSED') {
                        <app-badge size="sm" icon="archive">{{ 'badges.archived' | t }}</app-badge>
                      }
                    </div>
                  }
                </div>
                @if (t.unread > 0) {
                  <span class="unread-dot" [attr.aria-label]="t.unread + ' non lu(s)'"></span>
                }
              </a>
            }
          }
        </div>
      </div>

      <div class="conv">
        @if (!id()) {
          <app-empty-state illustration="messages" [title]="'messages.selectTitle' | t" [message]="'messages.selectText' | t" />
        } @else if (detailLoading() && !detail()) {
          <div style="padding: 20px"><app-skeleton-list variant="chat" [count]="4" /></div>
        } @else if (detailError()) {
          <app-empty-state illustration="error" [title]="'messages.notFound' | t" [message]="detailError()!">
            <a class="btn" [routerLink]="base()">{{ 'messages.backToList' | t }}</a>
          </app-empty-state>
        } @else if (detail(); as d) {
          <div class="conv-head">
            <a class="btn btn-ghost btn-icon back" [routerLink]="base()" [attr.aria-label]="'common.back' | t"><app-icon name="arrow-left" /></a>
            @if (isDoctor()) {
              <app-avatar [name]="d.thread.participantName" [size]="42" />
            }
            <div class="t">
              <div class="row" style="--gap: 8px">
                <h3>{{ isDoctor() ? d.thread.participantName : d.thread.subject }}</h3>
                @if (d.thread.guest) {
                  <app-badge tone="warning" size="sm" icon="user-x">{{ 'badges.guestNoAccount' | t }}</app-badge>
                }
                @if (d.thread.procedure) {
                  <app-badge tone="accent" size="sm">{{ i18n.procedure(d.thread.procedure) }}</app-badge>
                }
              </div>
              <div class="meta">
                @if (isDoctor()) {
                  <span>{{ d.thread.subject }}</span>
                  @if (d.thread.participantEmail) {
                    <a [href]="'mailto:' + d.thread.participantEmail">{{ d.thread.participantEmail }}</a>
                  }
                  @if (d.thread.participantPhone) {
                    <a [href]="'tel:' + d.thread.participantPhone">{{ d.thread.participantPhone }}</a>
                  }
                } @else {
                  <span>{{ 'messages.withClinic' | t }}</span>
                }
              </div>
            </div>
            @if (isDoctor()) {
              <div class="row" style="--gap: 6px">
                @if (d.thread.patientId) {
                  <a class="btn btn-sm" [routerLink]="['/cabinet/patients', d.thread.patientId]"><app-icon name="user" [size]="14" /> {{ 'messages.file' | t }}</a>
                }
                <button class="btn btn-sm" (click)="toggleStatus(d.thread)">
                  <app-icon [name]="d.thread.status === 'OPEN' ? 'archive' : 'refresh'" [size]="14" />
                  {{ (d.thread.status === 'OPEN' ? 'messages.archive' : 'messages.reopen') | t }}
                </button>
                <button class="btn btn-sm btn-danger btn-icon" (click)="remove(d.thread)" [title]="'common.delete' | t" [attr.aria-label]="'messages.deleteThread' | t">
                  <app-icon name="trash" [size]="14" />
                </button>
              </div>
            }
          </div>

          <div class="msgs" #scroller>
            @for (m of d.messages; track m.id; let i = $index) {
              @if (i === 0 || dayOf(m) !== dayOf(d.messages[i - 1])) {
                <span class="sep">{{ dayLabel(m.createdAt) }}</span>
              }
              <div class="bubble" [class.mine]="isMine(m)">
                @if (!isMine(m)) {
                  <div class="by">{{ m.senderName }}</div>
                }
                {{ m.body }}
                <div class="at">{{ time(m.createdAt) }}</div>
              </div>
            }
          </div>

          @if (isDoctor() && d.thread.guest) {
            <div style="padding: 10px 12px 0; background: var(--surface)">
              <app-banner tone="info" icon="mail">
                {{ 'messages.guestReplyInfo' | t: { email: d.thread.participantEmail } }}
              </app-banner>
            </div>
          }
          <form class="composer" (ngSubmit)="send()">
            <textarea class="textarea" name="reply" [(ngModel)]="reply" rows="1" [placeholder]="'messages.replyPlaceholder' | t"
              (keydown.control.enter)="send()" (keydown.meta.enter)="send()" maxlength="5000" [attr.aria-label]="'messages.yourMessage' | t"></textarea>
            <button class="btn btn-primary btn-icon" type="submit" [class.is-loading]="sending()" [disabled]="sending() || !reply().trim()" [attr.aria-label]="'common.send' | t">
              <app-icon name="send" [size]="17" />
            </button>
          </form>
        }
      </div>
    </div>

    <app-modal [open]="composeOpen()" [title]="'messages.new' | t" [subtitle]="'messages.newSubtitle' | t" (closed)="composeOpen.set(false)">
      <form class="stack" style="--gap: 16px" [formGroup]="compose" (ngSubmit)="createThread()" id="compose-form" novalidate>
        <div class="field">
          <label class="label" for="c-subject">{{ 'contact.subject' | t }} <span class="req">*</span></label>
          <input id="c-subject" class="input" formControlName="subject" />
          <app-field-error [control]="compose.controls.subject" />
        </div>
        <div class="field">
          <label class="label" for="c-proc">{{ 'contact.procedure' | t }}</label>
          <select id="c-proc" class="select" formControlName="procedure">
            <option value="">{{ 'common.none' | t }}</option>
            @for (p of procedures(); track p.code) {
              <option [value]="p.code">{{ i18n.procedure(p.code) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label class="label" for="c-body">{{ 'contact.message' | t }} <span class="req">*</span></label>
          <textarea id="c-body" class="textarea" formControlName="body" rows="5"></textarea>
          <app-field-error [control]="compose.controls.body" />
        </div>
      </form>
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="composeOpen.set(false)">{{ 'common.cancel' | t }}</button>
        <button class="btn btn-primary" type="submit" form="compose-form" [class.is-loading]="sending()" [disabled]="sending()">
          <app-icon name="send" [size]="15" /> {{ 'common.send' | t }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class MessagesPage {
  readonly mode = input<'patient' | 'doctor'>('patient');
  readonly id = input<string>();

  private patientApi = inject(PatientApi);
  private doctorApi = inject(DoctorApi);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  private unread = inject(UnreadService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly isDoctor = computed(() => this.mode() === 'doctor');
  protected readonly base = computed(() => (this.isDoctor() ? '/cabinet/messages' : '/espace/messages'));
  protected readonly filters: { key: Filter; label: TKey }[] = [
    { key: 'all', label: 'messages.filters.all' },
    { key: 'unread', label: 'messages.filters.unread' },
    { key: 'open', label: 'messages.filters.open' },
    { key: 'guest', label: 'messages.filters.guest' },
    { key: 'closed', label: 'messages.filters.closed' },
  ];
  protected readonly i18n = inject(I18n);
  protected readonly BRAND = BRAND;
  protected readonly filter = signal<Filter>('all');
  protected readonly threads = signal<Thread[]>([]);
  protected readonly threadsLoading = signal(true);
  protected readonly threadsError = signal<string | null>(null);
  protected readonly detail = signal<ThreadDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly reply = signal('');
  protected readonly sending = signal(false);
  protected readonly composeOpen = signal(false);
  protected readonly procedures = computed(() => this.clinic()?.procedures ?? []);
  private readonly clinic = toSignal(inject(PublicApi).clinic().pipe(catchError(() => of(null))), { initialValue: null });

  protected readonly compose = inject(FormBuilder).nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    procedure: [''],
    body: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(5000)]],
  });

  protected readonly rel = relativeTime;
  protected readonly time = formatTime;

  constructor() {
    // Load the thread list on startup.
    effect(() => {
      this.mode();
      untracked(() => this.loadThreads());
    });
    // Load the selected thread.
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.detail.set(null);
        this.reply.set('');
        if (id) this.loadDetail(id);
      });
    });
    // Quiet refresh every 20 s.
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      this.loadThreads(true);
      const id = this.id();
      if (id) this.loadDetail(id, true);
    }, 20_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  setFilter(f: Filter) {
    this.filter.set(f);
    this.loadThreads();
  }

  loadThreads(silent = false) {
    if (!silent) {
      this.threadsLoading.set(true);
      this.threadsError.set(null);
    }
    const obs: Observable<Thread[]> = this.isDoctor() ? this.doctorApi.threads(this.filter()) : this.patientApi.threads();
    obs.subscribe({
      next: (t) => {
        this.threads.set(t);
        this.threadsLoading.set(false);
      },
      error: (e) => {
        if (!silent) this.threadsError.set(errorMessage(e));
        this.threadsLoading.set(false);
      },
    });
  }

  private loadDetail(id: string, silent = false) {
    if (!silent) {
      this.detailLoading.set(true);
      this.detailError.set(null);
    }
    const obs = this.isDoctor() ? this.doctorApi.thread(id) : this.patientApi.thread(id);
    obs.subscribe({
      next: (d) => {
        const grew = (this.detail()?.messages.length ?? 0) !== d.messages.length;
        this.detail.set(d);
        this.detailLoading.set(false);
        if (!silent || grew) this.scrollDown();
        // The thread is now read: update locally + global counter.
        this.threads.update((l) => l.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
        this.unread.refresh();
      },
      error: (e) => {
        if (!silent) this.detailError.set(errorMessage(e));
        this.detailLoading.set(false);
      },
    });
  }

  send() {
    const body = this.reply().trim();
    const id = this.id();
    if (!body || !id || this.sending()) return;
    this.sending.set(true);
    const obs = this.isDoctor() ? this.doctorApi.reply(id, body) : this.patientApi.reply(id, body);
    obs.subscribe({
      next: (d) => {
        this.sending.set(false);
        this.reply.set('');
        this.detail.set(d);
        this.scrollDown();
        this.upsertThread(d.thread);
        if (this.isDoctor() && d.thread.guest) this.toast.success(this.i18n.t('messages.toastReplySent'), this.i18n.t('messages.toastReplySentText', { email: d.thread.participantEmail }));
      },
      error: (e) => {
        this.sending.set(false);
        this.toast.error(this.i18n.t('messages.toastNotSent'), errorMessage(e));
      },
    });
  }

  createThread() {
    if (this.compose.invalid) {
      this.compose.markAllAsTouched();
      return;
    }
    const v = this.compose.getRawValue();
    this.sending.set(true);
    this.patientApi.newThread({ subject: v.subject, procedure: v.procedure || null, body: v.body }).subscribe({
      next: (d) => {
        this.sending.set(false);
        this.composeOpen.set(false);
        this.compose.reset();
        this.upsertThread(d.thread);
        this.toast.success(this.i18n.t('contact.sentTitle'), this.i18n.t('contact.toastDoctorNotified'));
        this.router.navigate([this.base(), d.thread.id]);
      },
      error: (e) => {
        this.sending.set(false);
        this.toast.error(this.i18n.t('auth.forgot.toastError'), errorMessage(e));
      },
    });
  }

  toggleStatus(t: Thread) {
    const status = t.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.doctorApi.setThreadStatus(t.id, status).subscribe({
      next: (updated) => {
        this.detail.update((d) => (d ? { ...d, thread: updated } : d));
        this.upsertThread(updated);
        this.toast.success(this.i18n.t(status === 'CLOSED' ? 'messages.toastArchived' : 'messages.toastReopened'));
      },
      error: (e) => this.toast.error(this.i18n.t('common.actionError'), errorMessage(e)),
    });
  }

  async remove(t: Thread) {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('messages.deleteTitle'),
      message: this.i18n.t('messages.deleteText'),
      confirmLabel: this.i18n.t('common.delete'),
      tone: 'danger',
    });
    if (!ok) return;
    this.doctorApi.deleteThread(t.id).subscribe({
      next: () => {
        this.threads.update((l) => l.filter((x) => x.id !== t.id));
        this.toast.success(this.i18n.t('messages.toastDeleted'));
        this.router.navigateByUrl(this.base());
      },
      error: (e) => this.toast.error(this.i18n.t('common.deleteError'), errorMessage(e)),
    });
  }

  protected isMine(m: Message) {
    return this.isDoctor() ? m.sender === 'DOCTOR' : m.sender !== 'DOCTOR';
  }

  protected dayOf(m: Message) {
    return ymdInZone(m.createdAt);
  }

  protected dayLabel(iso: string) {
    return formatDayLong(iso);
  }

  private upsertThread(t: Thread) {
    this.threads.update((l) => [t, ...l.filter((x) => x.id !== t.id)]);
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }
}
