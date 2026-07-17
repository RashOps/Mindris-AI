import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    id: "cv-creator",
    icon: "🎯",
    label: "Available now",
    title: "CV Creator",
    description:
      "Drag & drop editor powered by your real CV data. Upload once, paste any job URL — agents retrieve your most relevant experiences and rewrite every bullet point for maximum ATS compatibility.",
    cta: { label: "Open Studio", href: "/dashboard" },
    available: true,
  },
  {
    id: "markdown-pdf",
    icon: "📝",
    label: "Available now",
    title: "Markdown → PDF",
    description:
      "Universal converter. Paste any Markdown — cover letters, reports, summaries — and download a pixel-perfect A4 PDF instantly. Choose document or letter style.",
    cta: { label: "Convert Markdown", href: "/tools/markdown" },
    available: true,
  },
  {
    id: "ats-score",
    icon: "⚡",
    label: "Available now",
    title: "ATS Score",
    description:
      "Real-time keyword density analysis between your generated CV and any target job offer. Know exactly where you stand before you submit.",
    cta: { label: "Try it out", href: "/tools/ats-score" },
    available: true,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Upload Your CV",
    description: "Drop a PDF. LlamaCloud parses every experience, skill and achievement into a structured knowledge base.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Paste Job URL",
    description: "Drop a LinkedIn, Indeed or WTTJ link. The stealth scraper extracts every requirement and keyword.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Agents Work",
    description: "LangGraph orchestrates retrieval, drafting and self-correction. Watch the pipeline live in Ghost Mode.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Download PDF",
    description: "A pixel-perfect, ATS-proof PDF via Puppeteer with Shadow DOM style isolation. Your design, your rules.",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

const quickSteps = [
  ["1", "Upload CV", "Parse your existing resume."],
  ["2", "Paste job URL", "Extract the role requirements."],
  ["3", "Export PDF", "Review, style, and download."],
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="land-blob land-blob-blue" />
      <div className="land-blob land-blob-indigo" />
      <div className="land-blob land-blob-purple" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-400 text-lg font-black text-white">
              M
            </div>
            <span className="text-lg font-bold text-foreground">Mindris AI</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">GitHub ↗</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_0_26px_rgba(37,99,235,0.35)]"
            >
              Open App →
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 pb-24 pt-40 text-center">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-indigo-500 dark:text-indigo-300">
            <span className="land-pill-dot" />
            AI-Powered Career Engine
          </div>

          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-foreground md:text-7xl">
            Build CVs that actually
            <br />
            <span className="land-gradient-text">get interviews.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Mindris AI scrapes job offers, matches your profile via{" "}
            <span className="font-semibold text-indigo-500 dark:text-indigo-300">RAG</span>, and tailors your CV
            automatically — with a live agent feed you can watch in real time.
          </p>

          <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-400 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
            >
              Start for free →
            </Link>
            <Link
              href="/tools/markdown"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-medium text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Markdown → PDF
            </Link>
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {quickSteps.map(([step, title, copy]) => (
              <div key={step} className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                <span className="text-xs font-bold tracking-widest text-indigo-500 dark:text-indigo-300">{step}</span>
                <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">Features</p>
          <h2 className="mb-3 text-4xl font-black text-foreground">
            One engine. <span className="land-gradient-text">Multiple tools.</span>
          </h2>
          <p className="mb-12 max-w-xl text-base leading-relaxed text-muted-foreground">
            Every tool shares the same intelligence pipeline — your CV data, your job targets, your style.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-7 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{f.icon}</span>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
                    {f.label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                <Link href={f.cta.href} className="mt-1 text-sm font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200">
                  {f.cta.label} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">How it works</p>
          <h2 className="mb-12 text-4xl font-black text-foreground">
            From job URL to <span className="land-gradient-text">tailored PDF</span> in minutes.
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
                  {step.number}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                  {step.icon}
                </div>
                <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-8 text-center shadow-[0_0_80px_rgba(37,99,235,0.08)] md:p-16">
            <h2 className="mb-3 text-4xl font-black text-foreground">
              Ready to master your narrative?
            </h2>
            <p className="mb-8 text-base text-muted-foreground">
              Upload your CV. Paste a job URL. Let the agents work.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-400 px-10 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(37,99,235,0.35)] transition-all hover:shadow-[0_0_42px_rgba(37,99,235,0.45)]"
            >
              Open Mindris AI →
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-400 text-sm font-black text-white">
              M
            </div>
            <span className="text-sm font-bold text-foreground">Mindris AI</span>
          </Link>
          <div className="flex gap-6">
            <Link href="/tools/cv-creator" className="text-sm text-muted-foreground transition-colors hover:text-foreground">CV Creator</Link>
            <Link href="/tools/markdown" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Markdown → PDF</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mindris AI. Built by Rayhan.</p>
        </div>
      </footer>
    </div>
  );
}
