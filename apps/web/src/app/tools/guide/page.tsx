"use client";

import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from "lucide-react";

import { GUIDE_SECTIONS } from "@/components/help/guide-content";

export default function GuidePage() {
  const primaryFlow = GUIDE_SECTIONS.find(
    (section) => section.title === "Recommended daily workflow",
  );

  return (
    <main className="app-page min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <header className="app-header-surface overflow-hidden rounded-2xl px-5 py-6 lg:px-7">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <Sparkles size={13} className="text-primary" />
                Mindris Manual
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Guide visuel pour utiliser Mindris efficacement
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Un parcours opérationnel pour comprendre quoi faire, dans quel ordre,
                    et où l’application garde ses frontières entre frontend, backend,
                    renderer et stockage local.
                  </p>
                </div>
              </div>
            </div>

            {primaryFlow && (
              <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Workflow recommandé
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {primaryFlow.steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        {step}
                      </span>
                      {index < primaryFlow.steps.length - 1 && (
                        <ArrowRight size={14} className="text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {primaryFlow.tips[0]}
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="group app-surface rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {section.badge}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {section.summary}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex flex-wrap gap-2">
                    {section.steps.map((step) => (
                      <span
                        key={step}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                      >
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        {step}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {section.items.map((item, index) => (
                    <p
                      key={`${section.title}-${index}`}
                      className="text-sm leading-6 text-muted-foreground"
                    >
                      {item}
                    </p>
                  ))}
                </div>

                {section.tips.length > 0 && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">
                    {section.tips[0]}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
