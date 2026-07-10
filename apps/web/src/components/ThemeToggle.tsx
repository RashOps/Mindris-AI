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
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
