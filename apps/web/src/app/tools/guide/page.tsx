"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  FilePlus2,
  Map,
  Send,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import {
  guideSections,
  type GuideSection,
} from "@/components/help/guide-content";
import { loadDraft, saveDraft } from "@/lib/drafts";
import { useI18n } from "@/i18n/I18nProvider";

type GuideProgress = { completed?: string[] };

function progressKey(section: GuideSection, itemIndex: number): string {
  return `${section.id}::${itemIndex}`;
}

export default function GuidePage() {
  const { locale, messages } = useI18n();
  const copy = messages.pages.guide;
  const sections = useMemo(() => guideSections(locale), [locale]);
  const paths = useMemo(() => [
    {
      id: "first-cv" as const,
      title: copy.firstCvTitle,
      description: copy.firstCvDescription,
      icon: FilePlus2,
      sectionIds: ["product-loop", "build-resume"],
      route: "/tools/cv-creator",
      cta: copy.firstCvCta,
    },
    {
      id: "tailor" as const,
      title: copy.tailorTitle,
      description: copy.tailorDescription,
      icon: WandSparkles,
      sectionIds: ["start-from-job", "build-resume"],
      route: "/tools/cv-creator",
      cta: copy.tailorCta,
    },
    {
      id: "application" as const,
      title: copy.applicationTitle,
      description: copy.applicationDescription,
      icon: Send,
      sectionIds: ["workflow", "track-audit", "daily-path"],
      route: "/tools/workflow",
      cta: copy.applicationCta,
    },
  ], [copy]);
  const [activePathId, setActivePathId] = useState<"first-cv" | "tailor" | "application">(
    "first-cv",
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(
    "product-loop",
  );
  const [completed, setCompleted] = useState<string[]>([]);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);

  const activePath = paths.find((path) => path.id === activePathId) ?? paths[0];
  const pathSections = useMemo(
    () =>
      activePath.sectionIds
        .map((id) => sections.find((section) => section.id === id))
        .filter((section): section is GuideSection => Boolean(section)),
    [activePath, sections],
  );
  const activeSection =
    pathSections.find((section) => section.id === activeSectionId) ??
    pathSections[0];
  const pathChecklist = pathSections.flatMap((section) =>
    section.checklist.map((_, index) => progressKey(section, index)),
  );
  const completedInPath = pathChecklist.filter((key) => completed.includes(key)).length;
  const progress = pathChecklist.length
    ? Math.round((completedInPath / pathChecklist.length) * 100)
    : 0;

  useEffect(() => {
    let cancelled = false;
    void loadDraft<GuideProgress>("guide-progress")
      .then((draft) => {
        if (!cancelled && Array.isArray(draft?.completed)) {
          setCompleted(draft.completed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsProgressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPath = (path: (typeof paths)[number]) => {
    setActivePathId(path.id);
    setActiveSectionId(path.sectionIds[0]);
  };

  const toggleChecklist = (key: string) => {
    const next = completed.includes(key)
      ? completed.filter((item) => item !== key)
      : [...completed, key];
    setCompleted(next);
    void saveDraft("guide-progress", { completed: next });
  };

  return (
    <main className="app-page min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <header className="app-header-surface overflow-hidden rounded-2xl px-5 py-6 lg:px-7">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <Sparkles size={13} className="text-primary" />
                {copy.badge}
              </div>
              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <BookOpen size={20} aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {copy.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {copy.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Map className="h-4 w-4 text-primary" aria-hidden="true" />
                  {copy.progress}
                </p>
                <span className="text-sm font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {isProgressLoaded
                  ? `${completedInPath} étape${completedInPath > 1 ? "s" : ""} validée${completedInPath > 1 ? "s" : ""} sur ${pathChecklist.length}.`
                  : copy.progressLoading}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3" aria-label={copy.pathsLabel}>
          {paths.map((path) => {
            const Icon = path.icon;
            const active = path.id === activePath.id;
            return (
              <button
                key={path.id}
                id={path.id}
                type="button"
                onClick={() => selectPath(path)}
                aria-pressed={active}
                className={`min-w-[82vw] rounded-2xl border p-4 text-left transition md:min-w-0 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold">{path.title}</h2>
                <p className={`mt-1 text-sm leading-5 ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {path.description}
                </p>
              </button>
            );
          })}
        </section>

        {activeSection ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.pathSteps}
              </p>
              <div className="space-y-1">
                {pathSections.map((section, index) => (
                  <button
                    key={section.title}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      section.id === activeSection.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <activeSection.icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {activeSection.badge}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">
                      {activeSection.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {activeSection.summary}
                    </p>
                  </div>
                </div>
                <Link
                  href={activeSection.route ?? activePath.route}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground no-underline hover:bg-primary/90"
                >
                  {activePath.cta}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {copy.flow}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeSection.steps.map((step, index) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
                          {step}
                        </span>
                        {index < activeSection.steps.length - 1 ? (
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    {activeSection.items.map((item) => (
                      <p key={item} className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {copy.checklist}
                  </p>
                  <div className="mt-3 space-y-2">
                    {activeSection.checklist.map((item, index) => {
                      const key = progressKey(activeSection, index);
                      const checked = completed.includes(key);
                      return (
                        <button
                          key={item}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => toggleChecklist(key)}
                          className="flex w-full items-start gap-3 rounded-lg p-2 text-left text-sm text-foreground transition hover:bg-muted"
                        >
                          {checked ? (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <Check className="h-3 w-3" aria-hidden="true" />
                            </span>
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span className={checked ? "text-muted-foreground line-through" : ""}>
                            {item}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-primary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {activeSection.tips[0]}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
