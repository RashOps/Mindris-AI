"use client";

import { ArrowRight, FileBadge2, FileText, ListTodo, Loader2 } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { messages } = useI18n();
  const copy = messages.pages.workflow;
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">{copy.actions}</p>
      <div className="min-w-0 space-y-3">
        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CV</p>
          <div className="flex min-w-0 flex-col gap-2 xl:flex-row">
            <ToolbarSelect
              value={resumeId}
              ariaLabel={copy.selectResume}
              placeholder={copy.selectResume}
              options={[
                { value: "", label: copy.selectResume },
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
              ariaLabel={copy.selectResumeLocale}
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
            {copy.linkResume}
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.atsScore}</p>
            <span className="text-[11px] text-muted-foreground">
              {filteredAtsReports.length} rapport{filteredAtsReports.length > 1 ? "s" : ""}
            </span>
          </div>
          <ToolbarSelect
            value={atsReportId}
            ariaLabel={copy.selectAts}
            placeholder={copy.selectAts}
            options={[
              { value: "", label: copy.selectAts },
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
            {copy.linkAts}
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.letter}</p>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {filteredCoverLetters.length} lettre{filteredCoverLetters.length > 1 ? "s" : ""}
            </span>
            {activeCoverLetterId ? (
              <button
                type="button"
                onClick={onOpenCoverLetter}
                className="text-xs font-medium text-primary hover:underline"
              >
                {copy.open}
              </button>
            ) : null}
          </div>
          <ToolbarSelect
            value={coverLetterId}
            ariaLabel={copy.selectLetter}
            placeholder={copy.selectLetter}
            options={[
              { value: "", label: copy.selectLetter },
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
            {copy.linkLetter}
          </Button>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.tracker}</p>
            <span className="text-[11px] text-muted-foreground">
              {filteredApplications.length} entrée{filteredApplications.length > 1 ? "s" : ""}
            </span>
          </div>
          <ToolbarSelect
            value={applicationId}
            ariaLabel={copy.selectApplication}
            placeholder={copy.createTracker}
            options={[
              { value: "", label: copy.createTracker },
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
              {copy.createTrackerAction}
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full"
              disabled={!applicationId || busyAction === "tracker-attach"}
              onClick={onLinkTracker}
            >
              {busyAction === "tracker-attach" ? <Loader2 className="animate-spin" /> : <ArrowRight size={16} />}
              {copy.linkExisting}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
