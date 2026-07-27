import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import { apiUrl, jsonHeaders } from "@/lib/api";

import { initialResume, uid } from "./cv-store/initial-data";
import {
  configureResumeAutosave,
  flushPendingResumeSave,
  retryLastResumeSave,
  schedulePersistResume,
} from "./cv-store/resume-autosave";
import type { CVStore } from "./cv-store/store-types";
import { requestJson } from "./cv-store/store-api";
import { syncActiveResume } from "./cv-store/sync-active-resume";
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  systemConfigurationToAppSettings,
  type BackendSystemConfiguration,
} from "./cv-store/app-settings";
import {
  createBlankCVData,
  normalizeCVData,
  normalizeResumeDocument,
  nowIso,
} from "./cv-store/resume-normalizers";
import type { ResumeDocument } from "./cv-store/types";

export { normalizeAtsReport } from "./cv-store/ats-normalizers";
export {
  normalizeAppSettings,
  systemConfigurationToAppSettings,
} from "./cv-store/app-settings";
export { normalizeHistoryLedgerItem } from "./cv-store/history-normalizers";
export {
  cvDataFromImport,
  resumeNameFromImport,
} from "./cv-store/import-normalizers";
export {
  createBlankCVData,
  normalizeCVData,
  normalizeResumeDocument,
} from "./cv-store/resume-normalizers";
export type * from "./cv-store/types";

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCVStore = create<CVStore>()((set, get) => ({
  cvData: initialResume.cvData,
  resumes: [initialResume],
  activeResumeId: initialResume.id,
  isResumeLibraryLoading: false,
  resumeSaveStatus: "idle",
  resumeSaveError: null,
  lastResumeSavedAt: null,
  isOptimizing: false,

  // ── Resume library ────────────────────────────────────────────────────────
  loadResumes: async () => {
    set({ isResumeLibraryLoading: true });
    try {
      const data = await requestJson<{ items: ResumeDocument[] }>(
        "/api/v1/resumes",
      );
      if (data.items.length === 0) {
        const id = await get().createResume("CV principal", "modern");
        get().setActiveResume(id);
        return;
      }
      const activeId = get().activeResumeId;
      const activeResume =
        data.items.find((resume) => resume.id === activeId) ?? data.items[0];
      set({
        resumes: data.items.map((resume) => normalizeResumeDocument(resume)),
        activeResumeId: activeResume.id,
        cvData: normalizeResumeDocument(activeResume).cvData,
        jobInsights: null,
        resumeSaveStatus: "idle",
        resumeSaveError: null,
      });
    } finally {
      set({ isResumeLibraryLoading: false });
    }
  },

  createResume: async (name = "Untitled CV", templateId = "modern") => {
    const cvData = createBlankCVData(templateId);
    const data = await requestJson<{ item: ResumeDocument }>(
      "/api/v1/resumes",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          cv_data: cvData,
          template_id: templateId,
          locale: "fr",
          source: "manual",
        }),
      },
    );
    set((state) => ({
      resumes: [normalizeResumeDocument(data.item), ...state.resumes],
      activeResumeId: data.item.id,
      cvData: normalizeResumeDocument(data.item).cvData,
      jobInsights: null,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
    return data.item.id;
  },

  moveResumeSection: async (intent) => {
    await flushPendingResumeSave();
    const state = get();
    const activeResume = state.resumes.find(
      (resume) => resume.id === state.activeResumeId,
    );
    if (!activeResume?.revision) {
      throw new Error("La révision courante du CV est indisponible.");
    }
    const data = await requestJson<{ item: ResumeDocument }>(
      `/api/v1/resumes/${state.activeResumeId}/sections/move`,
      {
        method: "POST",
        body: JSON.stringify({
          ...intent,
          base_revision: activeResume.revision,
        }),
      },
    );
    const normalized = normalizeResumeDocument(data.item);
    set((current) => ({
      resumes: current.resumes.map((resume) =>
        resume.id === normalized.id ? normalized : resume,
      ),
      cvData:
        current.activeResumeId === normalized.id
          ? normalized.cvData
          : current.cvData,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
  },

  importResume: async (name, cvData, source = "json") => {
    const data = await requestJson<{ item: ResumeDocument }>(
      "/api/v1/resumes/import-json",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          cv_data: cvData,
          source,
        }),
      },
    );
    set((state) => ({
      resumes: [normalizeResumeDocument(data.item), ...state.resumes],
      activeResumeId: data.item.id,
      cvData: normalizeResumeDocument(data.item).cvData,
      jobInsights: null,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
    return data.item.id;
  },

  duplicateResume: async (id) => {
    const sourceId = id ?? get().activeResumeId;
    const data = await requestJson<{ item: ResumeDocument }>(
      `/api/v1/resumes/${sourceId}/duplicate`,
      { method: "POST" },
    );
    set((state) => ({
      resumes: [normalizeResumeDocument(data.item), ...state.resumes],
      activeResumeId: data.item.id,
      cvData: normalizeResumeDocument(data.item).cvData,
      jobInsights: null,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
    return data.item.id;
  },

  deleteResume: async (id) => {
    const state = get();
    if (state.resumes.length <= 1) return;
    await requestJson(`/api/v1/resumes/${id}`, { method: "DELETE" });
    set((current) => {
      const resumes = current.resumes.filter((resume) => resume.id !== id);
      const activeResume =
        id === current.activeResumeId
          ? resumes[0]
          : (resumes.find((resume) => resume.id === current.activeResumeId) ??
            resumes[0]);
      return {
        resumes,
        activeResumeId: activeResume.id,
        cvData: normalizeCVData(activeResume.cvData, activeResume.templateId),
        jobInsights: id === current.activeResumeId ? null : current.jobInsights,
        resumeSaveStatus: "saved",
        resumeSaveError: null,
        lastResumeSavedAt: nowIso(),
      };
    });
  },

  renameResume: (id, name) => {
    const nextName = name.trim() || "Untitled CV";
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === id
          ? { ...resume, name: nextName, updatedAt: nowIso() }
          : resume,
      ),
    }));
    schedulePersistResume(id, { name: nextName });
  },

  setActiveResume: (id) =>
    set((state) => {
      const activeResume = state.resumes.find((resume) => resume.id === id);
      if (!activeResume) return state;
      return {
        activeResumeId: activeResume.id,
        cvData: normalizeCVData(activeResume.cvData, activeResume.templateId),
        jobInsights: null,
      };
    }),

  createResumeLocale: async (locale, sourceLocale) => {
    await flushPendingResumeSave();
    const state = get();
    const data = await requestJson<{ item: ResumeDocument }>(
      `/api/v1/resumes/${state.activeResumeId}/locales`,
      {
        method: "POST",
        body: JSON.stringify({
          locale,
          source_locale: sourceLocale,
        }),
      },
    );
    const normalized = normalizeResumeDocument(data.item);
    set((current) => ({
      resumes: current.resumes.map((resume) =>
        resume.id === normalized.id ? normalized : resume,
      ),
      cvData:
        current.activeResumeId === normalized.id
          ? normalized.cvData
          : current.cvData,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
  },

  activateResumeLocale: async (locale) => {
    await flushPendingResumeSave();
    const state = get();
    const data = await requestJson<{ item: ResumeDocument }>(
      `/api/v1/resumes/${state.activeResumeId}/locales/${locale}/activate`,
      {
        method: "POST",
      },
    );
    const normalized = normalizeResumeDocument(data.item);
    set((current) => ({
      resumes: current.resumes.map((resume) =>
        resume.id === normalized.id ? normalized : resume,
      ),
      cvData:
        current.activeResumeId === normalized.id
          ? normalized.cvData
          : current.cvData,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
  },

  deleteResumeLocale: async (locale) => {
    await flushPendingResumeSave();
    const state = get();
    const data = await requestJson<{ item: ResumeDocument }>(
      `/api/v1/resumes/${state.activeResumeId}/locales/${locale}`,
      {
        method: "DELETE",
      },
    );
    const normalized = normalizeResumeDocument(data.item);
    set((current) => ({
      resumes: current.resumes.map((resume) =>
        resume.id === normalized.id ? normalized : resume,
      ),
      cvData:
        current.activeResumeId === normalized.id
          ? normalized.cvData
          : current.cvData,
      resumeSaveStatus: "saved",
      resumeSaveError: null,
      lastResumeSavedAt: nowIso(),
    }));
  },

  exportActiveResume: async () => {
    await flushPendingResumeSave();
    const state = get();
    return requestJson<ResumeDocument>(
      `/api/v1/resumes/${state.activeResumeId}/export-json`,
    );
  },

  flushResumeSave: () => flushPendingResumeSave(),
  retryResumeSave: () => retryLastResumeSave(),

  // ── Job Insights ────────────────────────────────────────────────────────────
  jobInsights: null,
  setJobInsights: (data) => set({ jobInsights: data }),
  clearJobInsights: () => set({ jobInsights: null }),
  calculateAtsScore: async () => {
    const { cvData, jobInsights, appSettings } = get();
    if (!jobInsights) return;
    try {
      const res = await fetch(apiUrl("/api/v1/cv/score"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: cvData,
          job_insights: jobInsights,
          provider: appSettings.ats_llm.provider,
          model_name: appSettings.ats_llm.model_name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          set({
            jobInsights: {
              ...jobInsights,
              score: data.report.score,
              ats_report: data.report,
            },
          });
        }
      }
    } catch (err) {
      console.error("ATS score calculation failed", err);
    }
  },

  // ── Patch from AI bullets ────────────────────────────────────────────────────
  applyPatch: (patch) =>
    set((state) => {
      if (!patch.experience) return state;
      const updated = state.cvData.experience.map((exp) => {
        const match = patch.experience!.find((p) => p.id === exp.id);
        return match
          ? { ...exp, description_markdown: match.description_markdown }
          : exp;
      });
      return syncActiveResume(state, { ...state.cvData, experience: updated });
    }),

  // ── App Settings (multi-LLM per task) ────────────────────────────────────────
  appSettings: DEFAULT_APP_SETTINGS,
  setAppSettings: (s) =>
    set((state) => {
      const next = normalizeAppSettings({ ...state.appSettings, ...s });
      return { appSettings: next };
    }),
  hydrateAppSettings: async () => {
    try {
      const data = await requestJson<{ item: BackendSystemConfiguration }>(
        "/api/v1/system/configuration",
      );
      const next = systemConfigurationToAppSettings(data.item);
      set({ appSettings: next });
    } catch {
      // Keep in-memory defaults when backend configuration is temporarily unavailable.
    }
  },

  setGlobalSettings: (s) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        global_settings: { ...state.cvData.global_settings, ...s },
      }),
    ),

  setProfile: (p) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        profile: { ...state.cvData.profile, ...p },
      }),
    ),

  setHobbies: (h) =>
    set((state) => syncActiveResume(state, { ...state.cvData, hobbies: h })),

  setIsOptimizing: (v) => set({ isOptimizing: v }),

  // ── Experience ──────────────────────────────────────────────────────────────
  updateExperience: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        experience: state.cvData.experience.map((e) =>
          e.id === id ? { ...e, ...data } : e,
        ),
      }),
    ),

  reorderExperience: (oldIndex, newIndex) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        experience: arrayMove(state.cvData.experience, oldIndex, newIndex),
      }),
    ),

  addExperience: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        experience: [
          ...state.cvData.experience,
          {
            id: uid(),
            company: "Nouvelle Entreprise",
            role: "Poste",
            period: "2024 - Présent",
            location: { city: "Paris", country: "France" },
            description_markdown: "",
            keywords: [],
          },
        ],
      }),
    ),

  removeExperience: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        experience: state.cvData.experience.filter((e) => e.id !== id),
      }),
    ),

  // ── Education ──────────────────────────────────────────────────────────────
  updateEducation: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        education: state.cvData.education.map((e) =>
          e.id === id ? { ...e, ...data } : e,
        ),
      }),
    ),

  reorderEducation: (oldIndex, newIndex) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        education: arrayMove(state.cvData.education, oldIndex, newIndex),
      }),
    ),

  addEducation: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        education: [
          ...state.cvData.education,
          {
            id: uid(),
            institution: "Université",
            degree: "Diplôme",
            period: "2020 - 2024",
            location: "Paris, France",
            description_markdown: "",
          },
        ],
      }),
    ),

  removeEducation: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        education: state.cvData.education.filter((e) => e.id !== id),
      }),
    ),

  // ── Skills ─────────────────────────────────────────────────────────────────
  updateSkillGroup: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        skills: state.cvData.skills.map((s) =>
          s.id === id ? { ...s, ...data } : s,
        ),
      }),
    ),

  addSkillGroup: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        skills: [
          ...state.cvData.skills,
          { id: uid(), category: "Nouvelle catégorie", skills: [] },
        ],
      }),
    ),

  removeSkillGroup: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        skills: state.cvData.skills.filter((s) => s.id !== id),
      }),
    ),

  // ── Projects ───────────────────────────────────────────────────────────────
  updateProject: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        projects: state.cvData.projects.map((p) =>
          p.id === id ? { ...p, ...data } : p,
        ),
      }),
    ),

  reorderProjects: (oldIndex, newIndex) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        projects: arrayMove(state.cvData.projects, oldIndex, newIndex),
      }),
    ),

  addProject: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        projects: [
          ...state.cvData.projects,
          {
            id: uid(),
            name: "Nouveau Projet",
            url: "",
            description_markdown: "",
            tech_stack: [],
          },
        ],
      }),
    ),

  removeProject: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        projects: state.cvData.projects.filter((p) => p.id !== id),
      }),
    ),

  // ── Languages ──────────────────────────────────────────────────────────────
  updateLanguage: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        languages: state.cvData.languages.map((l) =>
          l.id === id ? { ...l, ...data } : l,
        ),
      }),
    ),

  addLanguage: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        languages: [
          ...state.cvData.languages,
          { id: uid(), language: "Langue", level: "B2" },
        ],
      }),
    ),

  removeLanguage: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        languages: state.cvData.languages.filter((l) => l.id !== id),
      }),
    ),

  // ── Advanced sections ────────────────────────────────────────────────────
  updateCertification: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        certifications: state.cvData.certifications.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        ),
      }),
    ),

  addCertification: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        certifications: [
          ...state.cvData.certifications,
          {
            id: uid(),
            name: "Nouvelle certification",
            issuer: "Organisme",
            date: "",
            url: "",
            description_markdown: "",
          },
        ],
      }),
    ),

  removeCertification: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        certifications: state.cvData.certifications.filter(
          (item) => item.id !== id,
        ),
      }),
    ),

  updateVolunteering: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        volunteering: state.cvData.volunteering.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        ),
      }),
    ),

  addVolunteering: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        volunteering: [
          ...state.cvData.volunteering,
          {
            id: uid(),
            organization: "Organisation",
            role: "Mentor",
            period: "",
            location: "",
            description_markdown: "",
          },
        ],
      }),
    ),

  removeVolunteering: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        volunteering: state.cvData.volunteering.filter(
          (item) => item.id !== id,
        ),
      }),
    ),

  updatePublication: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        publications: state.cvData.publications.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        ),
      }),
    ),

  addPublication: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        publications: [
          ...state.cvData.publications,
          {
            id: uid(),
            title: "Nouvelle publication",
            publisher: "Éditeur",
            date: "",
            url: "",
            description_markdown: "",
          },
        ],
      }),
    ),

  removePublication: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        publications: state.cvData.publications.filter(
          (item) => item.id !== id,
        ),
      }),
    ),

  updateReference: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        references: state.cvData.references.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        ),
      }),
    ),

  addReference: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        references: [
          ...state.cvData.references,
          {
            id: uid(),
            name: "Référence",
            role: "",
            company: "",
            contact: "",
            description_markdown: "",
          },
        ],
      }),
    ),

  removeReference: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        references: state.cvData.references.filter((item) => item.id !== id),
      }),
    ),

  updateCustomSection: (id, data) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        custom_sections: state.cvData.custom_sections.map((item) =>
          item.id === id ? { ...item, ...data } : item,
        ),
      }),
    ),

  addCustomSection: () =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        custom_sections: [
          ...state.cvData.custom_sections,
          {
            id: uid(),
            title: "Nouvelle section",
            content_markdown: "",
            items: [],
          },
        ],
      }),
    ),

  removeCustomSection: (id) =>
    set((state) =>
      syncActiveResume(state, {
        ...state.cvData,
        custom_sections: state.cvData.custom_sections.filter(
          (item) => item.id !== id,
        ),
      }),
    ),

  // ── Full replace ─────────────────────────────────────────────────────────
  replaceCVData: (data) =>
    set((state) =>
      syncActiveResume(
        state,
        normalizeCVData(
          { ...state.cvData, ...data },
          state.cvData.global_settings.template_id,
        ),
      ),
    ),
}));

configureResumeAutosave(useCVStore.setState);
