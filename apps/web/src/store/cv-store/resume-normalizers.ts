import type {
  CVData,
  GlobalSettings,
  ResumeDocument,
  ResumeLocale,
} from "./types";

const defaultId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  font_family: "Inter",
  font_size: "13px",
  primary_color: "#2563eb",
  line_height: "1.5",
  margin_page: "48px",
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
};

export function createBlankCVData(templateId = "modern"): CVData {
  return {
    global_settings: {
      ...DEFAULT_GLOBAL_SETTINGS,
      template_id: templateId,
    },
    profile: {
      full_name: "",
      title: "",
      phone: "",
      email: "",
      location: { city: "", country: "" },
      socials: [],
      text_markdown: "",
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    volunteering: [],
    publications: [],
    references: [],
    custom_sections: [],
    languages: [],
    hobbies: [],
  };
}

export function normalizeCVData(
  data: Partial<CVData> | undefined,
  templateId = "modern",
): CVData {
  const blank = createBlankCVData(templateId);
  const source = data ?? {};
  const settings = (source.global_settings ?? {}) as Partial<GlobalSettings>;
  return {
    global_settings: {
      ...blank.global_settings,
      ...settings,
      template_id: settings.template_id ?? blank.global_settings.template_id,
      advanced_css: {
        ...blank.global_settings.advanced_css,
        ...(settings.advanced_css ?? {}),
        warnings: Array.isArray(settings.advanced_css?.warnings)
          ? settings.advanced_css?.warnings
          : [],
      },
    },
    profile: {
      ...blank.profile,
      ...(source.profile ?? {}),
    },
    experience: Array.isArray(source.experience) ? source.experience : [],
    education: Array.isArray(source.education) ? source.education : [],
    skills: Array.isArray(source.skills) ? source.skills : [],
    projects: Array.isArray(source.projects) ? source.projects : [],
    certifications: Array.isArray(source.certifications)
      ? source.certifications
      : [],
    volunteering: Array.isArray(source.volunteering) ? source.volunteering : [],
    publications: Array.isArray(source.publications) ? source.publications : [],
    references: Array.isArray(source.references) ? source.references : [],
    custom_sections: Array.isArray(source.custom_sections)
      ? source.custom_sections
      : [],
    languages: Array.isArray(source.languages) ? source.languages : [],
    hobbies: Array.isArray(source.hobbies) ? source.hobbies : [],
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeResumeLocale(
  value: unknown,
  fallback: ResumeLocale = "fr",
): ResumeLocale {
  return value === "fr" || value === "en" || value === "de" || value === "es"
    ? value
    : fallback;
}

export function resumeLocaleFromCVData(cvData: CVData): ResumeLocale {
  return normalizeResumeLocale(
    cvData.global_settings?.locale?.label_language,
    "fr",
  );
}

export function createResumeDocument(
  name: string,
  cvData: CVData,
  createId: () => string = defaultId,
): ResumeDocument {
  const timestamp = nowIso();
  const normalized = normalizeCVData(cvData);
  const locale = resumeLocaleFromCVData(normalized);
  return {
    id: createId(),
    name,
    cvData: normalized,
    templateId: normalized.global_settings.template_id || "modern",
    locale,
    multilingual: {
      defaultLocale: locale,
      activeLocale: locale,
      availableLocales: [locale],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeResumeDocument(
  data: Partial<ResumeDocument>,
  createId: () => string = defaultId,
): ResumeDocument {
  const locale = normalizeResumeLocale(
    data.locale ?? data.cvData?.global_settings?.locale?.label_language,
    "fr",
  );
  const templateId =
    data.templateId || data.cvData?.global_settings?.template_id || "modern";
  const multilingual = data.multilingual;
  const activeLocale = normalizeResumeLocale(
    multilingual?.activeLocale,
    locale,
  );
  const defaultLocale = normalizeResumeLocale(
    multilingual?.defaultLocale,
    locale,
  );
  const availableLocales = Array.isArray(multilingual?.availableLocales)
    ? multilingual.availableLocales.map((item) =>
        normalizeResumeLocale(item, locale),
      )
    : [defaultLocale];
  const uniqueLocales = Array.from(
    new Set([defaultLocale, activeLocale, ...availableLocales]),
  );
  const cvData = normalizeCVData(data.cvData, templateId);
  return {
    id: data.id ?? createId(),
    name: data.name?.trim() || "Untitled CV",
    cvData,
    templateId,
    locale,
    multilingual: {
      defaultLocale,
      activeLocale,
      availableLocales: uniqueLocales,
    },
    revision: data.revision,
    createdAt: data.createdAt ?? nowIso(),
    updatedAt: data.updatedAt ?? nowIso(),
  };
}
