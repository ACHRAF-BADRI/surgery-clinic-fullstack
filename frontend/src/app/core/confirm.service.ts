import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  /** If set, shows a text field (e.g. a reason) whose value is returned. */
  input?: { label: string; placeholder?: string; required?: boolean };
}

interface Pending extends ConfirmOptions {
  resolve: (value: { confirmed: boolean; value: string }) => void;
}

/** Styled confirmation dialog replacing window.confirm. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<Pending | null>(null);

  ask(opts: ConfirmOptions): Promise<{ confirmed: boolean; value: string }> {
    return new Promise((resolve) => this.current.set({ ...opts, resolve }));
  }

  async confirm(opts: ConfirmOptions): Promise<boolean> {
    return (await this.ask(opts)).confirmed;
  }

  close(confirmed: boolean, value = '') {
    const c = this.current();
    this.current.set(null);
    c?.resolve({ confirmed, value });
  }
}
