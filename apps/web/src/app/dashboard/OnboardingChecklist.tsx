"use client";

import Link from "next/link";
import { Check, ChevronRight, Circle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  fetchOnboarding,
  updateOnboardingStep,
  type OnboardingChecklist as Checklist,
  type OnboardingStepId,
} from "@/lib/onboarding";

export function OnboardingChecklist() {
  const { messages } = useI18n();
  const copy = messages.pages.onboarding;
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  useEffect(() => {
    void fetchOnboarding().then(setChecklist).catch(() => setChecklist(null));
  }, []);

  if (!checklist || checklist.done) return null;

  const change = (
    id: OnboardingStepId,
    status: "pending" | "skipped",
  ) => void updateOnboardingStep(id, status).then(setChecklist);

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {copy.badge}
          </p>
          <h2 className="mt-1 text-base font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {checklist.completed}/{checklist.total}
        </span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {checklist.steps.map((step) => {
          const done = step.status !== "pending";
          return (
            <div
              key={step.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              {done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {copy.steps[step.id]}
                </p>
                {step.status === "skipped" ? (
                  <button
                    type="button"
                    onClick={() => change(step.id, "pending")}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {copy.restore}
                  </button>
                ) : step.status === "pending" && step.skippable ? (
                  <button
                    type="button"
                    onClick={() => change(step.id, "skipped")}
                    className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copy.skip}
                  </button>
                ) : null}
              </div>
              {!done ? (
                <Link
                  href={step.href}
                  aria-label={copy.steps[step.id]}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

