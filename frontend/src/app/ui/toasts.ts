import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '../core/toast.service';
import { IconComponent } from './icon';
import { TranslatePipe } from '../core/i18n/i18n';

const ICONS: Record<ToastKind, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
  warning: 'alert-triangle',
};

/** Toast stack: springy entrance, progress bar, pause on hover, swipe to dismiss. */
@Component({
  selector: 'app-toasts',
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      position: fixed;
      z-index: 1000;
      right: 16px;
      bottom: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      pointer-events: none;
    }
    @media (min-width: 640px) { :host { left: auto; right: 24px; bottom: 24px; } }
    .toast {
      --c: var(--info);
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      width: min(100%, 390px);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px 14px 16px 14px;
      border-radius: 16px;
      background: color-mix(in srgb, var(--surface) 88%, transparent);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      animation: toast-in .5s cubic-bezier(.21, 1.02, .73, 1) both;
    }
    .toast.leaving { animation: toast-out .28s var(--ease) both; }
    .success { --c: var(--success); }
    .error { --c: var(--danger); }
    .warning { --c: var(--warning); }
    .icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 14%, transparent);
    }
    .body { flex: 1; min-width: 0; padding-top: 1px; }
    .title { font-weight: 700; font-size: .9rem; }
    .msg { font-size: .84rem; color: var(--text-2); margin-top: 2px; }
    .action {
      margin-top: 8px; border: 0; background: none; padding: 0; color: var(--accent);
      font-weight: 700; font-size: .82rem; cursor: pointer;
    }
    .close {
      flex-shrink: 0; border: 0; background: transparent; color: var(--text-3); cursor: pointer;
      width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
    }
    .close:hover { background: var(--surface-2); color: var(--text); }
    .progress {
      position: absolute; left: 0; bottom: 0; height: 3px; width: 100%;
      background: var(--c); opacity: .55; transform-origin: left;
      animation: progress linear forwards;
    }
    .toast:hover .progress { animation-play-state: paused; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(24px) scale(.94); } to { opacity: 1; transform: none; } }
    @keyframes toast-out { to { opacity: 0; transform: translateX(40px) scale(.96); } }
    @keyframes progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `,
  template: `
    <div aria-live="polite" aria-atomic="false" class="sr-only">
      @for (t of toasts.toasts(); track t.id) {
        <span>{{ t.title }}. {{ t.message }}</span>
      }
    </div>
    @for (t of toasts.toasts(); track t.id) {
      <div class="toast" [class]="t.kind" [class.leaving]="t.leaving"
        (mouseenter)="toasts.pause(t.id)" (mouseleave)="toasts.resume(t.id)"
        (pointerdown)="startSwipe($event)" (pointerup)="endSwipe($event, t.id)">
        <span class="icon"><app-icon [name]="icons[t.kind]" [size]="17" [stroke]="2" /></span>
        <div class="body">
          <div class="title">{{ t.title }}</div>
          @if (t.message) {
            <div class="msg">{{ t.message }}</div>
          }
          @if (t.action) {
            <button class="action" type="button" (click)="t.action.run(); toasts.dismiss(t.id)">{{ t.action.label }}</button>
          }
        </div>
        <button class="close" type="button" (click)="toasts.dismiss(t.id)" [attr.aria-label]="'common.closeNotification' | t">
          <app-icon name="x" [size]="15" />
        </button>
        @if (t.duration > 0) {
          <span class="progress" [style.animation-duration.ms]="t.duration"></span>
        }
      </div>
    }
  `,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = ICONS;
  private swipeX = 0;

  startSwipe(e: PointerEvent) {
    this.swipeX = e.clientX;
  }

  endSwipe(e: PointerEvent, id: number) {
    if (Math.abs(e.clientX - this.swipeX) > 60) this.toasts.dismiss(id);
  }
}
