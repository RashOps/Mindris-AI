export function toggleExpandedTrackerCard(
  expandedIds: number[],
  applicationId: number,
): number[] {
  if (expandedIds.includes(applicationId)) {
    return expandedIds.filter((id) => id !== applicationId);
  }
  return [...expandedIds, applicationId];
}

export function compactTrackerSummary(input: {
  notes: string;
  reminderCounts?: Record<string, number>;
  nextReminderLabel?: string | null;
}): string[] {
  const badges: string[] = [];
  const pending = input.reminderCounts?.pending ?? 0;
  if (pending > 0) {
    badges.push(`${pending} pending`);
  }
  if (input.nextReminderLabel) {
    badges.push(`Next ${input.nextReminderLabel}`);
  }
  if (input.notes.trim().length > 0) {
    badges.push("Notes");
  }
  return badges;
}
