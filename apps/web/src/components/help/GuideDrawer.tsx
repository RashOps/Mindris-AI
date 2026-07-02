"use client";

import type { ReactElement } from "react";
import { BookOpen, FileText, GitBranch, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const GUIDE_SECTIONS = [
  {
    title: "1. Start from a job",
    icon: Search,
    items: [
      "Paste a job URL in ATS Score or CV Builder to extract structured job signals.",
      "Review company profile, role-fit hints, and ATS evidence before rewriting the CV.",
    ],
  },
  {
    title: "2. Shape the resume",
    icon: FileText,
    items: [
      "Use CV Builder for section edits, template changes, exports, and versioned resume work.",
      "Keep the frontend as an editing surface only; all durable resume state stays backend-owned.",
    ],
  },
  {
    title: "3. Drive the workflow",
    icon: GitBranch,
    items: [
      "Use Workflow to link a job, resume, ATS report, cover letter, and tracker entry.",
      "Move to Ready to apply only after the backend workflow has all required artifacts.",
    ],
  },
  {
    title: "4. Operate locally",
    icon: Settings2,
    items: [
      "Use Configuration for providers, secrets, parsing mode, and runtime diagnostics.",
      "Use Tracker reminders for follow-ups instead of burying next steps in freeform notes.",
    ],
  },
] as const;

export function GuideDrawer({ trigger }: { trigger?: ReactElement }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          trigger ?? (
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium">
              <BookOpen size={17} />
              Guide
            </Button>
          )
        }
      />
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Mindris Guide</SheetTitle>
          <SheetDescription>
            Product workflow, runtime boundaries, and the shortest path from job scrape to application.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                    <Icon size={15} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
                </div>
                <div className="space-y-2">
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
      </SheetContent>
    </Sheet>
  );
}
