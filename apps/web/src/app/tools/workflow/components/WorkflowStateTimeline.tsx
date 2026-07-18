"use client";

import {
  STATE_LABELS,
  STATE_ORDER,
  stateTone,
  type OpportunityItem,
} from "../workflow-model";

interface WorkflowStateTimelineProps {
  selected: OpportunityItem;
}

export function WorkflowStateTimeline({ selected }: WorkflowStateTimelineProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">État du workflow</p>
      <div className="grid gap-2 xl:grid-cols-7">
        {STATE_ORDER.map((state) => {
          const active = selected.current_state === state;
          const done =
            selected.transitions.some((transition) => transition.state === state) && !active;
          return (
            <div
              key={state}
              className={`rounded-xl border px-3 py-3 text-xs font-medium ${stateTone(active, done)}`}
            >
              {STATE_LABELS[state]}
            </div>
          );
        })}
      </div>
    </section>
  );
}
