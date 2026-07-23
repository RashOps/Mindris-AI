import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Link2,
  MonitorCog,
  PackageCheck,
  Upload,
} from "lucide-react";
import { InstallCommandTabs } from "@/components/landing/InstallCommandTabs";

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
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Parcours</a>
            <a href="https://github.com/RashOps/Mindris-AI" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">GitHub <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
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

          <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
            Une candidature cohérente,
            <br />
            <span className="land-gradient-text">pas six outils déconnectés.</span>
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

      <section className="relative z-10 border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
              <PackageCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">
              Open source · Self-hosted
            </p>
            <h2 className="mt-2 text-3xl font-black text-foreground">
              Installez le cockpit sur votre machine.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Le navigateur reste un client. Les secrets, données persistées et décisions métier restent dans les services que vous exécutez.
            </p>
          </div>
          <InstallCommandTabs />
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
            <a href="https://github.com/RashOps/Mindris-AI" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Mindris AI. Créé par Rayhan.</p>
        </div>
      </footer>
    </div>
  );
}
