import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

// ── Metadata ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mindris.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mindris AI — Studio local-first de candidature",
    template: "%s | Mindris AI",
  },
  description:
    "Mindris AI relie CV, offres, score ATS, lettres et suivi dans un studio local-first dont les données restent sous votre contrôle.",
  keywords: ["AI CV builder", "resume optimizer", "ATS", "LangGraph", "RAG", "job scraper", "cover letter AI"],
  authors: [{ name: "Rayhan" }],
  openGraph: {
    title: "Mindris AI — Studio local-first de candidature",
    description:
      "Importez un CV, analysez une offre, validez les adaptations et suivez chaque candidature sans perdre le contexte.",
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "Mindris AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindris AI",
    description: "Studio local-first pour CV, analyse ATS, lettres et suivi de candidatures.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
