"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "mindris-theme";

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

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return resolvePreferredTheme(
    window.localStorage.getItem(THEME_STORAGE_KEY),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyDocumentTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMindrisTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useMindrisTheme must be used inside ThemeProvider");
  return context;
}
