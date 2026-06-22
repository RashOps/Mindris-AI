"use client";

import { Moon, Sun } from "lucide-react";
import { useMindrisTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useMindrisTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 w-full items-center justify-center border-t transition-colors"
      style={{ borderColor: "rgba(255,255,255,0.07)", color: "#64748b", background: "transparent" }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
