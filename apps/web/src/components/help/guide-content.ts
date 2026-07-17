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
    title: "5. Configurer le runtime",
    badge: "Runtime",
    summary: "Contrôler les services locaux, defaults IA, diagnostics et secrets write-only.",
    icon: Settings2,
    route: "/dashboard",
    items: [
      "Configuration centralise les defaults par tâche, l’ingestion, les diagnostics runtime et les slots de secrets.",
      "Le RuntimeGate attend les endpoints backend/renderer avant d’ouvrir le workspace pour éviter une UI active sur un système non prêt.",
    ],
    steps: ["Vérifier Ready", "Choisir les defaults", "Tester les providers", "Lancer l’action"],
    checklist: [
      "API gateway prêt.",
      "Renderer prêt.",
      "Les clés provider ne sont jamais affichées en clair.",
    ],
    tips: ["Les secrets sont write-only : l’UI peut confirmer leur présence, pas les révéler."],
  },
  {
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
