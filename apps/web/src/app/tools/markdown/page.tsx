import Link from "next/link";

export default function MarkdownToolPage() {
  return (
    <div className="landing-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="blob blob-blue" />
      <div className="blob blob-indigo" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo">
            <div className="logo-icon">M</div>
            <span className="logo-text">Mindris AI</span>
          </Link>
          <div className="navbar-links">
            <Link href="/app" className="nav-link">CV Creator</Link>
            <Link href="/" className="nav-link">← Home</Link>
          </div>
        </div>
      </nav>

      {/* Coming Soon */}
      <div className="container" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "6rem" }}>
        <div style={{ textAlign: "center" }}>
          <div className="pill-badge" style={{ justifyContent: "center" }}>
            <span className="pill-dot" />
            Phase 3 — In Progress
          </div>
          <h1 className="hero-headline" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Markdown → <span className="gradient-text">PDF</span>
          </h1>
          <p className="hero-sub" style={{ margin: "0 auto 2rem" }}>
            Universal Markdown converter. Paste any content — cover letters, reports, summaries
            — and download a pixel-perfect A4 PDF. Coming in the next session.
          </p>
          <Link href="/" className="btn-ghost btn-lg">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
