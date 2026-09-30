import { ChangeDetectionStrategy, Component, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon';

/** Modal built on <dialog> (focus trap, Escape, blurred backdrop). Bottom sheet on mobile. */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog {
      width: min(100% - 24px, var(--w, 560px));
      max-height: min(92dvh, 860px);
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    dialog[open] { display: flex; flex-direction: column; animation: scale-in .35s var(--ease) both; }
    dialog::backdrop {
      background: rgba(18, 14, 12, .45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: fade-in .3s var(--ease) both;
    }
    @media (max-width: 640px) {
      dialog {
        width: 100%;
        max-width: 100%;
        margin: auto 0 0;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        max-height: 94dvh;
      }
      dialog[open] { animation: sheet-in .4s var(--ease) both; }
    }
    @keyframes sheet-in { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    header {
      display: flex; align-items: flex-start; gap: 16px; justify-content: space-between;
      padding: 22px 24px 8px;
    }
    h2 { font-size: 1.65rem; }
    .sub { color: var(--text-2); font-size: .88rem; margin-top: 4px; }
    .content { padding: 12px 24px 24px; overflow-y: auto; }
    footer {
      display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
      padding: 16px 24px; border-top: 1px solid var(--border); background: var(--surface-2);
    }
    footer:empty { display: none; }
    .close {
      border: 0; background: var(--surface-2); color: var(--text-2); width: 36px; height: 36px;
      border-radius: 50%; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
      transition: background-color .2s, color .2s, transform .2s;
    }
    .close:hover { background: var(--surface-3); color: var(--text); transform: rotate(90deg); }
  `,
  template: `
    <dialog #dlg [style.--w]="width()" (close)="closed.emit()" (click)="backdropClick($event)" [attr.aria-label]="title()">
      <header>
        <div>
          <h2>{{ title() }}</h2>
          @if (subtitle()) {
            <p class="sub">{{ subtitle() }}</p>
          }
        </div>
        <button class="close" type="button" (click)="closed.emit()" aria-label="Fermer">
          <app-icon name="x" [size]="17" />
        </button>
      </header>
      <div class="content"><ng-content /></div>
      <footer><ng-content select="[footer]" /></footer>
    </dialog>
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly subtitle = input('');
  readonly width = input('560px');
  readonly closed = output<void>();
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const d = this.dlg().nativeElement;
      if (this.open() && !d.open) d.showModal();
      if (!this.open() && d.open) d.close();
    });
  }

  backdropClick(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.closed.emit();
  }
}
