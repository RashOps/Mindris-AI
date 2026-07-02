"use client";

import { BookOpen } from "lucide-react";

import { GUIDE_SECTIONS } from "@/components/help/guide-content";

export default function GuidePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-4 lg:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Mindris Manual
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Mindris Guide
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <p key={item} className="text-sm leading-6 text-slate-600 dark:text-slate-300">
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
