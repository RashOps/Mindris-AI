export interface GlobalSettings {
  schema_version?: string;
  page?: {
    format?: "A4" | "Letter";
    margins?: { horizontal?: string; vertical?: string };
    page_break_mode?: "auto" | "manual";
    one_page_challenge?: boolean;
  };
  layout?: {
    columns?: 1 | 2;
    sidebar_position?: "none" | "left" | "right";
    sidebar_width?: string;
    density?: "student" | "compact" | "normal" | "senior";
    header_alignment?: "left" | "center" | "right";
    header_position?: "top" | "left" | "right";
    header_details_arrangement?: "inline" | "grid" | "bullet" | "bar" | "icons";
    header_icon_style?: "none" | "outline" | "filled";
    photo?: {
      enabled?: boolean;
      grayscale?: boolean;
      position?: "left" | "top" | "right";
      size?: "xs" | "s" | "m" | "l" | "xl";
      shape?: "round" | "square" | "rounded" | "portrait";
    };
    section_placement?: Record<string, "main" | "sidebar">;
  };
  typography?: {
    body_font?: string;
    heading_font?: string;
    base_size?: string;
    body_size?: string;
    name_size?: string;
    title_size?: string;
    section_heading_size?: string;
    entry_heading_size?: string;
    heading_scale?: string;
    weight?: "regular" | "medium" | "bold";
    titles_uppercase?: boolean;
    line_height?: string;
    date_style?: "normal" | "italic" | "small" | "right";
    bullet_style?: "bullets" | "dash" | "dots" | "icons";
  };
  colors?: {
    primary?: string;
    secondary?: string;
    text?: string;
    heading?: string;
    sidebar_background?: string;
    separators?: string;
    palette_preset?: "corporate" | "tech" | "minimal" | "creative" | "custom";
    monochrome?: boolean;
    accent_targets?: Array<
      | "name"
      | "title"
      | "headings"
      | "heading_lines"
      | "dates"
      | "links"
      | "icons"
      | "skills"
    >;
  };
  links?: {
    underline?: boolean;
    color?: "accent" | "blue" | "inherit";
    show_icon?: boolean;
  };
  sections?: Array<{
    id: string;
    type: string;
    label: string;
    visible?: boolean;
    placement?: "main" | "sidebar";
    display_mode?: "list" | "timeline" | "cards" | "compact";
    show_dates?: boolean;
    show_locations?: boolean;
    detail_level?: "short" | "normal" | "detailed";
    page_break_before?: boolean;
    heading_style?: "line" | "plain" | "box" | "accent";
    heading_capitalization?: "normal" | "uppercase";
    title_subtitle_order?: "title_first" | "subtitle_first";
    date_location_position?: "inline" | "right" | "below";
    skill_style?:
      | "tags"
      | "plain"
      | "bars"
      | "grid"
      | "rows"
      | "compact"
      | "bubble"
      | "level"
      | "dots";
    heading_line?: boolean;
    icon_style?: "none" | "outline" | "filled";
    icon?: string | null;
  }>;
  locale?: {
    label_language?: "fr" | "en" | "de" | "es";
    text_direction?: "ltr" | "rtl";
    date_format?: "MM/YYYY" | "YYYY-MM" | "MMM YYYY" | "MMMM YYYY";
  };
  advanced_css?: {
    enabled?: boolean;
    mode?: "off" | "tokens" | "css_patch";
    css_text?: string;
    preset_id?: string | null;
    selector_contract_version?: "1";
    warnings?: string[];
  };
  font_family: string;
  font_size: string;
  primary_color: string;
  line_height: string;
  margin_page: string;
  margin_h: string;
  margin_v: string;
  entry_spacing: string;
  col_left_width: string;
  col_swap: string;
  template_id: string;
}

export interface Social {
  type: "linkedin" | "github" | "website" | "other";
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
  text_markdown: string;
  photo_url?: string | null;
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

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
  description_markdown: string;
}

export interface VolunteeringItem {
  id: string;
  organization: string;
  role: string;
  period: string;
  location: string;
  description_markdown: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  publisher: string;
  date: string;
  url: string;
  description_markdown: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  role: string;
  company: string;
  contact: string;
  description_markdown: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  content_markdown: string;
  items: string[];
}

export interface KeywordStatus {
  keyword: string;
  found: boolean;
  density: string;
  severity: "high" | "medium" | "low";
}

export interface ScoringCriteria {
  criterion: string;
  weight: number;
  score: number;
  max_score: number;
  explanation: string;
}

export interface AtsRubricDimension {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export interface AtsRubric {
  version: string;
  mode: "standard" | "strict";
  dimensions: AtsRubricDimension[];
}

export interface AtsDeduction {
  code: string;
  title: string;
  severity: "high" | "medium" | "low";
  points_lost: number;
  evidence: string;
  recommendation: string;
}

export interface AtsReportContext {
  job_title: string;
  job_company: string;
  job_id?: number | null;
  resume_id?: number | null;
  resume_locale?: string | null;
  provider: string;
  model_name: string;
}

export interface AtsReport {
  id?: number | null;
  job_id?: number | null;
  score: number;
  mode: "standard" | "strict";
  summary: string;
  rubric: AtsRubric;
  scoring_breakdown: ScoringCriteria[];
  deductions: AtsDeduction[];
  keyword_analysis: KeywordStatus[];
  recommendations: string[];
  context: AtsReportContext;
}

export interface HistoryLedgerLink {
  subject_type: string;
  subject_id: string;
  relation: string;
}

export interface HistoryLedgerItem {
  id: string;
  subject_type:
    | "job_scrape"
    | "resume_revision"
    | "cover_letter"
    | "ats_report"
    | "opportunity"
    | "tracker_event"
    | "llm_run";
  subject_id: string;
  title: string;
  summary: string;
  timestamp: string;
  provider?: string | null;
  model_name?: string | null;
  status?: string | null;
  group_id: string;
  group_label: string;
  links: HistoryLedgerLink[];
  metadata: Record<string, unknown>;
}

export interface CompanyInsight {
  name: string;
  canonical_domain?: string | null;
  homepage_url?: string | null;
  careers_url?: string | null;
  industry: string;
  size: string;
  work_mode?: string;
  locations?: string[];
  culture_values: string[];
  recent_news: string[];
  glassdoor_summary?: string | null;
  tech_stack_known: string[];
  role_fit?: {
    skills_to_foreground?: string[];
    wording_to_mirror?: string[];
    priority_experiences?: string[];
    cv_emphasis?: string[];
    cover_letter_emphasis?: string[];
  };
  risk_flags?: Array<{
    code: string;
    severity: string;
    title: string;
    detail: string;
    provenance: string;
  }>;
  evidence?: Record<string, string[]>;
  provenance?: Record<string, string>;
  cache?: Record<string, string>;
  unavailable_reason?: string | null;
}

export interface JobInsights {
  job_id?: number | null;
  job_record_id?: number | null;
  source_url?: string | null;
  job_title: string;
  company: string;
  hard_skills: string[];
  soft_skills: string[];
  drafted_bullets: string[];
  raw_markdown: string;
  score: number | null;
  evidence_ledger: Array<{
    id: string;
    section_type: string;
    source_id?: string | null;
    text: string;
    relevance?: number | null;
  }>;
  evidence_matrix: Array<{
    requirement_id: string;
    requirement: string;
    requirement_type:
      | "hard_skill"
      | "soft_skill"
      | "responsibility"
      | "must_have";
    matched_fact_ids: string[];
    status: "matched" | "partial" | "missing";
    rationale: string;
  }>;
  proposed_changes: Array<{
    section_id: string;
    entry_id?: string | null;
    before: string;
    after: string;
    reason: string;
    source_fact_ids: string[];
    confidence: number;
  }>;
  evaluation?: {
    score: number;
    keyword_match: number;
    evidence_quality: number;
    clarity: number;
    missing_skills: string[];
    revision_instructions: string[];
    warnings: string[];
  } | null;
  warnings: string[];
  requires_user_review: boolean;
  ats_report?: AtsReport;
  company_insight?: CompanyInsight;
}

export type LLMProvider = "groq" | "gemini" | "openai" | "mistral" | "ollama";

export interface LLMConfig {
  provider: LLMProvider;
  model_name: string;
}

export type PdfIngestionMode = "auto" | "llama_parse" | "local_text";

export interface AppSettings {
  optimize_llm: LLMConfig;
  cover_letter_llm: LLMConfig;
  ats_llm: LLMConfig;
  patch_llm: LLMConfig;
  pdf_ingestion_mode: PdfIngestionMode;
  ui_locale: "fr" | "en";
}

export interface CVData {
  global_settings: GlobalSettings;
  profile: Profile;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  volunteering: VolunteeringItem[];
  publications: PublicationItem[];
  references: ReferenceItem[];
  custom_sections: CustomSectionItem[];
  languages: LanguageItem[];
  hobbies: string[];
}

export type ResumeLocale = "fr" | "en" | "de" | "es";

export interface ResumeDocument {
  id: string;
  name: string;
  cvData: CVData;
  templateId: string;
  locale: ResumeLocale;
  multilingual: {
    defaultLocale: ResumeLocale;
    activeLocale: ResumeLocale;
    availableLocales: ResumeLocale[];
  };
  revision?: number;
  createdAt: string;
  updatedAt: string;
}

export type ResumeSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
