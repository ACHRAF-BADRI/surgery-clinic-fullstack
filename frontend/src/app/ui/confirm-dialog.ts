import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../core/confirm.service';
import { ModalComponent } from './modal';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = confirm.current();
    <app-modal [open]="!!c" [title]="c?.title ?? ''" width="460px" (closed)="confirm.close(false)">
      @if (c) {
        @if (c.message) {
          <p class="text-2">{{ c.message }}</p>
        }
        @if (c.input) {
          <div class="field" style="margin-top: 16px">
            <label class="label" for="confirm-input">{{ c.input.label }}</label>
            <textarea id="confirm-input" class="textarea" style="min-height: 90px" [placeholder]="c.input.placeholder ?? ''"
              [(ngModel)]="value"></textarea>
          </div>
        }
      }
      <ng-container footer>
        <button class="btn btn-ghost" type="button" (click)="confirm.close(false)">{{ c?.cancelLabel ?? 'Annuler' }}</button>
        <button class="btn" type="button" [class.btn-danger]="c?.tone === 'danger'" [class.btn-primary]="c?.tone !== 'danger'"
          [disabled]="invalid()" (click)="confirm.close(true, value())">
          {{ c?.confirmLabel ?? 'Confirmer' }}
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  protected readonly value = linkedSignal({ source: this.confirm.current, computation: () => '' });
  protected readonly invalid = computed(() => !!this.confirm.current()?.input?.required && !this.value().trim());
}
