import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import en, { type Dictionary } from '@/i18n/en';
import sw from '@/i18n/sw';
import { APP_STRINGS, type AppStrings } from '@/i18n/app-strings';
import { isLocale, type Locale } from '@/i18n/config';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'herufi-locale';
const DICTS: Record<Locale, Dictionary> = { en, sw };

type Value = { locale: Locale; t: Dictionary; a: AppStrings; setLocale: (l: Locale) => void };
const I18nContext = createContext<Value | null>(null);

function initialLocale(): Locale {
  const saved = readJSON<string | null>(KEY, null);
  if (isLocale(saved)) return saved;
  return getLocales()[0]?.languageCode === 'sw' ? 'sw' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => { writeJSON(KEY, l); setLocaleState(l); }, []);
  const value = useMemo(() => ({ locale, t: DICTS[locale], a: APP_STRINGS[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
