import { useSyncExternalStore } from 'react';

export const LOCALES = ['fr', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', es: 'Español' };
type Dict = Record<string, string>;

const messages: Record<Locale, Record<string, Dict>> = { fr: {}, en: {}, es: {} };
const listeners = new Set<() => void>();
const LOCALE_KEY = 'orbe.locale';

function initial(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch { /* stockage indisponible */ }
  const nav = navigator.language.slice(0, 2);
  return (LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : 'fr';
}
let locale: Locale = initial();
document.documentElement.lang = locale;

/**
 * Chaque espace déclare ses textes sous son propre préfixe : registerMessages('carte', { fr: {...}, en: {...}, es: {...} }).
 * Ajouter une langue = ajouter son code à LOCALES et fournir ses dictionnaires ; le français sert de repli.
 */
export function registerMessages(ns: string, dicts: Partial<Record<Locale, Dict>>): void {
  for (const l of LOCALES) messages[l][ns] = { ...messages[l][ns], ...dicts[l] };
}

export function getLocale(): Locale { return locale; }
export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  document.documentElement.lang = next;
  try { localStorage.setItem(LOCALE_KEY, next); } catch { /* stockage indisponible */ }
  listeners.forEach(fn => fn());
}

/** t('carte.title') ou t('core.hello', { name }) — les variables s'écrivent {name} dans le texte. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dot = key.indexOf('.');
  const ns = key.slice(0, dot);
  const id = key.slice(dot + 1);
  let text = messages[locale][ns]?.[id] ?? messages.fr[ns]?.[id] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

/** Hook : le composant se redessine quand la langue change. */
export function useT(): typeof t {
  useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => locale);
  return t;
}
export function useLocale(): Locale {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => locale);
}

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(ts));
}
export function formatRelative(ts: number): string {
  const diff = (ts - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 2_592_000) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(ts, { dateStyle: 'medium' });
}
