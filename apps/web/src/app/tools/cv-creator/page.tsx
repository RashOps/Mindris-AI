"use client";
import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { GhostMode } from "@/components/GhostMode";
import { StylePanel } from "@/components/StylePanel";
import { JobInsightsPanel } from "@/components/JobInsightsPanel";
import { CoverLetterModal } from "@/components/CoverLetterModal";
import { useCVStore } from "@/store/useCVStore";
import {
  cvDataFromImport,
  resumeNameFromImport,
  type JobInsights,
} from "@/store/useCVStore";
import { useEffect, useState, useRef, useCallback } from "react";
import { apiUrl, rendererUrl, apiHeaders, jsonHeaders } from "@/lib/api";
import { resolveTemplateRenderPayload } from "@/lib/templates";
import { Download, Upload } from "lucide-react";
import {
  CV_BUILDER_UI_MODE_STORAGE_KEY,
  isCvBuilderUiMode,
  type CvBuilderUiMode,
} from "./components/CvBuilderModeToggle";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CvBuilderHeader } from "./components/CvBuilderHeader";
import type { HeaderMenuAction } from "./components/HeaderActionMenu";
import { useI18n } from "@/i18n/I18nProvider";
import {
  RESUME_EXPORTS,
  asDragPayload,
  errorMessage,
  resumeSaveStatusColor,
  resumeSaveStatusText,
  stringArray,
  triggerBlobDownload,
  type EditorTab,
  type HeaderMenuId,
  type JobResultPayload,
  type ResumeExportFormat,
} from "./cv-builder-model";
export default function AppPage() {
  const { messages } = useI18n();
  const copy = messages.pages.cvBuilder;
  const {
    setIsOptimizing,
    replaceCVData,
    cvData,
    setJobInsights,
    jobInsights,
    updateSkillGroup,
    updateExperience,
    appSettings,
    loadResumes,
    resumes,
    activeResumeId,
    setActiveResume,
    createResume,
    duplicateResume,
    deleteResume,
    createResumeLocale,
    activateResumeLocale,
    deleteResumeLocale,
    renameResume,
    flushResumeSave,
    retryResumeSave,
    resumeSaveStatus,
    resumeSaveError,
    lastResumeSavedAt,
  } = useCVStore();
  const [jobUrl, setJobUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("structure");
  const [showInsights, setShowInsights] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<HeaderMenuId | null>(
    null,
  );
  const [localeToCreate, setLocaleToCreate] = useState<
    "" | "fr" | "en" | "de" | "es"
  >("");
  const [uiMode, setUiMode] = useState<CvBuilderUiMode>(() => {
    if (typeof window === "undefined") return "normal";
    const storedMode = window.localStorage.getItem(
      CV_BUILDER_UI_MODE_STORAGE_KEY,
    );
    return isCvBuilderUiMode(storedMode) ? storedMode : "normal";
  });
  const [toast, setToast] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const showToast = (msg: string, ms = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };
  useEffect(() => {
    void loadResumes().catch((err: unknown) => {
      showToast(errorMessage(err, "Chargement des CV impossible"), 6000);
    });
  }, [loadResumes]);
  const handleChangeUiMode = (mode: CvBuilderUiMode) => {
    setUiMode(mode);
    window.localStorage.setItem(CV_BUILDER_UI_MODE_STORAGE_KEY, mode);
    setActiveHeaderMenu(null);
    if (mode === "simple") {
      setShowInsights(false);
    }
  };
  useEffect(() => {
    if (!activeHeaderMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerMenuRef.current?.contains(event.target as Node)) {
        setActiveHeaderMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveHeaderMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeHeaderMenu]);

  const activeResume = resumes.find((resume) => resume.id === activeResumeId);
  const activeLocale =
    activeResume?.multilingual.activeLocale ?? activeResume?.locale ?? "fr";
  const availableLocales = activeResume?.multilingual.availableLocales ?? [
    activeLocale,
  ];
  const inactiveLocales = (["fr", "en", "de", "es"] as const).filter(
    (locale) => !availableLocales.includes(locale),
  );
  const saveStatusText = resumeSaveStatusText(
    resumeSaveStatus,
    lastResumeSavedAt,
  );
  const saveStatusColor = resumeSaveStatusColor(resumeSaveStatus);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const dragData = asDragPayload(active.data.current);
      const dropData = asDragPayload(over.data.current);

      // Skill tag → skill group
      if (dragData?.kind === "skill" && dropData?.kind === "skillGroup") {
        const group = cvData.skills.find((g) => g.id === dropData.groupId);
        if (group && !group.skills.includes(dragData.skill)) {
          updateSkillGroup(group.id, {
            skills: [...group.skills, dragData.skill],
          });
          showToast(`"${dragData.skill}" ajouté à ${group.category}`);
        }
      }

      // Bullet → experience description
      if (dragData?.kind === "bullet" && dropData?.kind === "experience") {
        const exp = cvData.experience.find((e) => e.id === dropData.expId);
        if (exp) {
          const existing = exp.description_markdown;
          const updated = existing
            ? `${existing}\n- ${dragData.bullet}`
            : `- ${dragData.bullet}`;
          updateExperience(exp.id, { description_markdown: updated });
          showToast("Bullet ajouté à l’expérience");
        }
      }
    },
    [cvData, updateSkillGroup, updateExperience],
  );


  const handleCompanyResult = useCallback(
    (data: JobResultPayload) => {
      const insight = data.company_insight;
      if (!insight) return;
      const current = useCVStore.getState().jobInsights;
      if (current) setJobInsights({ ...current, company_insight: insight });
    },
    [setJobInsights],
  );
  const handleJobResult = useCallback(
    (data: JobResultPayload) => {
      const insights: JobInsights = {
        job_id:
          typeof data.job_id === "number"
            ? data.job_id
            : typeof data.job_record_id === "number"
              ? data.job_record_id
              : null,
        job_record_id:
          typeof data.job_record_id === "number"
            ? data.job_record_id
            : typeof data.job_id === "number"
              ? data.job_id
              : null,
        source_url:
          typeof data.source_url === "string" ? data.source_url : null,
        job_title:
          typeof data.job_title === "string" ? data.job_title : "Poste inconnu",
        company: typeof data.company === "string" ? data.company : "",
        hard_skills: stringArray(data.hard_skills),
        soft_skills: stringArray(data.soft_skills),
        drafted_bullets: stringArray(data.drafted_bullets),
        raw_markdown:
          typeof data.raw_markdown === "string" ? data.raw_markdown : "",
        score: typeof data.score === "number" ? data.score : null,
        evidence_ledger: Array.isArray(data.evidence_ledger)
          ? data.evidence_ledger
          : [],
        evidence_matrix: Array.isArray(data.evidence_matrix)
          ? data.evidence_matrix
          : [],
        proposed_changes: Array.isArray(data.proposed_changes)
          ? data.proposed_changes
          : [],
        evaluation: data.evaluation ?? null,
        warnings: stringArray(data.warnings),
        requires_user_review: data.requires_user_review !== false,
        ats_report: data.ats_report,
        company_insight: data.company_insight,
      };
      setJobInsights(insights);
      setShowInsights(true);
      showToast(copy.offerReady);
    },
    [copy.offerReady, setJobInsights],
  );

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    showToast(copy.pdfAnalyzing, 30000);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", appSettings.optimize_llm.provider);
      formData.append("model_name", appSettings.optimize_llm.model_name);
      formData.append("ingestion_mode", appSettings.pdf_ingestion_mode);
      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), {
        method: "POST",
        headers: apiHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Upload impossible");
      }
      const data = await res.json();
      if (data.cv_data) replaceCVData(data.cv_data);
      showToast(copy.pdfIndexed);
    } catch (err: unknown) {
      showToast(errorMessage(err, "Upload impossible"), 6000);
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const importedCV = cvDataFromImport(jsonData);
      if (!importedCV) throw new Error("JSON CV invalide");
      replaceCVData(importedCV);
      const importedName = resumeNameFromImport(jsonData);
      if (importedName) renameResume(activeResumeId, importedName);
      await fetch(apiUrl("/api/v1/cv/current"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: importedCV,
          source: "json",
        }),
      });
      showToast(copy.jsonIndexed);
    } catch (err: unknown) {
      showToast(errorMessage(err, "Parsing ou upload JSON impossible."), 5000);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  const handleExportResume = async (format: ResumeExportFormat) => {
    await flushResumeSave();
    const exportConfig = RESUME_EXPORTS[format];
    const localeQuery = activeLocale
      ? `?locale=${encodeURIComponent(activeLocale)}`
      : "";
    const response = await fetch(
      apiUrl(
        `/api/v1/resumes/${activeResumeId}/${exportConfig.endpoint}${localeQuery}`,
      ),
      {
        headers: apiHeaders(),
      },
    );
    if (!response.ok) throw new Error(`Export ${exportConfig.label} impossible`);
    const blob = await response.blob();
    const activeResume = resumes.find((resume) => resume.id === activeResumeId);
    const name = activeResume?.name || cvData.profile.full_name || "mindris_cv";
    triggerBlobDownload(
      blob,
      `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`,
    );
    showToast(`CV exporté en ${exportConfig.label}`);
  };

  const handleExportPDF = async () => {
    showToast(copy.pdfGenerating, 30000);
    try {
      await flushResumeSave();
      const resolved = await resolveTemplateRenderPayload(
        cvData,
        cvData.global_settings.template_id || "modern",
      );
      const res = await fetch(rendererUrl("/render/pdf"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: resolved.cv_data,
          template_id: resolved.template_id,
          return_buffer: true,
        }),
      });
      if (!res.ok) throw new Error("Rendu impossible");
      const blob = await res.blob();
      triggerBlobDownload(
        blob,
        `${cvData.profile.full_name.replace(/\s+/g, "_")}_CV.pdf`,
      );
      showToast(copy.pdfDownloaded);
    } catch (err: unknown) {
      showToast(errorMessage(err, "Rendu impossible"), 5000);
    }
  };

  const handleOptimize = async () => {
    if (!jobUrl.trim()) return;
    setIsOptimizing(true);
    setShowGhost(true);
    setJobId(null);
    try {
      const res = await fetch(apiUrl("/api/v1/optimize"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          job_url: jobUrl,
          provider: appSettings.optimize_llm.provider,
          model_name: appSettings.optimize_llm.model_name,
          resume_id: Number(activeResumeId),
          resume_locale: activeLocale || "fr",
        }),
      });
      if (!res.ok) throw new Error("Démarrage du pipeline impossible");
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err: unknown) {
      showToast(errorMessage(err, "Démarrage du pipeline impossible"), 5000);
      setIsOptimizing(false);
      setShowGhost(false);
    }
  };

  const handleGhostDone = () => {
    setIsOptimizing(false);
    showToast(copy.optimized);
  };
  const handleGhostError = () => {
    setIsOptimizing(false);
    showToast(copy.pipelineFailed, 6000);
  };

  const { isOptimizing } = useCVStore();
  const uploadActions: HeaderMenuAction[] = [
    {
      label: "PDF",
      hint: isUploading ? "Analyse..." : "Importer un CV",
      disabled: isUploading,
      onSelect: () => pdfInputRef.current?.click(),
    },
    {
      label: "JSON",
      hint: "Importer les données structurées",
      onSelect: () => jsonInputRef.current?.click(),
    },
  ];
  const downloadActions: HeaderMenuAction[] = [
    {
      label: "PDF",
      hint: "Export prêt à imprimer",
      onSelect: () => {
        void handleExportPDF();
      },
    },
    {
      label: "DOCX",
      hint: "Format recruteur",
      onSelect: () => {
        void handleExportResume("docx").catch((err: unknown) => {
          showToast(errorMessage(err, "Export DOCX impossible"), 6000);
        });
      },
    },
    {
      label: "JSON",
      hint: "Données structurées",
      onSelect: () => {
        void handleExportResume("json").catch((err: unknown) => {
          showToast(errorMessage(err, "Export JSON impossible"), 6000);
        });
      },
    },
    {
      label: "Markdown",
      hint: "Compatible GitHub",
      onSelect: () => {
        void handleExportResume("markdown").catch((err: unknown) => {
          showToast(errorMessage(err, "Export Markdown impossible"), 6000);
        });
      },
    },
    {
      label: "HTML",
      hint: "Profil web",
      onSelect: () => {
        void handleExportResume("html").catch((err: unknown) => {
          showToast(errorMessage(err, "Export HTML impossible"), 6000);
        });
      },
    },
    {
      label: "LaTeX",
      hint: "Source portable",
      onSelect: () => {
        void handleExportResume("latex").catch((err: unknown) => {
          showToast(errorMessage(err, "Export LaTeX impossible"), 6000);
        });
      },
    },
    {
      label: "Typst",
      hint: "Source portable",
      onSelect: () => {
        void handleExportResume("typst").catch((err: unknown) => {
          showToast(errorMessage(err, "Export Typst impossible"), 6000);
        });
      },
    },
  ];
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main className="app-page flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] max-w-sm animate-in rounded-lg border border-border bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-xl duration-300 slide-in-from-top-2">
            {toast}
          </div>
        )}

        <input
          type="file"
          accept=".pdf"
          className="hidden"
          ref={pdfInputRef}
          onChange={handlePdfUpload}
        />
        <input
          type="file"
          accept=".json"
          className="hidden"
          ref={jsonInputRef}
          onChange={handleJsonUpload}
        />

        <CvBuilderHeader
          activeResumeId={activeResumeId}
          resumes={resumes.map((resume) => ({
            id: resume.id,
            name: resume.name,
          }))}
          activeResumeName={activeResume?.name ?? ""}
          activeLocale={activeLocale}
          availableLocales={availableLocales}
          inactiveLocales={[...inactiveLocales]}
          localeToCreate={localeToCreate}
          canDeleteLocale={Boolean(
            availableLocales.length > 1 &&
            activeLocale !== activeResume?.multilingual.defaultLocale,
          )}
          isUploading={isUploading}
          isOptimizing={isOptimizing}
          showGhost={showGhost}
          showInsights={showInsights}
          jobUrl={jobUrl}
          resumeSaveStatus={resumeSaveStatus}
          saveStatusText={saveStatusText}
          saveStatusColor={saveStatusColor}
          resumeSaveError={resumeSaveError}
          activeHeaderMenu={activeHeaderMenu}
          headerMenuRef={headerMenuRef}
          uploadActions={uploadActions}
          downloadActions={downloadActions}
          uploadIcon={
            isUploading ? (
              <span className="h-3.5 w-3.5 rounded-full border border-sky-500 border-t-transparent animate-spin" />
            ) : (
              <Upload className="h-4 w-4 text-muted-foreground" />
            )
          }
          downloadIcon={<Download className="h-4 w-4 text-muted-foreground" />}
          insightsBadge={Boolean(jobInsights)}
          uiMode={uiMode}
          onSelectResume={setActiveResume}
          onRenameResume={(name) => renameResume(activeResumeId, name)}
          onCreateResume={() => {
            void createResume(copy.newResume)
              .then(() => showToast(copy.newResumeCreated))
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Création impossible"), 6000);
              });
          }}
          onDuplicateResume={() => {
            void duplicateResume()
              .then(() => showToast(copy.duplicateCreated))
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Duplication impossible"), 6000);
              });
          }}
          onDeleteResume={() => {
            void deleteResume(activeResumeId)
              .then(() =>
                showToast(
                  resumes.length > 1 ? copy.resumeDeleted : copy.keepOneResume,
                ),
              )
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Suppression impossible"), 6000);
              });
          }}
          onActivateLocale={(locale) => {
            if (locale === activeLocale) return;
            void activateResumeLocale(locale)
              .then(() => {
                showToast(`Variante ${locale.toUpperCase()} active`);
              })
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Changement de langue impossible"), 6000);
              });
          }}
          onSetLocaleToCreate={setLocaleToCreate}
          onCreateLocale={() => {
            if (!localeToCreate) return;
            void createResumeLocale(localeToCreate, activeLocale)
              .then(() => {
                showToast(`Variante ${localeToCreate.toUpperCase()} créée`);
                setLocaleToCreate("");
              })
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Création de langue impossible"), 6000);
              });
          }}
          onDeleteLocale={() => {
            void deleteResumeLocale(activeLocale)
              .then(() => {
                showToast(`Variante ${activeLocale.toUpperCase()} supprimée`);
              })
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Suppression de langue impossible"), 6000);
              });
          }}
          onRetrySave={() => {
            if (resumeSaveStatus === "error") {
              void retryResumeSave().catch((err: unknown) => {
                showToast(errorMessage(err, "Nouvelle sauvegarde impossible"), 6000);
              });
            }
          }}
          onChangeJobUrl={setJobUrl}
          onOptimize={handleOptimize}
          onToggleUploadMenu={() =>
            setActiveHeaderMenu((current) =>
              current === "upload" ? null : "upload",
            )
          }
          onToggleDownloadMenu={() =>
            setActiveHeaderMenu((current) =>
              current === "download" ? null : "download",
            )
          }
          onCloseHeaderMenu={() => setActiveHeaderMenu(null)}
          onToggleGhost={() => setShowGhost((v) => !v)}
          onToggleInsights={() => setShowInsights((v) => !v)}
          onOpenCoverLetter={() => setShowCoverLetter(true)}
          onChangeUiMode={handleChangeUiMode}
        />

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden bg-muted/40 max-lg:flex-col max-lg:overflow-y-auto">
          {/* Editor */}
          <div
            className={`flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card transition-all duration-300 max-lg:min-h-[58vh] lg:h-full lg:border-b-0 lg:border-r ${showGhost || showInsights ? "lg:w-[32%]" : "lg:w-[45%]"}`}
          >
            <div className="shrink-0 border-b border-border bg-card px-4 py-2">
              <div
                className="flex rounded-lg border border-border bg-muted/40 p-1"
                role="tablist"
                aria-label={copy.editorLabel}
                onKeyDown={(event) => {
                  const tabs = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      '[role="tab"]',
                    ),
                  );
                  const current = tabs.indexOf(document.activeElement as HTMLElement);
                  if (current < 0) return;
                  let next = current;
                  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
                  else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = tabs.length - 1;
                  else return;
                  event.preventDefault();
                  tabs[next]?.focus();
                  tabs[next]?.click();
                }}
              >
                <button
                  type="button"
                  id="cv-editor-tab-structure"
                  role="tab"
                  aria-selected={editorTab === "structure"}
                  aria-controls="cv-editor-panel-structure"
                  tabIndex={editorTab === "structure" ? 0 : -1}
                  onClick={() => setEditorTab("structure")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editorTab === "structure"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {copy.structure}
                </button>
                <button
                  type="button"
                  id="cv-editor-tab-style"
                  role="tab"
                  aria-selected={editorTab === "style"}
                  aria-controls="cv-editor-panel-style"
                  tabIndex={editorTab === "style" ? 0 : -1}
                  onClick={() => setEditorTab("style")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editorTab === "style"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {copy.style}
                </button>
              </div>
            </div>
            <div
              id={`cv-editor-panel-${editorTab}`}
              role="tabpanel"
              aria-labelledby={`cv-editor-tab-${editorTab}`}
              className="flex-1 overflow-hidden px-3 py-3"
            >
              {editorTab === "structure" ? (
                <Editor />
              ) : (
                <StylePanel variant="embedded" uiMode={uiMode} />
              )}
            </div>
          </div>

          {/* Ghost Mode */}
          {showGhost && (
            <div className="flex min-h-64 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card lg:h-full lg:w-[34%] lg:border-b-0 lg:border-r">
              <div className="shrink-0 border-b border-border bg-card px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Ghost Mode
                </p>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <GhostMode
                  jobId={jobId}
                  onDone={handleGhostDone}
                  onError={handleGhostError}
                  onJobResult={handleJobResult}
                  onCompanyResult={handleCompanyResult}
                />
              </div>
            </div>
          )}

          {/* Job insights */}
          {showInsights && (
            <div className="flex min-h-64 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card lg:h-full lg:w-80 lg:border-b-0 lg:border-r">
              <JobInsightsPanel
                open={showInsights}
                onClose={() => setShowInsights(false)}
                variant="embedded"
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex min-h-0 shrink-0 flex-col overflow-hidden bg-muted/20 max-lg:min-h-[72vh] lg:h-full lg:flex-1">
            <div className="shrink-0 border-b border-border bg-card px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {copy.preview}
              </p>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <LivePreview />
            </div>
          </div>
        </div>

        {/* Drawers (outside main flow) */}
        <CoverLetterModal
          open={showCoverLetter}
          onClose={() => setShowCoverLetter(false)}
        />
      </main>
    </DndContext>
  );
}
