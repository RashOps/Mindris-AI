import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';

// ── Types aligned with cv_schema.json ────────────────────────────────────────

export interface GlobalSettings {
  // Typography
  font_family:   string;
  font_size:     string;     // e.g. "13px"
  primary_color: string;
  line_height:   string;     // e.g. "1.5"
  // Spacing
  margin_page:   string;     // legacy — kept for backward compat
  margin_h:      string;     // left & right margin e.g. "64px"
  margin_v:      string;     // top & bottom margin e.g. "48px"
  entry_spacing: string;     // space between entries e.g. "20px"
  // Layout
  col_left_width: string;   // left column width in % e.g. "65"
  col_swap:       string;   // "true" | "false" — swap L/R columns
  template_id:    string;   // "modern" | "compact"
}

export interface Social {
  type: 'linkedin' | 'github' | 'website' | 'other';
  url: string;
  label?: string;
}

export interface Location {
  city: string;
  country: string;
}

export interface Profile {
  full_name: string;
  title: string;
  phone: string;
  email: string;
  location: Location;
  socials: Social[];
  text_markdown: string; // summary / about
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  location: Location;
  description_markdown: string;
  keywords: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  period: string;
  location: string;
  description_markdown: string;
}

export interface SkillGroup {
  id: string;
  category: string;
  skills: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  url?: string;
  description_markdown: string;
  tech_stack: string[];
}

export interface LanguageItem {
  id: string;
  language: string;
  level: string;
}

// ── Job Insights (from SSE job_result event) ──────────────────────────────────

export interface JobInsights {
  job_title: string;
  company: string;
  hard_skills: string[];
  soft_skills: string[];
  drafted_bullets: string[];   // parsed from Markdown
  raw_markdown: string;
  score: number;
}

// ── Multi-LLM per task ────────────────────────────────────────────────────────

export type LLMProvider = 'groq' | 'gemini' | 'openai' | 'mistral' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  model_name: string;
}

export interface AppSettings {
  optimize_llm:     LLMConfig;
  cover_letter_llm: LLMConfig;
  ats_llm:          LLMConfig;
  patch_llm:        LLMConfig;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  optimize_llm:     { provider: 'groq',   model_name: 'llama-3.3-70b-versatile' },
  cover_letter_llm: { provider: 'groq',   model_name: 'llama-3.3-70b-versatile' },
  ats_llm:          { provider: 'groq',   model_name: 'llama-3.1-8b-instant' },
  patch_llm:        { provider: 'groq',   model_name: 'llama-3.3-70b-versatile' },
};

export interface CVData {
  global_settings: GlobalSettings;
  profile: Profile;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  projects: ProjectItem[];
  languages: LanguageItem[];
  hobbies: string[];
}

// ── Store Interface ───────────────────────────────────────────────────────────

interface CVStore {
  cvData: CVData;
  isOptimizing: boolean;

  // Job Insights
  jobInsights: JobInsights | null;
  setJobInsights: (data: JobInsights | null) => void;
  clearJobInsights: () => void;
  calculateAtsScore: () => Promise<void>;

  // Auto-inject mode (Option A)
  autoInjectMode: boolean;
  setAutoInjectMode: (v: boolean) => void;

  // Apply a patch from /api/v1/cv/patch-from-bullets
  applyPatch: (patch: { experience?: Array<{ id: string; description_markdown: string }> }) => void;

  // App settings (multi-LLM per task)
  appSettings: AppSettings;
  setAppSettings: (s: Partial<AppSettings>) => void;

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

  // Full replace (used by PDF upload / JSON import)
  replaceCVData: (data: Partial<CVData>) => void;
}

// ── Initial Data ─────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const initialCV: CVData = {
  global_settings: {
    font_family:    'Inter',
    font_size:      '13px',
    primary_color:  '#2563eb',
    line_height:    '1.5',
    margin_page:    '48px',   // legacy fallback
    margin_h:       '64px',
    margin_v:       '48px',
    entry_spacing:  '20px',
    col_left_width: '65',
    col_swap:       'false',
    template_id:    'modern',
  },
  profile: {
    full_name: 'Jean Dupont',
    title: 'AI Engineer & Full-Stack Developer',
    phone: '+33 6 00 00 00 00',
    email: 'jeandupont@gmail.com',
    location: { city: 'Paris', country: 'France' },
    socials: [
      { type: 'linkedin', url: 'https://linkedin.com/in/jeandupont' },
      { type: 'github', url: 'https://github.com/jeandupont' },
    ],
    text_markdown:
      "Expert en **Data Science** et **IA**, spécialisé dans le déploiement d'architectures autonomes et scalables.",
  },
  experience: [
    {
      id: uid(),
      company: 'Tech Corp',
      role: 'IA Engineer',
      period: '2022 - Présent',
      location: { city: 'Paris', country: 'France' },
      description_markdown: "- Optimisation de **pipelines RAG**\n- Lead sur le projet X",
      keywords: ['RAG', 'Python', 'LangGraph'],
    },
    {
      id: uid(),
      company: 'Startup Inc',
      role: 'Full-Stack Developer',
      period: '2020 - 2022',
      location: { city: 'Lyon', country: 'France' },
      description_markdown: '- Développement du MVP en 3 mois\n- Architecture microservices',
      keywords: ['Next.js', 'FastAPI', 'PostgreSQL'],
    },
  ],
  education: [
    {
      id: uid(),
      institution: 'PSTB',
      degree: 'Double Diplôme Data & IA',
      period: '2024 - 2026',
      location: 'Paris, France',
      description_markdown: "Focus sur le Deep Learning et l'ingénierie des données.",
    },
  ],
  skills: [
    { id: uid(), category: 'Backend', skills: ['Python', 'FastAPI', 'Bun', 'PostgreSQL'] },
    { id: uid(), category: 'AI/LLM', skills: ['LangGraph', 'CrewAI', 'RAG', 'Embeddings'] },
    { id: uid(), category: 'Frontend', skills: ['Next.js', 'React', 'TypeScript', 'Tailwind'] },
  ],
  projects: [
    {
      id: uid(),
      name: 'Mindris AI',
      url: 'https://github.com/mindrisai',
      description_markdown:
        "Architecture microservices pour l'optimisation de carri\u00e8re via agents IA.",
      tech_stack: ['LangGraph', 'Playwright', 'Supabase'],
    },
  ],
  languages: [
    { id: uid(), language: 'Français', level: 'Natif' },
    { id: uid(), language: 'Anglais', level: 'Full Professional Proficiency' },
  ],
  hobbies: ['Informatique', 'Veille Technologique', 'Entrepreneuriat'],
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCVStore = create<CVStore>((set, get) => ({
  cvData: initialCV,
  isOptimizing: false,

  // ── Job Insights ────────────────────────────────────────────────────────────
  jobInsights: null,
  setJobInsights: (data) => set({ jobInsights: data }),
  clearJobInsights: () => set({ jobInsights: null }),
  calculateAtsScore: async () => {
    const { cvData, jobInsights, appSettings } = get();
    if (!jobInsights) return;
    try {
      const res = await fetch("http://localhost:8000/api/v1/cv/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_data: cvData,
          job_insights: jobInsights,
          provider: appSettings.patch_llm.provider,
          model_name: appSettings.patch_llm.model_name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ jobInsights: { ...jobInsights, score: data.score } });
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
        return match ? { ...exp, description_markdown: match.description_markdown } : exp;
      });
      return { cvData: { ...state.cvData, experience: updated } };
    }),

  // ── App Settings (multi-LLM per task) ────────────────────────────────────────
  appSettings: DEFAULT_APP_SETTINGS,
  setAppSettings: (s) => set((state) => ({ appSettings: { ...state.appSettings, ...s } })),

  setGlobalSettings: (s) =>
    set((state) => ({
      cvData: { ...state.cvData, global_settings: { ...state.cvData.global_settings, ...s } },
    })),

  setProfile: (p) =>
    set((state) => ({
      cvData: { ...state.cvData, profile: { ...state.cvData.profile, ...p } },
    })),

  setHobbies: (h) => set((state) => ({ cvData: { ...state.cvData, hobbies: h } })),

  setIsOptimizing: (v) => set({ isOptimizing: v }),

  // ── Experience ──────────────────────────────────────────────────────────────
  updateExperience: (id, data) =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        experience: state.cvData.experience.map((e) => (e.id === id ? { ...e, ...data } : e)),
      },
    })),

  reorderExperience: (oldIndex, newIndex) =>
    set((state) => ({
      cvData: { ...state.cvData, experience: arrayMove(state.cvData.experience, oldIndex, newIndex) },
    })),

  addExperience: () =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        experience: [
          ...state.cvData.experience,
          {
            id: uid(),
            company: 'Nouvelle Entreprise',
            role: 'Poste',
            period: '2024 - Présent',
            location: { city: 'Paris', country: 'France' },
            description_markdown: '',
            keywords: [],
          },
        ],
      },
    })),

  removeExperience: (id) =>
    set((state) => ({
      cvData: { ...state.cvData, experience: state.cvData.experience.filter((e) => e.id !== id) },
    })),

  // ── Education ──────────────────────────────────────────────────────────────
  updateEducation: (id, data) =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        education: state.cvData.education.map((e) => (e.id === id ? { ...e, ...data } : e)),
      },
    })),

  reorderEducation: (oldIndex, newIndex) =>
    set((state) => ({
      cvData: { ...state.cvData, education: arrayMove(state.cvData.education, oldIndex, newIndex) },
    })),

  addEducation: () =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        education: [
          ...state.cvData.education,
          {
            id: uid(),
            institution: 'Université',
            degree: 'Diplôme',
            period: '2020 - 2024',
            location: 'Paris, France',
            description_markdown: '',
          },
        ],
      },
    })),

  removeEducation: (id) =>
    set((state) => ({
      cvData: { ...state.cvData, education: state.cvData.education.filter((e) => e.id !== id) },
    })),

  // ── Skills ─────────────────────────────────────────────────────────────────
  updateSkillGroup: (id, data) =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        skills: state.cvData.skills.map((s) => (s.id === id ? { ...s, ...data } : s)),
      },
    })),

  addSkillGroup: () =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        skills: [...state.cvData.skills, { id: uid(), category: 'Nouvelle catégorie', skills: [] }],
      },
    })),

  removeSkillGroup: (id) =>
    set((state) => ({
      cvData: { ...state.cvData, skills: state.cvData.skills.filter((s) => s.id !== id) },
    })),

  // ── Projects ───────────────────────────────────────────────────────────────
  updateProject: (id, data) =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        projects: state.cvData.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
      },
    })),

  reorderProjects: (oldIndex, newIndex) =>
    set((state) => ({
      cvData: { ...state.cvData, projects: arrayMove(state.cvData.projects, oldIndex, newIndex) },
    })),

  addProject: () =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        projects: [
          ...state.cvData.projects,
          {
            id: uid(),
            name: 'Nouveau Projet',
            url: '',
            description_markdown: '',
            tech_stack: [],
          },
        ],
      },
    })),

  removeProject: (id) =>
    set((state) => ({
      cvData: { ...state.cvData, projects: state.cvData.projects.filter((p) => p.id !== id) },
    })),

  // ── Languages ──────────────────────────────────────────────────────────────
  updateLanguage: (id, data) =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        languages: state.cvData.languages.map((l) => (l.id === id ? { ...l, ...data } : l)),
      },
    })),

  addLanguage: () =>
    set((state) => ({
      cvData: {
        ...state.cvData,
        languages: [...state.cvData.languages, { id: uid(), language: 'Langue', level: 'B2' }],
      },
    })),

  removeLanguage: (id) =>
    set((state) => ({
      cvData: { ...state.cvData, languages: state.cvData.languages.filter((l) => l.id !== id) },
    })),

  // ── Full replace ───────────────────────────────────────────────────────────
  replaceCVData: (data) =>
    set((state) => ({ cvData: { ...state.cvData, ...data } })),
}));
