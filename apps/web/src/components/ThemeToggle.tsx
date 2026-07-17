"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMindrisTheme } from "@/components/ThemeProvider";

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useMindrisTheme();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const isDark = theme === "dark";

  if (!hydrated) {
    return (
      <button
        className="app-toolbar-button flex h-9 items-center justify-center px-3"
        title="Chargement du thème"
        aria-label="Chargement du thème"
        disabled
        suppressHydrationWarning
      >
        <span className="h-[15px] w-[15px]" />
      </button>
    );
  }

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
