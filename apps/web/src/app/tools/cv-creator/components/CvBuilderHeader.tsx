"use client";

import { useState, type ReactNode, type RefObject } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

import { LLMSelector } from "@/components/LLMSelector";
import { PdfIngestionModeSelect } from "@/components/PdfIngestionModeSelect";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContextualGuideLink } from "@/components/help/ContextualGuideLink";

import type { HeaderMenuAction } from "./HeaderActionMenu";
import { HeaderActionMenu } from "./HeaderActionMenu";
import {
  CvBuilderModeToggle,
  type CvBuilderUiMode,
} from "./CvBuilderModeToggle";

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
  uiMode: CvBuilderUiMode;
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
  onChangeUiMode: (mode: CvBuilderUiMode) => void;
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
    uiMode,
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
    onChangeUiMode,
  } = props;

  const { messages } = useI18n();
  const copy = messages.pages.cvBuilder;
  const isSimple = uiMode === "simple";
  const isNormal = uiMode === "normal";
  const isAdvanced = uiMode === "advanced";
  const [ribbonOpen, setRibbonOpen] = useState(true);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [ribbonTab, setRibbonTab] = useState<"main" | "adapt" | "document">(
    "main",
  );

  const resumeSelector = (
    <ToolbarSelect
      value={activeResumeId}
      ariaLabel={copy.chooseResume}
      options={resumes.map((resume) => ({
        value: resume.id,
        label: resume.name,
      }))}
      onChange={onSelectResume}
      triggerClassName={`${BUILDER_INPUT_CLASS} min-w-40 max-w-56`}
      menuClassName="min-w-56"
    />
  );

  const resumeNameInput = (
    <input
      value={activeResumeName}
      onChange={(e) => onRenameResume(e.target.value)}
      placeholder={copy.resumeName}
      className={`${BUILDER_INPUT_CLASS} w-40`}
    />
  );

  const localeControls = (
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
            placeholder={copy.addLocale}
            ariaLabel={copy.addLocaleLabel}
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
            Ajouter
          </button>
        </>
      ) : null}
      {canDeleteLocale ? (
        <button
          type="button"
          onClick={onDeleteLocale}
          className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 px-2 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/15"
        >
          Retirer
        </button>
      ) : null}
    </div>
  );

  const importExportControls = (
    <>
      <HeaderActionMenu
        label={copy.import}
        icon={uploadIcon}
        isOpen={activeHeaderMenu === "upload"}
        onToggle={onToggleUploadMenu}
        onClose={onCloseHeaderMenu}
        actions={uploadActions}
      />
      <HeaderActionMenu
        label={copy.export}
        icon={downloadIcon}
        isOpen={activeHeaderMenu === "download"}
        onToggle={onToggleDownloadMenu}
        onClose={onCloseHeaderMenu}
        actions={downloadActions}
      />
    </>
  );

  const optimizeControl = (
    <div className="flex min-w-0 flex-1 items-center gap-2 md:min-w-[260px]">
      <Input
        value={jobUrl}
        onChange={(e) => onChangeJobUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onOptimize()}
        placeholder={copy.jobUrl}
        className="app-input h-9 text-sm"
      />
      <Button
        onClick={onOptimize}
        disabled={isOptimizing || !jobUrl.trim()}
        className="h-9 shrink-0 cursor-pointer bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90 md:px-4"
      >
        {isOptimizing ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Analyse…
          </span>
        ) : (
          copy.tailor
        )}
      </Button>
    </div>
  );

  const actionControls = (
    <>
      {importExportControls}
      {!isSimple ? (
        <>
          <button
            onClick={onToggleInsights}
            className={showInsights ? TOOLBAR_BUTTON_ACTIVE_CLASS : TOOLBAR_BUTTON_CLASS}
          >
            Conseils{insightsBadge ? " ·" : ""}
          </button>
          <button onClick={onOpenCoverLetter} className={TOOLBAR_BUTTON_CLASS}>
            Lettre
          </button>
        </>
      ) : null}
      {isAdvanced ? (
        <button
          onClick={onToggleGhost}
          className={showGhost ? TOOLBAR_BUTTON_ACTIVE_CLASS : TOOLBAR_BUTTON_CLASS}
        >
          Journal
        </button>
      ) : null}
    </>
  );

  const tabs = [
    { id: "main" as const, label: copy.mainRibbon, icon: FileText },
    { id: "adapt" as const, label: copy.tailorRibbon, icon: Sparkles },
    { id: "document" as const, label: copy.documentRibbon, icon: SlidersHorizontal },
  ];

  return (
    <header ref={headerMenuRef} className="app-header-surface z-30 shrink-0">
      <div className="hidden md:block">
        <div className="flex h-12 items-center gap-3 border-b border-border px-4">
          <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            CV Builder
          </p>
          <div className="min-w-0">{resumeSelector}</div>
          <div className="ml-auto flex items-center gap-2">
            <ContextualGuideLink tool="cv-creator" />
            <CvBuilderModeToggle value={uiMode} onChange={onChangeUiMode} />
            <button
              onClick={onRetrySave}
              className="app-toolbar-button h-8 px-2.5 text-xs font-medium"
              style={{
                borderColor: resumeSaveStatus === "error" ? "#fecaca" : undefined,
                color: saveStatusColor,
                cursor: resumeSaveStatus === "error" ? "pointer" : "default",
              }}
              title={resumeSaveError ?? copy.saveStatus}
            >
              {saveStatusText}
            </button>
            <button
              type="button"
              onClick={() => setRibbonOpen((open) => !open)}
              className="app-toolbar-button flex h-8 items-center gap-1 px-2.5 text-xs"
              aria-expanded={ribbonOpen}
              aria-controls="cv-builder-ribbon"
            >
              {ribbonOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {ribbonOpen ? copy.collapseRibbon : copy.expandRibbon}
            </button>
          </div>
        </div>

        {ribbonOpen ? (
          <div id="cv-builder-ribbon" className="px-4 pb-3">
            <div className="flex h-9 items-end gap-1" role="tablist" aria-label={copy.toolsLabel}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={ribbonTab === id}
                  onClick={() => setRibbonTab(id)}
                  className={`flex h-8 items-center gap-1.5 rounded-t-md px-3 text-xs font-medium ${
                    ribbonTab === id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex min-h-14 items-center gap-2 rounded-lg rounded-tl-none border border-border bg-muted/30 p-2">
              {ribbonTab === "main" ? (
                <>
                  {resumeNameInput}
                  {!isSimple ? (
                    <>
                      <button onClick={onCreateResume} className={TOOLBAR_BUTTON_CLASS}>{copy.new}</button>
                      <button onClick={onDuplicateResume} className={TOOLBAR_BUTTON_CLASS}>{copy.duplicate}</button>
                    </>
                  ) : null}
                  {(isNormal || isAdvanced) ? localeControls : null}
                </>
              ) : null}
              {ribbonTab === "adapt" ? (
                <>
                  {optimizeControl}
                  {!isSimple ? <PdfIngestionModeSelect label={copy.pdfReading} variant="toolbar" /> : null}
                  {isAdvanced ? <LLMSelector taskKey="optimize_llm" label={copy.aiEngine} variant="toolbar" /> : null}
                  {!isSimple ? (
                    <button onClick={onToggleInsights} className={showInsights ? TOOLBAR_BUTTON_ACTIVE_CLASS : TOOLBAR_BUTTON_CLASS}>
                      Conseils{insightsBadge ? " ·" : ""}
                    </button>
                  ) : null}
                </>
              ) : null}
              {ribbonTab === "document" ? (
                <>
                  {actionControls}
                  {isAdvanced ? (
                    <button onClick={onDeleteResume} className="h-9 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive hover:bg-destructive/15">
                      Supprimer le CV
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{resumeSelector}</div>
          <button
            onClick={onRetrySave}
            className="h-8 shrink-0 px-1 text-[10px] text-muted-foreground"
            title={resumeSaveError ?? copy.saveStatus}
          >
            {saveStatusText}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{optimizeControl}</div>
          <button
            type="button"
            onClick={() => setMobileToolsOpen(true)}
            className="app-toolbar-button flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-medium"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Outils
          </button>
        </div>
      </div>

      {mobileToolsOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={copy.toolsLabel}>
          <button className="absolute inset-0 bg-black/50" onClick={() => setMobileToolsOpen(false)} aria-label={copy.closeTools} />
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-2xl border border-border bg-background p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Bot size={16} /><h2 className="text-sm font-semibold">{copy.resumeTools}</h2></div>
              <button onClick={() => setMobileToolsOpen(false)} className="app-toolbar-button flex h-8 w-8 items-center justify-center" aria-label={messages.common.close}><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <ContextualGuideLink tool="cv-creator" />
              <CvBuilderModeToggle value={uiMode} onChange={onChangeUiMode} />
              <div className="flex flex-wrap gap-2">{resumeNameInput}{!isSimple ? <><button onClick={onCreateResume} className={TOOLBAR_BUTTON_CLASS}>{copy.new}</button><button onClick={onDuplicateResume} className={TOOLBAR_BUTTON_CLASS}>{copy.duplicate}</button></> : null}</div>
              {(isNormal || isAdvanced) ? localeControls : null}
              {!isSimple ? <PdfIngestionModeSelect label={copy.pdfReading} variant="toolbar" /> : null}
              {isAdvanced ? <LLMSelector taskKey="optimize_llm" label={copy.aiEngine} variant="toolbar" /> : null}
              <div className="flex flex-wrap gap-2">{actionControls}</div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
