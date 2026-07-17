"use client";

import { Moon, Sun } from "lucide-react";
import { useMindrisTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useMindrisTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="app-toolbar-button flex h-9 items-center justify-center px-3"
      title={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
      aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
