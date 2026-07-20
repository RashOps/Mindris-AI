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
} from "./types";

export interface CVStore {
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
