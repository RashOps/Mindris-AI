import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

const PATH_BY_TOOL = {
  dashboard: "first-cv",
  "cv-creator": "tailor",
  "ats-score": "tailor",
  markdown: "application",
  tracker: "application",
  workflow: "application",
  history: "application",
} as const;

export type GuideTool = keyof typeof PATH_BY_TOOL;

export function ContextualGuideLink({
  tool,
  compact = false,
}: {
  tool: GuideTool;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/tools/guide#${PATH_BY_TOOL[tool]}`}
      className="app-toolbar-button inline-flex h-9 items-center gap-2 px-3 text-xs font-medium no-underline"
      title="Ouvrir le parcours guidé associé"
    >
      <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
      {compact ? null : "Guide"}
    </Link>
  );
}
