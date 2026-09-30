import { ChangeDetectionStrategy, Component, effect, inject, input, model, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoctorApi } from '../../core/api';
import { errorMessage, todayYmd, zonedToInstant } from '../../core/format';
import { AppointmentType, Slot } from '../../core/models';
import { EmptyStateComponent } from '../../ui/empty-state';
import { SkeletonComponent } from '../../ui/skeleton';

/**
 * Time picker for the doctor: free slots within the clinic's opening hours,
 * or a custom time (off-grid) — the server always checks for overlaps.
 */
@Component({
  selector: 'app-slot-picker',
  imports: [FormsModule, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .slots { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); }
    .slot {
      padding: 9px 0; border-radius: 10px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer;
      font-weight: 700; font-size: .85rem; font-variant-numeric: tabular-nums; transition: all .2s var(--ease);
    }
    .slot:hover { border-color: var(--accent); color: var(--accent); }
    .slot.sel { background: var(--accent); border-color: var(--accent); color: var(--accent-contrast); }
  `,
  template: `
    <div class="stack" style="--gap: 14px">
      <div class="form-grid">
        <div class="field">
          <label class="label" for="sp-date">Date</label>
          <input id="sp-date" class="input" type="date" [min]="today" [ngModel]="date()" (ngModelChange)="date.set($event)" />
        </div>
        <div class="field" style="justify-content: flex-end">
          <div class="segmented">
            <button type="button" [class.active]="!custom()" (click)="setCustom(false)">Créneaux libres</button>
            <button type="button" [class.active]="custom()" (click)="setCustom(true)">Horaire libre</button>
          </div>
        </div>
      </div>

      @if (custom()) {
        <div class="field" style="max-width: 200px">
          <label class="label" for="sp-time">Heure</label>
          <input id="sp-time" class="input" type="time" step="300" [ngModel]="time()" (ngModelChange)="setTime($event)" />
          <span class="field-hint">Hors grille horaire, sous votre responsabilité.</span>
        </div>
      } @else if (loading()) {
        <div class="slots">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track i) {
            <app-skeleton height="38px" rounded="10px" />
          }
        </div>
      } @else if (error()) {
        <p class="field-error">{{ error() }}</p>
      } @else if (slots().length === 0) {
        <app-empty-state [compact]="true" illustration="calendar" title="Aucun créneau libre"
          message="Choisissez une autre date ou passez en « Horaire libre »." />
      } @else {
        <div class="slots">
          @for (s of slots(); track s.startAt) {
            <button type="button" class="slot" [class.sel]="value() === s.startAt" (click)="value.set(s.startAt)">{{ s.label }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class SlotPickerComponent {
  private api = inject(DoctorApi);
  readonly type = input<AppointmentType | undefined>();
  readonly excludeId = input<string | undefined>();
  readonly date = model(todayYmd());
  /** Selected ISO instant (or null). */
  readonly value = model<string | null>(null);

  protected readonly today = todayYmd();
  protected readonly custom = signal(false);
  protected readonly time = signal('09:00');
  protected readonly slots = signal<Slot[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const date = this.date();
      const type = this.type();
      const exclude = this.excludeId();
      untracked(() => {
        if (this.custom()) this.setTime(this.time());
        else this.load(date, type, exclude);
      });
    });
  }

  setCustom(v: boolean) {
    this.custom.set(v);
    this.value.set(null);
    if (v) this.setTime(this.time());
    else this.load(this.date(), this.type(), this.excludeId());
  }

  setTime(t: string) {
    this.time.set(t);
    if (t && this.date()) this.value.set(zonedToInstant(this.date(), t).toISOString());
  }

  private load(date: string, type?: AppointmentType, exclude?: string) {
    if (!date) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.availability(date, type, exclude).subscribe({
      next: (a) => {
        this.slots.set(a.slots);
        this.loading.set(false);
        if (!a.slots.some((s) => s.startAt === this.value())) this.value.set(null);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}
