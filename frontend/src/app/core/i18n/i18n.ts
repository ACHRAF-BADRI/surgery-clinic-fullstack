import { computed, effect, inject, Injectable, Pipe, PipeTransform, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BRAND } from '../config';
import { en } from './en';
import { fr } from './fr';

export type Lang = 'fr' | 'en';

/** Every dotted path to a string in the French dictionary, e.g. "home.hero.title". */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<typeof fr>;
export type TParams = Record<string, string | number | null | undefined>;

const DICTS: Record<Lang, unknown> = { fr, en };
const STORAGE_KEY = 'lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {}
  // First visit: English browsers get English, everyone else gets French (the clinic's language).
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/** Current language, readable from anywhere (formatters included) without DI. */
export const currentLang = signal<Lang>(initialLang());

/** BCP 47 locale used by Intl formatters. en-GB keeps day/month order, as used in France. */
export const currentLocale = computed(() => (currentLang() === 'fr' ? 'fr-FR' : 'en-GB'));

function lookup(lang: Lang, key: string): string | undefined {
  let node: unknown = DICTS[lang];
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

/** Translates a key (typed or dynamic) with {{param}} interpolation; falls back to French, then to the key. */
export function translate(key: string, params?: TParams): string {
  const raw = lookup(currentLang(), key) ?? lookup('fr', key) ?? key;
  return params ? raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? '')) : raw;
}

/** True when the key exists in the current language. */
export function hasKey(key: string): boolean {
  return lookup(currentLang(), key) !== undefined;
}

@Injectable({ providedIn: 'root' })
export class I18n {
  private doc = inject(DOCUMENT);
  readonly lang = currentLang.asReadonly();
  readonly locale = currentLocale;

  constructor() {
    effect(() => this.doc.documentElement.setAttribute('lang', currentLang()));
  }

  t(key: TKey, params?: TParams): string {
    return translate(key, params);
  }

  set(lang: Lang) {
    currentLang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }

  toggle() {
    this.set(currentLang() === 'fr' ? 'en' : 'fr');
  }

  // --- Labels for codes returned by the API -------------------------------------------------
  status = (code: string) => translate(`status.${code}`);
  role = (code: string) => translate(`role.${code}`);
  apptType = (code?: string | null) => (code ? translate(`apptTypes.${code}`) : '');
  procedure = (code?: string | null) => (code ? translate(`catalog.${code}.label`) : '');
  procedureDesc = (code?: string | null) => (code ? translate(`catalog.${code}.description`) : '');
  /** The API sends French category names; they are used as keys. */
  category = (name: string) => translate(`categories.${name}`);
  weekday = (code: string) => translate(`days.${code}`);
  rolePlural = (code: string) => translate(`rolePlural.${code}`);
}

/** Template translation: {{ 'home.hero.title' | t }} or {{ 'x.y' | t: { n: 3 } }}. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  transform(key: TKey, params?: TParams): string {
    return translate(key, params);
  }
}

/** Route titles are dictionary keys; the document title follows language changes. */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private key = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      currentLang();
      const key = this.key();
      untracked(() => {
        if (!key) return;
        const page = translate(key);
        this.title.setTitle(key === 'titles.home' ? page : `${page} · ${BRAND.name}`);
      });
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot) {
    this.key.set(this.buildTitle(snapshot));
  }
}
