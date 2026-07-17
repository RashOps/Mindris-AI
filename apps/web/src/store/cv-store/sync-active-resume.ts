import { schedulePersistResume } from "./resume-autosave";
import { normalizeCVData, nowIso } from "./resume-normalizers";
import type { CVStore } from "./store-types";
import type { CVData } from "./types";

export function syncActiveResume(
  state: CVStore,
  cvData: CVData,
): Pick<CVStore, "cvData" | "resumes"> {
  const timestamp = nowIso();
  const activeResume = state.resumes.find(
    (resume) => resume.id === state.activeResumeId,
  );

  if (!activeResume) {
    return {
      cvData: normalizeCVData(cvData),
      resumes: state.resumes,
    };
  }

  const normalized = normalizeCVData(
    cvData,
    activeResume.cvData.global_settings.template_id,
  );
  const updatedResume = {
    ...activeResume,
    cvData: normalized,
    templateId:
      normalized.global_settings.template_id || activeResume.templateId,
    locale: activeResume.locale,
    updatedAt: timestamp,
  };

  schedulePersistResume(activeResume.id, {
    name: updatedResume.name,
    cvData: updatedResume.cvData,
    templateId: updatedResume.templateId,
    locale: updatedResume.locale,
    multilingual: updatedResume.multilingual,
  });

  return {
    cvData: normalized,
    resumes: state.resumes.map((resume) =>
      resume.id === state.activeResumeId ? updatedResume : resume,
    ),
  };
}
