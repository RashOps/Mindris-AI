import { createResumeDocument } from "./resume-normalizers";
import type { CVData } from "./types";

// ── Initial Data ─────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 9);

export const initialCV: CVData = {
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

export const initialResume = createResumeDocument("CV principal", initialCV, uid);
