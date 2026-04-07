import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '../utils/i18n/en.json';
import fr from '../utils/i18n/fr.json';
import ar from '../utils/i18n/ar.json';

const translations = { en, fr, ar };

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

// Currency presets — users can also type custom ones in settings
const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'MAD', symbol: 'MAD', label: 'Moroccan Dirham (MAD)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'TND', symbol: 'TND', label: 'Tunisian Dinar (TND)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar (CA$)' },
];

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('pg_locale') || 'en');
  const [currency, setCurrency] = useState(() => localStorage.getItem('pg_currency') || 'EUR');
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem('pg_currency_symbol') || '€');

  // Apply RTL direction to document
  useEffect(() => {
    const lang = LANGUAGES.find(l => l.code === locale);
    document.documentElement.dir = lang?.dir || 'ltr';
    document.documentElement.lang = locale;
    localStorage.setItem('pg_locale', locale);
  }, [locale]);

  useEffect(() => {
    localStorage.setItem('pg_currency', currency);
    localStorage.setItem('pg_currency_symbol', currencySymbol);
  }, [currency, currencySymbol]);

  const t = useCallback((key) => {
    return translations[locale]?.[key] || translations['en']?.[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [locale]);

  // Format money with current currency
  const formatMoney = useCallback((amount) => {
    if (amount == null || isNaN(amount)) return `${currencySymbol}0`;
    const formatted = Number(amount).toLocaleString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    // For RTL currencies, put symbol after number
    if (locale === 'ar') return `${formatted} ${currencySymbol}`;
    return `${currencySymbol}${formatted}`;
  }, [currencySymbol, locale]);

  const changeCurrency = useCallback((code, symbol) => {
    setCurrency(code);
    setCurrencySymbol(symbol || CURRENCIES.find(c => c.code === code)?.symbol || code);
  }, []);

  const value = {
    locale,
    setLocale,
    t,
    dir: LANGUAGES.find(l => l.code === locale)?.dir || 'ltr',
    isRTL: locale === 'ar',
    currency,
    currencySymbol,
    changeCurrency,
    formatMoney,
    LANGUAGES,
    CURRENCIES,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components used outside provider
    return {
      locale: 'en',
      setLocale: () => {},
      t: (key) => translations['en']?.[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dir: 'ltr',
      isRTL: false,
      currency: 'EUR',
      currencySymbol: '€',
      changeCurrency: () => {},
      formatMoney: (a) => `€${Number(a || 0).toLocaleString()}`,
      LANGUAGES,
      CURRENCIES,
    };
  }
  return ctx;
}
