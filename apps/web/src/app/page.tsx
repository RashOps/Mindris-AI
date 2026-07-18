import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileText,
  Link2,
  MonitorCog,
  Target,
  Upload,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    id: "cv-creator",
    icon: Target,
    label: "Disponible",
    title: "CV Builder",
    description:
      "Éditeur guidé pour importer un CV, le structurer, ajuster le style et exporter un PDF cohérent avec la preview.",
    cta: { label: "Ouvrir le studio", href: "/dashboard" },
    available: true,
  },
  {
    id: "markdown-pdf",
    icon: FileText,
    label: "Disponible",
    title: "Markdown → PDF",
    description:
      "Convertisseur pour lettres de motivation, notes et documents Markdown, avec historique des lettres persistées.",
    cta: { label: "Convertir Markdown", href: "/tools/markdown" },
    available: true,
  },
  {
    id: "ats-score",
    icon: Zap,
    label: "Disponible",
    title: "ATS Score",
    description:
      "Analyse job-aware entre ton CV et une offre réelle : mots-clés, écarts, score et recommandations actionnables.",
    cta: { label: "Lancer l’analyse", href: "/tools/ats-score" },
    available: true,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Importer le CV",
    description: "Dépose un PDF ou JSON. Le backend construit un CV structuré et réutilisable dans les outils.",
    icon: <Upload className="h-5 w-5" aria-hidden="true" />,
  },
  {
    number: "02",
    title: "Coller l’offre",
    description: "Ajoute une URL d’offre pour extraire titre, entreprise, exigences et signaux ATS exploitables.",
    icon: <Link2 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    number: "03",
    title: "Le backend travaille",
    description: "Les services backend pilotent parsing, scoring, génération et persistance sans exposer les secrets au navigateur.",
    icon: <MonitorCog className="h-5 w-5" aria-hidden="true" />,
  },
  {
    number: "04",
    title: "Télécharger le PDF",
    description: "Prévisualise, corrige, puis exporte le CV ou la lettre via le renderer local.",
    icon: <Download className="h-5 w-5" aria-hidden="true" />,
  },
];

const quickSteps = [
  ["1", "Importer le CV", "Structure ton CV source."],
  ["2", "Coller l’offre", "Récupère les exigences du poste."],
  ["3", "Exporter le PDF", "Relis, ajuste et télécharge."],
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
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Outils</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Parcours</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">GitHub <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_0_26px_rgba(37,99,235,0.35)]"
            >
              Ouvrir l’app <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 pb-24 pt-40 text-center">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-indigo-500 dark:text-indigo-300">
            <span className="land-pill-dot" />
            Studio local-first pour candidatures
          </div>

          <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-foreground md:text-7xl">
            Prépare des candidatures
            <br />
            <span className="land-gradient-text">propres, reliées et auditables.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Mindris AI relie CV, offres, score ATS, lettres, PDF et suivi dans un workspace local-first.
            Le frontend reste léger ; les décisions produit, secrets et artefacts persistés restent côté backend.
          </p>

          <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-400 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
            >
              Démarrer <ArrowRight className="h-5 w-5" aria-hidden="true" />
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">Outils</p>
          <h2 className="mb-3 text-4xl font-black text-foreground">
            Un workspace. <span className="land-gradient-text">Des outils reliés.</span>
          </h2>
          <p className="mb-12 max-w-xl text-base leading-relaxed text-muted-foreground">
            Chaque surface lit et écrit via les API backend pour garder une lignée claire entre offre, CV, score, lettre et tracker.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-7 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <f.icon className="h-8 w-8 text-indigo-500 dark:text-indigo-300" aria-hidden="true" />
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
                    {f.label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                <Link href={f.cta.href} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200">
                  {f.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">Parcours</p>
          <h2 className="mb-12 text-4xl font-black text-foreground">
            De l’offre au <span className="land-gradient-text">PDF final</span>, sans perdre le contexte.
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
              Prêt à préparer une candidature propre ?
            </h2>
            <p className="mb-8 text-base text-muted-foreground">
              Importe ton CV, ajoute une offre, vérifie les artefacts et exporte seulement quand tout est cohérent.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-400 px-10 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(37,99,235,0.35)] transition-all hover:shadow-[0_0_42px_rgba(37,99,235,0.45)]"
            >
              Ouvrir Mindris AI <ArrowRight className="h-5 w-5" aria-hidden="true" />
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
            <Link href="/tools/cv-creator" className="text-sm text-muted-foreground transition-colors hover:text-foreground">CV Builder</Link>
            <Link href="/tools/markdown" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Markdown → PDF</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Mindris AI. Créé par Rayhan.</p>
        </div>
      </footer>
    </div>
  );
}
