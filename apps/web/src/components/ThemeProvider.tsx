"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("mindris-theme") as Theme | null;
    if (saved === "light" || saved === "dark") setThemeState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("mindris-theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useMindrisTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useMindrisTheme must be used inside ThemeProvider");
  return context;
}
