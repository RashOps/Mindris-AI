import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

// ── Metadata ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mindris.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mindris AI — Local-first resume workflow studio",
    template: "%s | Mindris AI",
  },
  description:
    "Mindris AI is a local-first resume workflow studio. Scrape a role, adapt your CV through backend-owned APIs, generate supporting artifacts, and track each application.",
  keywords: ["AI CV builder", "resume optimizer", "ATS", "LangGraph", "RAG", "job scraper", "cover letter AI"],
  authors: [{ name: "Rayhan" }],
  openGraph: {
    title: "Mindris AI — Local-first resume workflow studio",
    description:
      "Scrape job offers, adapt your CV through backend-owned workflows, generate supporting artifacts, and track the application end to end.",
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Mindris AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindris AI",
    description: "Local-first resume workflow studio with backend-owned CV, ATS, and application flows.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  const storageKey = "mindris-theme";
  const saved = window.localStorage.getItem(storageKey);
  const theme = saved === "light" || saved === "dark"
    ? saved
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
`;

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <Script
          id="mindris-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
