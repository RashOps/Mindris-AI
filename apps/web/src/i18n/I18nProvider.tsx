"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { useCVStore } from "@/store/useCVStore";
import { MESSAGES, type Messages, type UiLocale } from "./messages";

type I18nValue = {
  locale: UiLocale;
  messages: Messages;
};

const I18nContext = createContext<I18nValue>({
  locale: "fr",
  messages: MESSAGES.fr,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useCVStore((state) => state.appSettings.ui_locale);
  const value = useMemo(
    () => ({ locale, messages: MESSAGES[locale] }),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
