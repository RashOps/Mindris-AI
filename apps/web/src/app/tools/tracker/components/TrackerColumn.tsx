"use client";

import { BellRing, CalendarClock, CheckCheck, CheckCircle2, ExternalLink, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ReminderItem {
  id: number;
  application_id: number;
  title: string;
  due_at: string;
  status: "pending" | "completed" | "dismissed";
  notes: string;
  completed_at?: string | null;
}

export interface ApplicationItem {
  id: number;
  status: string;
  company: string;
  role: string;
  url?: string;
  notes: string;
  applied_at?: string | null;
  ats_report_id?: number | null;
  reminder_counts?: Record<string, number>;
  next_reminder?: ReminderItem | null;
  reminders?: ReminderItem[];
}

export function TrackerColumn({
  statusLabel,
  statusHint,
  count,
  items,
  tone,
  expandedIds,
  reminderDrafts,
  compactTrackerSummary,
  formatDate,
  onToggleExpanded,
  onMove,
  onRemove,
  onReminderDraftChange,
  onCreateReminder,
  onUpdateReminderStatus,
  onDeleteReminder,
}: {
  statusLabel: string;
  statusHint: string;
  count: number;
  items: ApplicationItem[];
  tone: { background: string; border: string; color: string };
  expandedIds: number[];
  reminderDrafts: Record<number, { title: string; dueAt: string }>;
  compactTrackerSummary: (args: {
    notes: string;
    reminderCounts?: Record<string, number>;
    nextReminderLabel?: string | null;
  }) => string[];
  formatDate: (value: string) => string;
  onToggleExpanded: (id: number) => void;
  onMove: (item: ApplicationItem, direction: "left" | "right", index: number) => void;
  onRemove: (id: number) => void;
  onReminderDraftChange: (id: number, patch: Partial<{ title: string; dueAt: string }>) => void;
  onCreateReminder: (id: number) => void;
  onUpdateReminderStatus: (applicationId: number, reminderId: number, status: ReminderItem["status"]) => void;
  onDeleteReminder: (applicationId: number, reminderId: number) => void;
}) {
  return (
    <section className="flex min-h-[72vh] flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{statusLabel}</h2>
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ background: tone.background, borderColor: tone.border, color: tone.color }}
          >
            {count}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{statusHint}</p>
      </div>

      <div className="flex-1 space-y-3 p-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
            No applications in this stage.
          </div>
        ) : (
          items.map((item, index) => {
            const itemTone = tone;
            const expanded = expandedIds.includes(item.id);
            const summaryBadges = compactTrackerSummary({
              notes: item.notes,
              reminderCounts: item.reminder_counts,
              nextReminderLabel: item.next_reminder?.due_at ? formatDate(item.next_reminder.due_at) : null,
            });
            const reminderDraft = reminderDrafts[item.id] ?? { title: "", dueAt: "" };

            return (
              <article key={item.id} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.role}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.company}</p>
                  </div>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize"
                    style={{ background: itemTone.background, borderColor: itemTone.border, color: itemTone.color }}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {summaryBadges.map((badge) => (
                    <span key={badge} className="inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {badge}
                    </span>
                  ))}
                </div>

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full cursor-pointer items-center gap-1.5 truncate text-xs text-muted-foreground no-underline hover:text-foreground"
                  >
                    <ExternalLink size={12} />
                    {item.url}
                  </a>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onMove(item, "left", index)} disabled={index === 0}>
                    ←
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onMove(item, "right", index)}>
                    →
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onToggleExpanded(item.id)}>
                    {expanded ? "Compact" : "Details"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onRemove(item.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>

                {expanded ? (
                  <div className="mt-3 space-y-3">
                    {item.notes ? (
                      <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                        {item.notes}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <BellRing size={12} />
                        Reminders
                      </div>
                      {item.next_reminder ? (
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Next {formatDate(item.next_reminder.due_at)}
                        </span>
                      ) : null}
                      {item.reminders?.map((reminder) => (
                        <div key={reminder.id} className="rounded-md border border-border bg-card px-2 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium">{reminder.title}</p>
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarClock size={11} />
                                {formatDate(reminder.due_at)}
                              </p>
                            </div>
                            <button onClick={() => onDeleteReminder(item.id, reminder.id)} className="text-muted-foreground hover:text-foreground">
                              <X size={12} />
                            </button>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => onUpdateReminderStatus(item.id, reminder.id, "completed")}
                              className={`rounded-md px-2 py-1 text-[11px] ${reminder.status === "completed" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-border bg-muted/40 text-muted-foreground"}`}
                            >
                              <CheckCheck size={12} className="inline" /> Done
                            </button>
                            <button
                              onClick={() => onUpdateReminderStatus(item.id, reminder.id, "dismissed")}
                              className={`rounded-md px-2 py-1 text-[11px] ${reminder.status === "dismissed" ? "border border-border bg-slate-200 text-slate-700" : "border border-border bg-muted/40 text-muted-foreground"}`}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="grid gap-2 sm:grid-cols-[1fr,150px,auto]">
                        <Input
                          value={reminderDraft.title}
                          onChange={(e) => onReminderDraftChange(item.id, { title: e.target.value })}
                          placeholder="Reminder title"
                          className="app-input h-9"
                        />
                        <Input
                          type="date"
                          value={reminderDraft.dueAt}
                          onChange={(e) => onReminderDraftChange(item.id, { dueAt: e.target.value })}
                          className="app-input h-9"
                        />
                        <Button onClick={() => onCreateReminder(item.id)} className="h-9">
                          <CheckCircle2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
