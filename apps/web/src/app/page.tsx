import Link from "next/link";

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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Paste Job URL",
    description: "Drop a LinkedIn, Indeed or WTTJ link. The stealth scraper extracts every requirement and keyword.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Agents Work",
    description: "LangGraph orchestrates retrieval, drafting and self-correction. Watch the pipeline live in Ghost Mode.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Download PDF",
    description: "A pixel-perfect, ATS-proof PDF via Puppeteer with Shadow DOM style isolation. Your design, your rules.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: "#0f172a", color: "#f1f5f9" }}>

      {/* Animated background blobs */}
      <div className="land-blob land-blob-blue" />
      <div className="land-blob land-blob-indigo" />
      <div className="land-blob land-blob-purple" />

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "rgba(15,23,42,0.75)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}
            >
              M
            </div>
            <span className="font-bold text-lg" style={{ color: "#f1f5f9" }}>Mindris AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="land-nav-link">Features</a>
            <a href="#how-it-works" className="land-nav-link">How it works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="land-nav-link">GitHub ↗</a>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #2563eb, #818cf8)",
              boxShadow: "0 0 20px rgba(37,99,235,0.3)",
            }}
          >
            Open App →
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-24 text-center z-10">
        <div className="max-w-5xl mx-auto px-8">

          {/* Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest mb-8"
            style={{
              border: "1px solid rgba(99,102,241,0.5)",
              backgroundColor: "rgba(99,102,241,0.1)",
              color: "#818cf8",
            }}
          >
            <span className="land-pill-dot" />
            AI-Powered Career Engine
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-tight tracking-tight mb-6"
            style={{ fontSize: "clamp(2.8rem, 6vw, 4.5rem)", color: "#f1f5f9" }}
          >
            Build CVs that actually
            <br />
            <span className="land-gradient-text">get interviews.</span>
          </h1>

          {/* Sub */}
          <p className="text-lg leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: "#94a3b8" }}>
            Mindris AI scrapes job offers, matches your profile via{" "}
            <span style={{ color: "#818cf8" }}>RAG</span>, and tailors your CV
            automatically — with a live agent feed you can watch in real time.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #2563eb, #818cf8)",
                boxShadow: "0 0 30px rgba(37,99,235,0.35)",
              }}
            >
              Start for free →
            </Link>
            <Link
              href="/tools/markdown"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
                backdropFilter: "blur(8px)",
              }}
            >
              Markdown → PDF
            </Link>
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              ["1", "Upload CV", "Parse your existing resume."],
              ["2", "Paste job URL", "Extract the role requirements."],
              ["3", "Export PDF", "Review, style, and download."],
            ].map(([step, title, copy]) => (
              <div
                key={step}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-xs font-bold tracking-widest" style={{ color: "#818cf8" }}>
                  {step}
                </span>
                <p className="mt-2 text-sm font-semibold" style={{ color: "#f1f5f9" }}>{title}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "#94a3b8" }}>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#818cf8" }}>Features</p>
          <h2 className="font-black text-4xl mb-3" style={{ color: "#f1f5f9" }}>
            One engine. <span className="land-gradient-text">Multiple tools.</span>
          </h2>
          <p className="text-base leading-relaxed mb-12 max-w-xl" style={{ color: "#94a3b8" }}>
            Every tool shares the same intelligence pipeline — your CV data, your job targets, your style.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-4 p-7 rounded-2xl transition-all duration-300"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(8px)",
                  opacity: f.available ? 1 : 0.5,
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "1.75rem" }}>{f.icon}</span>
                  <span
                    className="text-xs font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
                    style={f.available
                      ? { backgroundColor: "rgba(37,99,235,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                      : { backgroundColor: "rgba(100,116,139,0.15)", color: "#475569", border: "1px solid rgba(100,116,139,0.3)" }
                    }
                  >
                    {f.label}
                  </span>
                </div>
                <h3 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#94a3b8" }}>{f.description}</p>
                {f.cta && (
                  <Link href={f.cta.href} className="text-sm font-semibold mt-1 transition-colors" style={{ color: "#818cf8" }}>
                    {f.cta.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#818cf8" }}>How it works</p>
          <h2 className="font-black text-4xl mb-12" style={{ color: "#f1f5f9" }}>
            From job URL to <span className="land-gradient-text">tailored PDF</span> in minutes.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-300"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#818cf8" }}>
                  {step.number}
                </span>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    color: "#818cf8",
                  }}
                >
                  {step.icon}
                </div>
                <h3 className="font-bold text-base" style={{ color: "#f1f5f9" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-8">
          <div
            className="rounded-3xl p-16 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(129,140,248,0.08), rgba(167,139,250,0.06))",
              border: "1px solid rgba(99,102,241,0.3)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 80px rgba(37,99,235,0.1)",
            }}
          >
            <h2 className="font-black text-4xl mb-3" style={{ color: "#f1f5f9" }}>
              Ready to master your narrative?
            </h2>
            <p className="text-base mb-8" style={{ color: "#94a3b8" }}>
              Upload your CV. Paste a job URL. Let the agents work.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #2563eb, #818cf8)",
                boxShadow: "0 0 30px rgba(37,99,235,0.4)",
              }}
            >
              Open Mindris AI →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm text-white"
              style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}
            >
              M
            </div>
            <span className="font-bold text-sm" style={{ color: "#f1f5f9" }}>Mindris AI</span>
          </div>
          <div className="flex gap-6">
            <Link href="/tools/cv-creator" className="text-sm transition-colors" style={{ color: "#475569" }}>CV Creator</Link>
            <Link href="/tools/markdown" className="text-sm transition-colors" style={{ color: "#475569" }}>Markdown → PDF</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm transition-colors" style={{ color: "#475569" }}>GitHub</a>
          </div>
          <p className="text-xs" style={{ color: "#475569" }}>© {new Date().getFullYear()} Mindris AI. Built by Rayhan.</p>
        </div>
      </footer>
    </div>
  );
}
