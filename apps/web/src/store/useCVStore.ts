import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import { apiUrl, jsonHeaders } from "@/lib/api";

import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  systemConfigurationToAppSettings,
  type BackendSystemConfiguration,
} from "./cv-store/app-settings";
import {
  createBlankCVData,
  createResumeDocument,
  normalizeCVData,
  normalizeResumeDocument,
  nowIso,
} from "./cv-store/resume-normalizers";
import type {
  AppSettings,
  CertificationItem,
  CVData,
  CustomSectionItem,
  EducationItem,
  ExperienceItem,
  GlobalSettings,
  JobInsights,
  LanguageItem,
  Profile,
  ProjectItem,
  PublicationItem,
  ReferenceItem,
  ResumeDocument,
  ResumeSaveStatus,
  SkillGroup,
  VolunteeringItem,
} from "./cv-store/types";

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
export type {
  AppSettings,
  AtsReport,
  AtsDeduction,
  AtsReportContext,
  AtsRubric,
  AtsRubricDimension,
  CertificationItem,
  CompanyInsight,
  CVData,
  CustomSectionItem,
  EducationItem,
  ExperienceItem,
  GlobalSettings,
  HistoryLedgerItem,
  HistoryLedgerLink,
  JobInsights,
  KeywordStatus,
  LanguageItem,
  LLMConfig,
  LLMProvider,
  Location,
  PdfIngestionMode,
  Profile,
  ProjectItem,
  PublicationItem,
  ReferenceItem,
  ResumeDocument,
  ResumeLocale,
  ResumeSaveStatus,
  ScoringCriteria,
  SkillGroup,
  Social,
  VolunteeringItem,
} from "./cv-store/types";

// ── Store Interface ───────────────────────────────────────────────────────────

interface CVStore {
  cvData: CVData;
  resumes: ResumeDocument[];
  activeResumeId: string;
  isResumeLibraryLoading: boolean;
  resumeSaveStatus: ResumeSaveStatus;
  resumeSaveError: string | null;
  lastResumeSavedAt: string | null;
  isOptimizing: boolean;

  // Resume library
  loadResumes: () => Promise<void>;
  createResume: (name?: string, templateId?: string) => Promise<string>;
  importResume: (
    name: string,
    cvData: CVData,
    source?: string,
  ) => Promise<string>;
  duplicateResume: (id?: string) => Promise<string>;
  deleteResume: (id: string) => Promise<void>;
  renameResume: (id: string, name: string) => void;
  setActiveResume: (id: string) => void;
  createResumeLocale: (
    locale: "fr" | "en" | "de" | "es",
    sourceLocale?: "fr" | "en" | "de" | "es",
  ) => Promise<void>;
  activateResumeLocale: (locale: "fr" | "en" | "de" | "es") => Promise<void>;
  deleteResumeLocale: (locale: "fr" | "en" | "de" | "es") => Promise<void>;
  exportActiveResume: () => Promise<ResumeDocument>;
  flushResumeSave: () => Promise<void>;
  retryResumeSave: () => Promise<void>;

  // Job Insights
  jobInsights: JobInsights | null;
  setJobInsights: (data: JobInsights | null) => void;
  clearJobInsights: () => void;
  calculateAtsScore: () => Promise<void>;

  // Auto-inject mode (Option A)
  autoInjectMode: boolean;
  setAutoInjectMode: (v: boolean) => void;

  // Apply a patch from /api/v1/cv/patch-from-bullets
  applyPatch: (patch: {
    experience?: Array<{ id: string; description_markdown: string }>;
  }) => void;

  // App settings (multi-LLM per task)
  appSettings: AppSettings;
  setAppSettings: (s: Partial<AppSettings>) => void;
  hydrateAppSettings: () => Promise<void>;

  // Generic setters
  setGlobalSettings: (s: Partial<GlobalSettings>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setHobbies: (h: string[]) => void;
  setIsOptimizing: (v: boolean) => void;

  // Experience
  updateExperience: (id: string, data: Partial<ExperienceItem>) => void;
  reorderExperience: (oldIndex: number, newIndex: number) => void;
  addExperience: () => void;
  removeExperience: (id: string) => void;

  // Education
  updateEducation: (id: string, data: Partial<EducationItem>) => void;
  reorderEducation: (oldIndex: number, newIndex: number) => void;
  addEducation: () => void;
  removeEducation: (id: string) => void;

  // Skills
  updateSkillGroup: (id: string, data: Partial<SkillGroup>) => void;
  addSkillGroup: () => void;
  removeSkillGroup: (id: string) => void;

  // Projects
  updateProject: (id: string, data: Partial<ProjectItem>) => void;
  reorderProjects: (oldIndex: number, newIndex: number) => void;
  addProject: () => void;
  removeProject: (id: string) => void;

  // Languages
  updateLanguage: (id: string, data: Partial<LanguageItem>) => void;
  addLanguage: () => void;
  removeLanguage: (id: string) => void;

  // Advanced sections
  updateCertification: (id: string, data: Partial<CertificationItem>) => void;
  addCertification: () => void;
  removeCertification: (id: string) => void;
  updateVolunteering: (id: string, data: Partial<VolunteeringItem>) => void;
  addVolunteering: () => void;
  removeVolunteering: (id: string) => void;
  updatePublication: (id: string, data: Partial<PublicationItem>) => void;
  addPublication: () => void;
  removePublication: (id: string) => void;
  updateReference: (id: string, data: Partial<ReferenceItem>) => void;
  addReference: () => void;
  removeReference: (id: string) => void;
  updateCustomSection: (id: string, data: Partial<CustomSectionItem>) => void;
  addCustomSection: () => void;
  removeCustomSection: (id: string) => void;

  // Full replace (used by PDF upload / JSON import)
  replaceCVData: (data: Partial<CVData>) => void;
}

// ── Initial Data ─────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const initialCV: CVData = {
  global_settings: {
    font_family: "Inter",
    font_size: "13px",
    primary_color: "#2563eb",
    line_height: "1.5",
    margin_page: "48px", // legacy fallback
    margin_h: "64px",
    margin_v: "48px",
    entry_spacing: "20px",
    col_left_width: "65",
    col_swap: "false",
    template_id: "modern",
    advanced_css: {
      enabled: false,
      mode: "off",
      css_text: "",
      preset_id: null,
      warnings: [],
    },
  },
  profile: {
    full_name: "Jean Dupont",
    title: "AI Engineer & Full-Stack Developer",
    phone: "+33 6 00 00 00 00",
    email: "jeandupont@gmail.com",
    location: { city: "Paris", country: "France" },
    socials: [
      { type: "linkedin", url: "https://linkedin.com/in/jeandupont" },
      { type: "github", url: "https://github.com/jeandupont" },
    ],
    text_markdown:
      "Expert en **Data Science** et **IA**, spécialisé dans le déploiement d'architectures autonomes et scalables.",
  },
  experience: [
    {
      id: uid(),
      company: "Tech Corp",
      role: "IA Engineer",
      period: "2022 - Présent",
      location: { city: "Paris", country: "France" },
      description_markdown:
        "- Optimisation de **pipelines RAG**\n- Lead sur le projet X",
      keywords: ["RAG", "Python", "LangGraph"],
    },
    {
      id: uid(),
      company: "Startup Inc",
      role: "Full-Stack Developer",
      period: "2020 - 2022",
      location: { city: "Lyon", country: "France" },
      description_markdown:
        "- Développement du MVP en 3 mois\n- Architecture microservices",
      keywords: ["Next.js", "FastAPI", "PostgreSQL"],
    },
  ],
  education: [
    {
      id: uid(),
      institution: "PSTB",
      degree: "Double Diplôme Data & IA",
      period: "2024 - 2026",
      location: "Paris, France",
      description_markdown:
        "Focus sur le Deep Learning et l'ingénierie des données.",
    },
  ],
  skills: [
    {
      id: uid(),
      category: "Backend",
      skills: ["Python", "FastAPI", "Bun", "PostgreSQL"],
    },
    {
      id: uid(),
      category: "AI/LLM",
      skills: ["LangGraph", "CrewAI", "RAG", "Embeddings"],
    },
    {
      id: uid(),
      category: "Frontend",
      skills: ["Next.js", "React", "TypeScript", "Tailwind"],
    },
  ],
  projects: [
    {
      id: uid(),
      name: "Mindris AI",
      url: "https://github.com/mindrisai",
      description_markdown:
        "Architecture microservices pour l'optimisation de carri\u00e8re via agents IA.",
      tech_stack: ["LangGraph", "Playwright", "Supabase"],
    },
  ],
  certifications: [
    {
      id: uid(),
      name: "AWS Certified",
      issuer: "Amazon",
      date: "2025",
      url: "https://aws.amazon.com",
      description_markdown: "- Cloud architecture",
    },
  ],
  volunteering: [],
  publications: [],
  references: [],
  custom_sections: [],
  languages: [
    { id: uid(), language: "Français", level: "Natif" },
    { id: uid(), language: "Anglais", level: "Full Professional Proficiency" },
  ],
  hobbies: ["Informatique", "Veille Technologique", "Entrepreneuriat"],
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Resume save failed";
}

const initialResume = createResumeDocument("CV principal", initialCV, uid);

function syncActiveResume(
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : jsonHeaders()),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function persistResume(resumeId: string, patch: Partial<ResumeDocument>) {
  return requestJson<{ item: ResumeDocument }>(`/api/v1/resumes/${resumeId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      cv_data: patch.cvData,
      template_id: patch.templateId,
      locale: patch.locale,
      target_locale: patch.multilingual?.activeLocale,
      source: "editor",
    }),
  });
}

const RESUME_SAVE_DEBOUNCE_MS = 900;

type PendingResumeSave = {
  resumeId: string;
  patch: Partial<ResumeDocument>;
  revision: number;
};

let resumeSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingResumeSave: PendingResumeSave | null = null;
let lastFailedResumeSave: PendingResumeSave | null = null;
let resumeSaveRevision = 0;

function schedulePersistResume(
  resumeId: string,
  patch: Partial<ResumeDocument>,
) {
  resumeSaveRevision += 1;
  pendingResumeSave = {
    resumeId,
    patch,
    revision: resumeSaveRevision,
  };
  lastFailedResumeSave = null;
  if (resumeSaveTimer) clearTimeout(resumeSaveTimer);
  useCVStore.setState({
    resumeSaveStatus: "dirty",
    resumeSaveError: null,
  });
  resumeSaveTimer = setTimeout(() => {
    void flushPendingResumeSave();
  }, RESUME_SAVE_DEBOUNCE_MS);
}

async function saveResumeSnapshot(snapshot: PendingResumeSave) {
  useCVStore.setState({
    resumeSaveStatus: "saving",
    resumeSaveError: null,
  });
  try {
    const data = await persistResume(snapshot.resumeId, snapshot.patch);
    if (snapshot.revision === resumeSaveRevision) {
      useCVStore.setState((state) => ({
        resumes: state.resumes.map((resume) =>
          resume.id === data.item.id
            ? normalizeResumeDocument(data.item)
            : resume,
        ),
        cvData:
          state.activeResumeId === data.item.id
            ? normalizeResumeDocument(data.item).cvData
            : state.cvData,
        resumeSaveStatus: "saved",
        resumeSaveError: null,
        lastResumeSavedAt: nowIso(),
      }));
    }
  } catch (error: unknown) {
    lastFailedResumeSave = snapshot;
    if (snapshot.revision === resumeSaveRevision) {
      useCVStore.setState({
        resumeSaveStatus: "error",
        resumeSaveError: errorMessage(error),
      });
    }
  }
}

async function flushPendingResumeSave() {
  if (resumeSaveTimer) {
    clearTimeout(resumeSaveTimer);
    resumeSaveTimer = null;
  }
  const snapshot = pendingResumeSave;
  pendingResumeSave = null;
  if (!snapshot) return;
  await saveResumeSnapshot(snapshot);
}

async function retryLastResumeSave() {
  if (pendingResumeSave) {
    await flushPendingResumeSave();
    return;
  }
  if (!lastFailedResumeSave) return;
  resumeSaveRevision += 1;
  const snapshot = {
    ...lastFailedResumeSave,
    revision: resumeSaveRevision,
  };
  lastFailedResumeSave = null;
  await saveResumeSnapshot(snapshot);
}

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

  // ── Auto-inject mode ────────────────────────────────────────────────────────
  autoInjectMode: false,
  setAutoInjectMode: (v) => set({ autoInjectMode: v }),

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
