"use client";

import { Editor } from "@/components/Editor";
import { StylePanel } from "@/components/StylePanel";
import type { CvBuilderUiMode } from "./CvBuilderModeToggle";
import type { EditorTab } from "../cv-builder-model";

interface CvEditorPaneProps {
  activeTab: EditorTab;
  labels: {
    editor: string;
    structure: string;
    style: string;
  };
  narrow: boolean;
  uiMode: CvBuilderUiMode;
  onChangeTab: (tab: EditorTab) => void;
}

export function CvEditorPane({
  activeTab,
  labels,
  narrow,
  uiMode,
  onChangeTab,
}: CvEditorPaneProps) {
  return (
    <div
      className={`flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card transition-all duration-300 max-lg:min-h-[58vh] lg:h-full lg:border-b-0 lg:border-r ${narrow ? "lg:w-[32%]" : "lg:w-[45%]"}`}
    >
      <div className="shrink-0 border-b border-border bg-card px-4 py-2">
        <div
          className="flex rounded-lg border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label={labels.editor}
          onKeyDown={(event) => {
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
            );
            const current = tabs.indexOf(document.activeElement as HTMLElement);
            if (current < 0) return;
            let next = current;
            if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
            else if (event.key === "ArrowLeft")
              next = (current - 1 + tabs.length) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();
            tabs[next]?.focus();
            tabs[next]?.click();
          }}
        >
          {(["structure", "style"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              id={`cv-editor-tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`cv-editor-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => onChangeTab(tab)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {labels[tab]}
            </button>
          ))}
        </div>
      </div>
      <div
        id={`cv-editor-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`cv-editor-tab-${activeTab}`}
        className="flex-1 overflow-hidden px-3 py-3"
      >
        {activeTab === "structure" ? (
          <Editor />
        ) : (
          <StylePanel variant="embedded" uiMode={uiMode} />
        )}
      </div>
    </div>
  );
}

