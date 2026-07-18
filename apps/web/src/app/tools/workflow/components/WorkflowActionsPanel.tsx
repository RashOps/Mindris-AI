"use client";

import { ArrowRight, FileBadge2, FileText, ListTodo, Loader2 } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import {
  formatTimestamp,
  type ApplicationItem,
  type AtsReportItem,
  type CoverLetterItem,
  type ResumeItem,
} from "../workflow-model";

interface WorkflowActionsPanelProps {
  activeCoverLetterId: number | null;
  applicationId: string;
  atsReportId: string;
  busyAction: string | null;
  coverLetterId: string;
  filteredApplications: ApplicationItem[];
  filteredAtsReports: AtsReportItem[];
  filteredCoverLetters: CoverLetterItem[];
  localeOptions: string[];
  resumeId: string;
  resumeLocale: string;
  resumes: ResumeItem[];
  onApplicationIdChange: (value: string) => void;
  onAtsReportIdChange: (value: string) => void;
  onCoverLetterIdChange: (value: string) => void;
  onLinkAtsReport: () => void;
  onLinkCoverLetter: () => void;
  onLinkResume: () => void;
  onLinkTracker: () => void;
  onOpenCoverLetter: () => void;
  onResumeIdChange: (value: string) => void;
  onResumeLocaleChange: (value: string) => void;
  onCreateTracker: () => void;
}

export function WorkflowActionsPanel({
  activeCoverLetterId,
  applicationId,
  atsReportId,
  busyAction,
  coverLetterId,
  filteredApplications,
  filteredAtsReports,
  filteredCoverLetters,
  localeOptions,
  resumeId,
  resumeLocale,
  resumes,
  onApplicationIdChange,
  onAtsReportIdChange,
  onCoverLetterIdChange,
  onCreateTracker,
  onLinkAtsReport,
  onLinkCoverLetter,
  onLinkResume,
  onLinkTracker,
  onOpenCoverLetter,
  onResumeIdChange,
  onResumeLocaleChange,
}: WorkflowActionsPanelProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">Actions à faire</p>
      <div className="min-w-0 space-y-3">
        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CV</p>
          <div className="flex min-w-0 flex-col gap-2 xl:flex-row">
            <ToolbarSelect
              value={resumeId}
              ariaLabel="Sélectionner un CV"
              placeholder="Sélectionner un CV"
              options={[
                { value: "", label: "Sélectionner un CV" },
                ...resumes.map((resume) => ({
                  value: String(resume.id),
                  label: resume.name,
                })),
              ]}
              onChange={onResumeIdChange}
              triggerClassName="app-select h-10 w-full px-3 text-sm"
            />
            <ToolbarSelect
              value={resumeLocale}
              ariaLabel="Sélectionner la langue du CV"
              options={localeOptions.map((locale) => ({
                value: locale,
                label: locale.toUpperCase(),
              }))}
              onChange={onResumeLocaleChange}
              triggerClassName="app-select h-10 min-w-[120px] px-3 text-sm"
              menuClassName="min-w-32"
            />
          </div>
          <Button
            className="mt-2 h-9 w-full"
            disabled={!resumeId || busyAction === "resume"}
            onClick={onLinkResume}
          >
            {busyAction === "resume" ? <Loader2 className="animate-spin" /> : <FileText size={16} />}
            Lier le CV
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score ATS</p>
            <span className="text-[11px] text-muted-foreground">
              {filteredAtsReports.length} rapport{filteredAtsReports.length > 1 ? "s" : ""}
            </span>
          </div>
          <ToolbarSelect
            value={atsReportId}
            ariaLabel="Sélectionner un rapport ATS"
            placeholder="Sélectionner un rapport ATS"
            options={[
              { value: "", label: "Sélectionner un rapport ATS" },
              ...filteredAtsReports.map((report) => ({
                value: String(report.id),
                label: `#${report.id} · ${report.mode} · ${report.score}/100`,
              })),
            ]}
            onChange={onAtsReportIdChange}
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
          <Button
            className="mt-2 h-9 w-full"
            disabled={!atsReportId || busyAction === "ats"}
            onClick={onLinkAtsReport}
          >
            {busyAction === "ats" ? <Loader2 className="animate-spin" /> : <FileBadge2 size={16} />}
            Lier le rapport ATS
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lettre</p>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {filteredCoverLetters.length} lettre{filteredCoverLetters.length > 1 ? "s" : ""}
            </span>
            {activeCoverLetterId ? (
              <button
                type="button"
                onClick={onOpenCoverLetter}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ouvrir
              </button>
            ) : null}
          </div>
          <ToolbarSelect
            value={coverLetterId}
            ariaLabel="Sélectionner une lettre"
            placeholder="Sélectionner une lettre"
            options={[
              { value: "", label: "Sélectionner une lettre" },
              ...filteredCoverLetters.map((letter) => ({
                value: String(letter.id),
                label: `#${letter.id} - ${formatTimestamp(letter.generated_at)}`,
              })),
            ]}
            onChange={onCoverLetterIdChange}
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
          <Button
            className="mt-2 h-9 w-full"
            disabled={!coverLetterId || busyAction === "letter"}
            onClick={onLinkCoverLetter}
          >
            {busyAction === "letter" ? <Loader2 className="animate-spin" /> : <FileText size={16} />}
            Lier la lettre
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracker</p>
            <span className="text-[11px] text-muted-foreground">
              {filteredApplications.length} entrée{filteredApplications.length > 1 ? "s" : ""}
            </span>
          </div>
          <ToolbarSelect
            value={applicationId}
            ariaLabel="Sélectionner une candidature"
            placeholder="Créer une entrée tracker"
            options={[
              { value: "", label: "Créer une entrée tracker" },
              ...filteredApplications.map((application) => ({
                value: String(application.id),
                label: `#${application.id} - ${application.company} - ${application.role}`,
              })),
            ]}
            onChange={onApplicationIdChange}
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
          <div className="mt-2 grid gap-2 xl:grid-cols-2">
            <Button
              className="h-9 w-full"
              disabled={busyAction === "tracker-create"}
              onClick={onCreateTracker}
            >
              {busyAction === "tracker-create" ? <Loader2 className="animate-spin" /> : <ListTodo size={16} />}
              Créer le tracker
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full"
              disabled={!applicationId || busyAction === "tracker-attach"}
              onClick={onLinkTracker}
            >
              {busyAction === "tracker-attach" ? <Loader2 className="animate-spin" /> : <ArrowRight size={16} />}
              Lier l’existant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
