import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mindris AI — Precision Scraping. Agentic Rewriting. Pixel-Perfect Career.",
  description:
    "Mindris AI automates the bridge between job requirements and your professional profile. Upload your CV, paste a job URL, and let AI agents tailor every bullet point for maximum ATS compatibility.",
  keywords: ["AI CV builder", "resume optimizer", "ATS", "LangGraph", "RAG", "job scraper"],
  authors: [{ name: "Rayhan" }],
  openGraph: {
    title: "Mindris AI — Autonomous Career Engine",
    description:
      "Scrape job offers. Match your profile via RAG. Generate pixel-perfect, ATS-proof CVs automatically.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindris AI",
    description: "Your autonomous career architect powered by LangGraph & CrewAI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
