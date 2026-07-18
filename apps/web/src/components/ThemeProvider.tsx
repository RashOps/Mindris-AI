"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "mindris-theme";
const THEME_CHANGE_EVENT = "mindris-theme-change";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function normalizeTheme(value: string | null | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolvePreferredTheme(
  storedTheme: string | null | undefined,
  systemPrefersDark: boolean,
): Theme {
  const normalized = normalizeTheme(storedTheme);
  if (normalized) return normalized;
  return systemPrefersDark ? "dark" : "light";
}

function applyDocumentTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readBrowserTheme(): Theme {
  return resolvePreferredTheme(
    window.localStorage.getItem(THEME_STORAGE_KEY),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

function getClientThemeSnapshot(): Theme {
  return readBrowserTheme();
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeToTheme(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => callback();

  window.queueMicrotask(notify);
  window.addEventListener("storage", notify);
  window.addEventListener(THEME_CHANGE_EVENT, notify);
  mediaQuery.addEventListener("change", notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(THEME_CHANGE_EVENT, notify);
    mediaQuery.removeEventListener("change", notify);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getClientThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    if (readBrowserTheme() !== theme) return;
    applyDocumentTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme: Theme) => {
        applyDocumentTheme(nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      },
    }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMindrisTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useMindrisTheme must be used inside ThemeProvider");
  return context;
}
