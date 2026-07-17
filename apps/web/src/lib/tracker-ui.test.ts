import { describe, expect, test } from "bun:test";

import {
  compactTrackerSummary,
  toggleExpandedTrackerCard,
} from "./tracker-ui";

describe("tracker ui helpers", () => {
  test("toggles one tracker card expansion idempotently", () => {
    expect(toggleExpandedTrackerCard([], 12)).toEqual([12]);
    expect(toggleExpandedTrackerCard([12], 12)).toEqual([]);
    expect(toggleExpandedTrackerCard([4, 8], 12)).toEqual([4, 8, 12]);
  });

  test("builds compact summary signals from next reminder and note density", () => {
    expect(
      compactTrackerSummary({
        notes: "Need to follow up next week.",
        reminderCounts: { pending: 2 },
        nextReminderLabel: "Jul 08",
      }),
    ).toEqual(["2 pending", "Next Jul 08", "Notes"]);

    expect(
      compactTrackerSummary({
        notes: "",
        reminderCounts: { pending: 0 },
        nextReminderLabel: null,
      }),
    ).toEqual([]);
  });
});
