import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FileText,
  GitBranch,
  History,
  LockKeyhole,
  Search,
  Settings2,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export type GuideSection = {
  id: string;
  title: string;
  badge: string;
  summary: string;
  icon: LucideIcon;
  route?: string;
  items: string[];
  steps: string[];
  checklist: string[];
  tips: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "product-loop",
    title: "Mindris en une boucle",
    badge: "Carte produit",
    summary: "Le produit complet tient dans un parcours candidature mesurable.",
    icon: BookOpen,
    route: "/dashboard",
    items: [
      "Mindris est un studio local-first pour préparer une candidature : importer un CV, analyser une offre, adapter le contenu, générer les artefacts et suivre l’envoi.",
      "Le frontend reste une surface d’opération. L’état durable, les actions destructives, les secrets et l’orchestration IA restent derrière les APIs backend.",
    ],
    steps: ["Importer", "Analyser", "Adapter", "Générer", "Suivre"],
    checklist: [
      "Un CV source est disponible.",
      "Une offre réelle sert de contexte.",
      "Les artefacts générés restent reliés à l’offre.",
    ],
    tips: ["Utilise History quand tu dois prouver quel artefact vient de quelle offre."],
  },
  {
    id: "start-from-job",
    title: "1. Démarrer depuis une offre",
    badge: "Signal",
    summary: "Transformer une URL d’offre en signaux structurés : rôle, entreprise, mots-clés et contexte ATS.",
    icon: Search,
    route: "/tools/cv-creator",
    items: [
      "Colle une URL dans CV Builder, ATS Score ou Workflow pour extraire les signaux exploitables de l’offre.",
      "Lis les compétences manquantes, l’intitulé cible, le contexte entreprise et les preuves ATS avant de modifier le CV.",
    ],
    steps: ["Coller l’URL", "Extraire", "Relire les signaux", "Conserver le lien job"],
    checklist: [
      "Le titre du poste et l’entreprise sont corrects.",
      "Les hard skills importantes sont visibles.",
      "L’offre est liée aux rapports ATS ou lettres générés.",
    ],
    tips: ["Ne modifie pas le CV à l’aveugle : commence par identifier les écarts avec l’offre."],
  },
  {
    id: "build-resume",
    title: "2. Construire le CV",
    badge: "CV Studio",
    summary: "Éditer le contenu et le design sans déplacer la logique métier dans le navigateur.",
    icon: FileText,
    route: "/tools/cv-creator",
    items: [
      "Le mode Simple aide les profils non techniques à éviter les réglages avancés. Normal expose les contrôles utiles au quotidien. Avancé regroupe les diagnostics, l’IA et les actions sensibles.",
      "Le Style Studio sert à ajuster le rendu, mais les defaults, exports et décisions métier restent backend-owned.",
    ],
    steps: ["Choisir un mode", "Éditer la structure", "Ajuster le style", "Exporter"],
    checklist: [
      "Le CV reste lisible sans surcharge visuelle.",
      "Les sections inutiles sont masquées ou simplifiées.",
      "Le PDF exporté correspond à la preview.",
    ],
    tips: ["Pour un utilisateur non technique, commence toujours par Simple puis ouvre Normal seulement si nécessaire."],
  },
  {
    id: "workflow",
    title: "3. Piloter le Workflow",
    badge: "Beta",
    summary: "Relier job, CV, rapport ATS, lettre de motivation et tracker dans une même lignée.",
    icon: GitBranch,
    route: "/tools/workflow",
    items: [
      "Workflow reste volontairement marqué Beta tant que toutes les surfaces d’historique ne sont pas totalement mûres.",
      "Il sert surtout à vérifier la cohérence des liens entre artefacts avant de pousser une candidature dans Tracker.",
    ],
    steps: ["Créer l’opportunité", "Lier le CV", "Lier ATS", "Lier lettre", "Créer Tracker"],
    checklist: [
      "L’opportunité référence le bon job.",
      "Le rapport ATS et la lettre ont le même job_id.",
      "Le tracker reprend les artefacts validés.",
    ],
    tips: ["Si un lien est incohérent, corrige la source avant d’ajouter l’entrée Tracker."],
  },
  {
    id: "track-audit",
    title: "4. Suivre et auditer",
    badge: "Historique",
    summary: "Retrouver ce qui a été généré, par quel modèle, pour quelle offre et avec quels liens.",
    icon: History,
    route: "/tools/history",
    items: [
      "History regroupe les offres scrapées, rapports ATS, lettres, révisions, transitions Workflow, éléments Tracker et runs IA.",
      "C’est la surface de contrôle quand une candidature doit être expliquée ou reproduite.",
    ],
    steps: ["Filtrer", "Sélectionner", "Inspecter", "Comparer les liens"],
    checklist: [
      "Les artefacts critiques ont un lien job.",
      "Les runs IA indiquent provider/modèle.",
      "Les suppressions d’historique restent explicites.",
    ],
    tips: ["Garde History comme référence d’audit, pas comme outil d’édition."],
  },
  {
    id: "runtime",
    title: "5. Configurer le runtime",
    badge: "Runtime",
    summary: "Contrôler les services locaux, defaults IA, diagnostics et secrets write-only.",
    icon: Settings2,
    route: "/dashboard",
    items: [
      "Configuration centralise les defaults par tâche, l’ingestion, les diagnostics runtime et les slots de secrets.",
      "Le RuntimeGate attend les endpoints backend/renderer avant d’ouvrir le workspace pour éviter une UI active sur un système non prêt.",
    ],
    steps: ["Vérifier Ready", "Choisir les réglages", "Tester les fournisseurs", "Lancer l’action"],
    checklist: [
      "API gateway prêt.",
      "Renderer prêt.",
      "Les clés provider ne sont jamais affichées en clair.",
    ],
    tips: ["Les secrets sont write-only : l’UI peut confirmer leur présence, pas les révéler."],
  },
  {
    id: "client-server",
    title: "Frontière client/serveur",
    badge: "Architecture",
    summary: "Le navigateur rend l’expérience ; les services Python/Bun possèdent l’état produit.",
    icon: ShieldCheck,
    items: [
      "Le code navigateur ne doit pas devenir une couche de service cachée. Il appelle les APIs, rend l’état et conserve seulement des préférences UI courtes comme le thème.",
      "L’accès navigateur local passe par la frontière loopback. Les scripts opérateur et appels externes continuent d’utiliser X-API-Key.",
      "Les secrets, exports, defaults métier, nettoyage destructif et orchestration provider restent backend-owned.",
    ],
    steps: ["UI appelle", "Backend décide", "Renderer exporte"],
    checklist: [
      "Aucune clé brute dans les réponses UI.",
      "Aucune décision métier durable dans le frontend.",
      "Les exports passent par le renderer.",
    ],
    tips: ["Si une règle change le résultat produit, elle appartient au backend."],
  },
  {
    id: "destructive-actions",
    title: "Actions destructives",
    badge: "Sécurité",
    summary: "Rendre les suppressions et réparations explicites, traçables et côté serveur.",
    icon: LockKeyhole,
    items: [
      "Mindris ne doit jamais exposer les secrets bruts dans l’UI, les logs ou les réponses API.",
      "Les nettoyages massifs doivent être confirmés puis exécutés transactionnellement par le backend.",
    ],
    steps: ["Confirmer", "Exécuter serveur", "Auditer"],
    checklist: [
      "L’utilisateur voit exactement ce qui sera supprimé.",
      "L’action est réversible quand c’est possible.",
      "L’historique reflète la transition.",
    ],
    tips: ["Préférer une version ou une révision à un écrasement silencieux."],
  },
  {
    id: "daily-path",
    title: "Parcours recommandé quotidien",
    badge: "Best path",
    summary: "L’ordre conseillé pour travailler efficacement sur une vraie candidature.",
    icon: Workflow,
    route: "/tools/cv-creator",
    items: [
      "Scrape l’offre, inspecte les signaux ATS/entreprise, adapte le CV, génère la lettre, puis pousse l’opportunité dans Tracker.",
      "Reviens dans History pour vérifier la lignée ou comparer l’impact d’une révision.",
    ],
    steps: ["Scrape", "Score", "Tailor", "Generate", "Track"],
    checklist: [
      "Le CV final correspond à l’offre.",
      "Le score ATS a été relancé après modification majeure.",
      "La lettre et le tracker pointent vers la même opportunité.",
    ],
    tips: ["Relance ATS après chaque changement majeur du CV pour mesurer l’impact réel."],
  },
];

const EN_GUIDE_CONTENT: Record<
  string,
  Pick<
    GuideSection,
    "title" | "badge" | "summary" | "items" | "steps" | "checklist" | "tips"
  >
> = {
  "product-loop": {
    title: "Mindris in one loop",
    badge: "Product map",
    summary: "The complete product fits into a measurable application workflow.",
    items: [
      "Mindris is a local-first studio for preparing an application: import a resume, analyze a job, tailor content, generate artifacts and track submission.",
      "The frontend remains an operating surface. Durable state, destructive actions, secrets and AI orchestration stay behind backend APIs.",
    ],
    steps: ["Import", "Analyze", "Tailor", "Generate", "Track"],
    checklist: [
      "A source resume is available.",
      "A real job provides context.",
      "Generated artifacts remain linked to the job.",
    ],
    tips: ["Use History when you need to prove which artifact came from which job."],
  },
  "start-from-job": {
    title: "1. Start from a job",
    badge: "Signal",
    summary: "Turn a job URL into structured role, company, keyword and ATS signals.",
    items: [
      "Paste a URL in CV Builder, ATS Score or Workflow to extract usable job signals.",
      "Review missing skills, target title, company context and ATS evidence before changing the resume.",
    ],
    steps: ["Paste URL", "Extract", "Review signals", "Keep the job link"],
    checklist: [
      "The job title and company are correct.",
      "Important hard skills are visible.",
      "The job is linked to generated ATS reports or letters.",
    ],
    tips: ["Do not change the resume blindly: identify the gaps with the job first."],
  },
  "build-resume": {
    title: "2. Build the resume",
    badge: "Resume Studio",
    summary: "Edit content and design without moving business logic into the browser.",
    items: [
      "Simple mode protects non-technical users from advanced settings. Normal exposes everyday controls. Advanced groups diagnostics, AI and sensitive actions.",
      "Style Studio adjusts rendering while defaults, exports and product decisions remain backend-owned.",
    ],
    steps: ["Choose a mode", "Edit structure", "Adjust style", "Export"],
    checklist: [
      "The resume stays readable and focused.",
      "Unnecessary sections are hidden or simplified.",
      "The exported PDF matches the preview.",
    ],
    tips: ["For non-technical users, start with Simple and open Normal only when needed."],
  },
  workflow: {
    title: "3. Drive the Workflow",
    badge: "Beta",
    summary: "Connect job, resume, ATS report, cover letter and tracker in one lineage.",
    items: [
      "Workflow deliberately remains Beta until all history surfaces are fully mature.",
      "Use it to verify artifact links before sending an application to Tracker.",
    ],
    steps: ["Create opportunity", "Link resume", "Link ATS", "Link letter", "Create Tracker"],
    checklist: [
      "The opportunity references the correct job.",
      "The ATS report and letter share the same job_id.",
      "Tracker uses the approved artifacts.",
    ],
    tips: ["If a link is inconsistent, fix the source before adding the Tracker entry."],
  },
  "track-audit": {
    title: "4. Track and audit",
    badge: "History",
    summary: "Find what was generated, by which model, for which job and with which links.",
    items: [
      "History groups scraped jobs, ATS reports, letters, revisions, Workflow transitions, Tracker items and AI runs.",
      "It is the control surface when an application must be explained or reproduced.",
    ],
    steps: ["Filter", "Select", "Inspect", "Compare links"],
    checklist: [
      "Critical artifacts have a job link.",
      "AI runs identify provider and model.",
      "History deletion remains explicit.",
    ],
    tips: ["Keep History as an audit reference, not an editing tool."],
  },
  runtime: {
    title: "5. Configure the runtime",
    badge: "Runtime",
    summary: "Control local services, AI defaults, diagnostics and write-only secrets.",
    items: [
      "Configuration centralizes task defaults, ingestion, runtime diagnostics and secret slots.",
      "RuntimeGate waits for backend and renderer readiness before opening the workspace.",
    ],
    steps: ["Check readiness", "Choose settings", "Test providers", "Run action"],
    checklist: ["API gateway ready.", "Renderer ready.", "Provider keys never appear in clear text."],
    tips: ["Secrets are write-only: the UI can confirm presence, never reveal values."],
  },
  "client-server": {
    title: "Client/server boundary",
    badge: "Architecture",
    summary: "The browser renders the experience; Python and Bun services own product state.",
    items: [
      "Browser code calls APIs, renders state and only keeps short UI preferences such as theme.",
      "Local browser access uses the loopback trust boundary; scripts and external clients keep using X-API-Key.",
      "Secrets, exports, business defaults, destructive cleanup and provider orchestration remain backend-owned.",
    ],
    steps: ["UI calls", "Backend decides", "Renderer exports"],
    checklist: [
      "No raw key in UI responses.",
      "No durable business decision in the frontend.",
      "Exports go through the renderer.",
    ],
    tips: ["If a rule changes the product result, it belongs in the backend."],
  },
  "destructive-actions": {
    title: "Destructive actions",
    badge: "Security",
    summary: "Keep deletion and repair explicit, traceable and server-side.",
    items: [
      "Mindris must never expose raw secrets in the UI, logs or API responses.",
      "Bulk cleanup must be confirmed and executed transactionally by the backend.",
    ],
    steps: ["Confirm", "Execute server-side", "Audit"],
    checklist: [
      "The user sees exactly what will be deleted.",
      "The action is reversible when possible.",
      "History reflects the transition.",
    ],
    tips: ["Prefer a version or revision over a silent overwrite."],
  },
  "daily-path": {
    title: "Recommended daily path",
    badge: "Best path",
    summary: "The recommended order for working efficiently on a real application.",
    items: [
      "Scrape the job, inspect ATS and company signals, tailor the resume, generate the letter, then move the opportunity to Tracker.",
      "Return to History to verify lineage or compare the impact of a revision.",
    ],
    steps: ["Scrape", "Score", "Tailor", "Generate", "Track"],
    checklist: [
      "The final resume matches the job.",
      "ATS was rerun after major changes.",
      "The letter and tracker point to the same opportunity.",
    ],
    tips: ["Rerun ATS after every major resume change to measure the real impact."],
  },
};

export function guideSections(locale: "fr" | "en"): GuideSection[] {
  if (locale === "fr") return GUIDE_SECTIONS;
  return GUIDE_SECTIONS.map((section) => ({
    ...section,
    ...EN_GUIDE_CONTENT[section.id],
  }));
}
