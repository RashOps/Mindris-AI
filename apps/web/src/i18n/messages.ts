export const fr = {
  app: {
    name: "Mindris AI",
    tagline: "Studio CV local",
    workspaceTitle: "Espace de travail",
    workspaceDescription:
      "Construire, analyser et exporter vos documents de candidature via des API backend.",
    backHome: "Retour à l’accueil",
  },
  tools: {
    dashboard: { label: "Tableau de bord", shortLabel: "Accueil", description: "Bibliothèque de CV, modèles et état du produit" },
    "cv-creator": { label: "CV Builder", shortLabel: "CV", description: "Éditeur structuré avec aperçu en direct" },
    "ats-score": { label: "Score ATS", shortLabel: "ATS", description: "Analyse de mots-clés et compatibilité ATS" },
    workflow: { label: "Workflow", shortLabel: "Parcours", badge: "Beta", description: "Parcours beta de l’offre à la candidature" },
    tracker: { label: "Suivi", shortLabel: "Suivi", description: "Tableau de suivi des candidatures" },
    history: { label: "Historique", shortLabel: "Audit", description: "Historique unifié et lignée des artefacts" },
    guide: { label: "Guide", shortLabel: "Guide", description: "Guide produit, parcours et règles d’utilisation" },
    markdown: { label: "Markdown PDF", shortLabel: "PDF", description: "Convertir le Markdown et les lettres en PDF" },
  },
  sidebar: {
    configuration: { label: "Configuration", description: "Configurer fournisseurs, modèles, secrets et runtime local." },
    localServices: { label: "Services locaux", description: "Endpoints locaux et ports du runtime." },
  },
  common: {
    loading: "Chargement…",
    error: "Une erreur est survenue.",
    close: "Fermer",
    back: "Retour",
    save: "Enregistrer",
    cancel: "Annuler",
    apply: "Appliquer",
    ignore: "Ignorer",
    search: "Rechercher",
  },
} as const;

type DeepString<T> = {
  [Key in keyof T]: T[Key] extends string ? string : DeepString<T[Key]>;
};

export type Messages = DeepString<typeof fr>;
export type UiLocale = "fr" | "en";

export const en: Messages = {
  app: {
    name: "Mindris AI",
    tagline: "Local resume studio",
    workspaceTitle: "Workspace",
    workspaceDescription:
      "Build, analyze and export application documents through backend APIs.",
    backHome: "Back to home",
  },
  tools: {
    dashboard: { label: "Dashboard", shortLabel: "Home", description: "Resume library, templates and product status" },
    "cv-creator": { label: "CV Builder", shortLabel: "CV", description: "Structured editor with live preview" },
    "ats-score": { label: "ATS Score", shortLabel: "ATS", description: "Keyword and ATS compatibility analysis" },
    workflow: { label: "Workflow", shortLabel: "Flow", badge: "Beta", description: "Beta flow from job to application" },
    tracker: { label: "Tracker", shortLabel: "Tracker", description: "Application tracking board" },
    history: { label: "History", shortLabel: "Audit", description: "Unified history and artifact lineage" },
    guide: { label: "Guide", shortLabel: "Guide", description: "Product guide, workflows and usage rules" },
    markdown: { label: "Markdown PDF", shortLabel: "PDF", description: "Convert Markdown and letters to PDF" },
  },
  sidebar: {
    configuration: { label: "Configuration", description: "Configure providers, models, secrets and local runtime." },
    localServices: { label: "Local services", description: "Local endpoints and runtime ports." },
  },
  common: {
    loading: "Loading…",
    error: "Something went wrong.",
    close: "Close",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    apply: "Apply",
    ignore: "Ignore",
    search: "Search",
  },
};

export const MESSAGES: Record<UiLocale, Messages> = { fr, en };
