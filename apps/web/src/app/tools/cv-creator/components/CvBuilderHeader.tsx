"use client";

import type { ReactNode, RefObject } from "react";

import { LLMSelector } from "@/components/LLMSelector";
import { PdfIngestionModeSelect } from "@/components/PdfIngestionModeSelect";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { HeaderMenuAction } from "./HeaderActionMenu";
import { HeaderActionMenu } from "./HeaderActionMenu";

const TOOLBAR_BUTTON_CLASS =
  "app-toolbar-button inline-flex h-9 cursor-pointer items-center gap-1 px-2.5 text-xs font-medium";
const TOOLBAR_BUTTON_ACTIVE_CLASS =
  "app-toolbar-button-active inline-flex h-9 cursor-pointer items-center gap-1 px-2.5 text-xs font-medium";
const BUILDER_INPUT_CLASS = "app-input h-9 px-2 text-xs";

type ResumeOption = { id: string; name: string };
type LocaleOption = "" | "fr" | "en" | "de" | "es";
type ActiveLocale = "fr" | "en" | "de" | "es";

export function CvBuilderHeader(props: {
  activeResumeId: string;
  resumes: ResumeOption[];
  activeResumeName: string;
  activeLocale: ActiveLocale;
  availableLocales: ActiveLocale[];
  inactiveLocales: ActiveLocale[];
  localeToCreate: LocaleOption;
  canDeleteLocale: boolean;
  isUploading: boolean;
  isOptimizing: boolean;
  showGhost: boolean;
  showInsights: boolean;
  jobUrl: string;
  resumeSaveStatus: "idle" | "dirty" | "saving" | "saved" | "error";
  saveStatusText: string;
  saveStatusColor: string;
  resumeSaveError: string | null;
  activeHeaderMenu: "upload" | "download" | null;
  headerMenuRef: RefObject<HTMLDivElement | null>;
  uploadActions: HeaderMenuAction[];
  downloadActions: HeaderMenuAction[];
  uploadIcon: ReactNode;
  downloadIcon: ReactNode;
  insightsBadge: boolean;
  onSelectResume: (id: string) => void;
  onRenameResume: (name: string) => void;
  onCreateResume: () => void;
  onDuplicateResume: () => void;
  onDeleteResume: () => void;
  onActivateLocale: (locale: ActiveLocale) => void;
  onSetLocaleToCreate: (locale: LocaleOption) => void;
  onCreateLocale: () => void;
  onDeleteLocale: () => void;
  onRetrySave: () => void;
  onChangeJobUrl: (value: string) => void;
  onOptimize: () => void;
  onToggleUploadMenu: () => void;
  onToggleDownloadMenu: () => void;
  onCloseHeaderMenu: () => void;
  onToggleGhost: () => void;
  onToggleInsights: () => void;
  onOpenCoverLetter: () => void;
}) {
  const {
    activeResumeId,
    resumes,
    activeResumeName,
    activeLocale,
    availableLocales,
    inactiveLocales,
    localeToCreate,
    canDeleteLocale,
    isOptimizing,
    showGhost,
    showInsights,
    jobUrl,
    resumeSaveStatus,
    saveStatusText,
    saveStatusColor,
    resumeSaveError,
    activeHeaderMenu,
    headerMenuRef,
    uploadActions,
    downloadActions,
    uploadIcon,
    downloadIcon,
    insightsBadge,
    onSelectResume,
    onRenameResume,
    onCreateResume,
    onDuplicateResume,
    onDeleteResume,
    onActivateLocale,
    onSetLocaleToCreate,
    onCreateLocale,
    onDeleteLocale,
    onRetrySave,
    onChangeJobUrl,
    onOptimize,
    onToggleUploadMenu,
    onToggleDownloadMenu,
    onCloseHeaderMenu,
    onToggleGhost,
    onToggleInsights,
    onOpenCoverLetter,
  } = props;

  return (
    <header className="app-header-surface z-30 flex shrink-0 flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CV Builder</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ToolbarSelect
            value={activeResumeId}
            ariaLabel="Select resume"
            options={resumes.map((resume) => ({
              value: resume.id,
              label: resume.name,
            }))}
            onChange={onSelectResume}
            triggerClassName={`${BUILDER_INPUT_CLASS} min-w-40 max-w-56`}
            menuClassName="min-w-56"
          />
          <input
            value={activeResumeName}
            onChange={(e) => onRenameResume(e.target.value)}
            placeholder="Resume name"
            className={`${BUILDER_INPUT_CLASS} w-40`}
          />
          <button onClick={onCreateResume} className="app-toolbar-button h-9 cursor-pointer px-3 text-xs font-medium">New</button>
          <button onClick={onDuplicateResume} className="app-toolbar-button h-9 cursor-pointer px-3 text-xs font-medium">Duplicate</button>
          <button onClick={onDeleteResume} className="h-9 cursor-pointer rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100">Delete</button>
        </div>

        <div className="flex items-center gap-2">
          <PdfIngestionModeSelect label="PDF parse" variant="toolbar" />
          <LLMSelector taskKey="optimize_llm" label="Optimize" variant="toolbar" />
          <button
            onClick={onRetrySave}
            className="app-toolbar-button h-9 px-3 text-xs font-medium"
            style={{
              borderColor: resumeSaveStatus === "error" ? "#fecaca" : undefined,
              color: saveStatusColor,
              cursor: resumeSaveStatus === "error" ? "pointer" : "default",
            }}
            title={resumeSaveError ?? "Backend save status"}
          >
            {saveStatusText}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/40 px-1 py-1">
          {availableLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => onActivateLocale(locale)}
              className={`inline-flex h-7 min-w-10 cursor-pointer items-center justify-center rounded-md px-2 text-[11px] font-semibold transition-colors ${
                locale === activeLocale
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {locale.toUpperCase()}
            </button>
          ))}
          {inactiveLocales.length > 0 ? (
            <>
              <ToolbarSelect
                value={localeToCreate}
                placeholder="Add locale"
                ariaLabel="Add locale"
                options={inactiveLocales.map((locale) => ({
                  value: locale,
                  label: locale.toUpperCase(),
                }))}
                onChange={(value) => onSetLocaleToCreate(value as LocaleOption)}
                triggerClassName="app-select h-7 min-w-24 px-2 text-[11px] font-medium"
                menuClassName="min-w-28"
              />
              <button
                type="button"
                disabled={!localeToCreate}
                onClick={onCreateLocale}
                className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </>
          ) : null}
          {canDeleteLocale ? (
            <button
              type="button"
              onClick={onDeleteLocale}
              className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Remove
            </button>
          ) : null}
        </div>
        <div className="flex min-w-[280px] flex-1 items-center gap-2">
          <Input
            value={jobUrl}
            onChange={(e) => onChangeJobUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onOptimize()}
            placeholder="Paste job offer URL…"
            className="app-input h-9 text-sm"
          />
          <Button
            onClick={onOptimize}
            disabled={isOptimizing || !jobUrl.trim()}
            className="h-9 shrink-0 cursor-pointer bg-slate-950 px-4 text-sm text-white hover:bg-slate-800"
          >
            {isOptimizing ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running…
              </span>
            ) : "Optimize"}
          </Button>
        </div>

        <div ref={headerMenuRef} className="flex flex-wrap items-center gap-1.5">
          <HeaderActionMenu
            label="Upload CV"
            icon={uploadIcon}
            isOpen={activeHeaderMenu === "upload"}
            onToggle={onToggleUploadMenu}
            onClose={onCloseHeaderMenu}
            actions={uploadActions}
          />
          <HeaderActionMenu
            label="Download CV"
            icon={downloadIcon}
            isOpen={activeHeaderMenu === "download"}
            onToggle={onToggleDownloadMenu}
            onClose={onCloseHeaderMenu}
            actions={downloadActions}
          />
          <button onClick={onToggleGhost} className={showGhost ? TOOLBAR_BUTTON_ACTIVE_CLASS : TOOLBAR_BUTTON_CLASS}>Ghost</button>
          <button onClick={onToggleInsights} className={showInsights ? `relative ${TOOLBAR_BUTTON_ACTIVE_CLASS}` : `relative ${TOOLBAR_BUTTON_CLASS}`}>
            Insights
            {insightsBadge ? <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" /> : null}
          </button>
          <button onClick={onOpenCoverLetter} className={TOOLBAR_BUTTON_CLASS}>Cover Letter</button>
        </div>
      </div>
    </header>
  );
}
