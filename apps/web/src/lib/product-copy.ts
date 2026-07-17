export const PRODUCT_COPY = {
  app: {
    name: "Mindris AI",
    tagline: "Studio CV local",
    workspaceTitle: "Workspace",
    workspaceDescription: "Construire, analyser et exporter tes documents de candidature via des API backend.",
    backHome: "Retour à l’accueil",
  },
  tools: {
    dashboard: {
      label: "Dashboard",
      shortLabel: "Accueil",
      description: "Bibliothèque de CV, templates et état du produit",
    },
    "cv-creator": {
      label: "CV Builder",
      shortLabel: "CV",
      description: "Éditeur structuré avec preview en direct",
    },
    "ats-score": {
      label: "ATS Score",
      shortLabel: "ATS",
      description: "Analyse de mots-clés et compatibilité ATS",
    },
    workflow: {
      label: "Workflow",
      shortLabel: "Flow",
      badge: "Beta",
      description: "Parcours beta de l’offre à la candidature",
    },
    tracker: {
      label: "Tracker",
      shortLabel: "Suivi",
      description: "Tableau de suivi des candidatures",
    },
    history: {
      label: "History",
      shortLabel: "Audit",
      description: "Historique unifié et lignée des artefacts",
    },
    guide: {
      label: "Guide",
      shortLabel: "Guide",
      description: "Guide produit, parcours et règles d’utilisation",
    },
    markdown: {
      label: "Markdown PDF",
      shortLabel: "PDF",
      description: "Convertir Markdown et lettres en PDF",
    },
  },
  sidebar: {
    configuration: {
      label: "Configuration",
      description: "Configurer providers, modèles, secrets et runtime local.",
    },
    localServices: {
      label: "Services locaux",
      description: "Endpoints locaux et ports runtime du workspace.",
    },
  },
} as const;
