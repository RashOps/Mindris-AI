import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

// ── Metadata ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mindris.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mindris AI — Precision Scraping. Agentic Rewriting. Pixel-Perfect Career.",
    template: "%s | Mindris AI",
  },
  description:
    "Mindris AI automates the bridge between job requirements and your professional profile. Upload your CV, paste a job URL, and let AI agents tailor every bullet point for maximum ATS compatibility.",
  keywords: ["AI CV builder", "resume optimizer", "ATS", "LangGraph", "RAG", "job scraper", "cover letter AI"],
  authors: [{ name: "Rayhan" }],
  openGraph: {
    title: "Mindris AI — Autonomous Career Engine",
    description:
      "Scrape job offers. Match your profile via RAG. Generate pixel-perfect, ATS-proof CVs automatically.",
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Mindris AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindris AI",
    description: "Your autonomous career architect powered by LangGraph & CrewAI.",
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
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
