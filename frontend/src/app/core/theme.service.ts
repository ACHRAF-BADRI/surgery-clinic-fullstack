import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type ThemePref = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  private systemDark = signal(this.media.matches);

  readonly preference = signal<ThemePref>(this.readPref());
  readonly resolved = computed<'light' | 'dark'>(() =>
    this.preference() === 'system' ? (this.systemDark() ? 'dark' : 'light') : (this.preference() as 'light' | 'dark'),
  );

  constructor() {
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));
    this.apply(this.preference());
  }

  /** Toggles light/dark with a circular reveal from the clicked point. */
  toggle(event?: MouseEvent) {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark', event);
  }

  set(pref: ThemePref, event?: MouseEvent) {
    const run = () => {
      this.preference.set(pref);
      this.apply(pref);
    };
    const doc = this.doc as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) {
      run();
      return;
    }
    const x = event?.clientX ?? window.innerWidth - 40;
    const y = event?.clientY ?? 40;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = this.doc.documentElement;
    root.classList.add('theme-transition');
    const transition = doc.startViewTransition(run);
    transition.ready
      .then(() =>
        root
          .animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
          )
          .finished.finally(() => root.classList.remove('theme-transition')),
      )
      .catch(() => root.classList.remove('theme-transition'));
  }

  private apply(pref: ThemePref) {
    const root = this.doc.documentElement;
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
    try {
      if (pref === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', pref);
    } catch {}
  }

  private readPref(): ThemePref {
    try {
      const v = localStorage.getItem('theme');
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
