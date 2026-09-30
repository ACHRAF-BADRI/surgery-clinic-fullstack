import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  duration: number;
  action?: { label: string; run: () => void };
  leaving?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string, opts: Partial<Toast> = {}) {
    return this.show({ kind: 'success', title, message, ...opts });
  }

  error(title: string, message?: string, opts: Partial<Toast> = {}) {
    return this.show({ kind: 'error', title, message, duration: 7000, ...opts });
  }

  info(title: string, message?: string, opts: Partial<Toast> = {}) {
    return this.show({ kind: 'info', title, message, ...opts });
  }

  warning(title: string, message?: string, opts: Partial<Toast> = {}) {
    return this.show({ kind: 'warning', title, message, duration: 6000, ...opts });
  }

  show(t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) {
    const id = ++this.seq;
    const toast: Toast = { duration: 4500, ...t, id };
    this.toasts.update((list) => [...list.slice(-3), toast]);
    this.schedule(toast);
    return id;
  }

  /** Pauses auto-dismiss (hover). */
  pause(id: number) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number) {
    const t = this.toasts().find((x) => x.id === id);
    if (t && !t.leaving) this.schedule({ ...t, duration: 2000 });
  }

  dismiss(id: number) {
    this.pause(id);
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.toasts.update((list) => list.filter((t) => t.id !== id)), 280);
  }

  private schedule(t: Toast) {
    if (t.duration <= 0) return;
    this.timers.set(
      t.id,
      setTimeout(() => this.dismiss(t.id), t.duration),
    );
  }
}
