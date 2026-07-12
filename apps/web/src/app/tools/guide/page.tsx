"use client";

import { BookOpen } from "lucide-react";

import { GUIDE_SECTIONS } from "@/components/help/guide-content";

export default function GuidePage() {
  return (
    <main className="app-page min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-4 lg:px-6">
        <header className="app-header-surface rounded-xl px-5 py-5">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Mindris Manual
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Mindris Guide
                </h1>
                <p className="text-sm text-muted-foreground">
                  Product workflow, runtime boundaries, configuration model, and operational rules.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="app-surface rounded-xl p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-3">
                  {section.items.map((item, index) => (
                    <p key={`${section.title}-${index}`} className="text-sm leading-6 text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
