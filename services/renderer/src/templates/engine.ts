import Handlebars from "handlebars";
import { createHash } from "node:crypto";

import { sanitizeAdvancedCss } from "./css/sanitizer";
import { buildTokenOverrides } from "./css/tokens";
import {
    resolveTemplateContract,
    TemplateContractError,
    type TemplateContract,
} from "./contracts";
import { dynamicSectionCss, resolveTemplateAssets } from "./template-registry";

const shellTemplate = Handlebars.compile(`<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mindris AI - Generated CV</title>
    <style>
        @page { size: {{pageWidth}} {{pageHeight}}; margin: 0; }
        body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            display: flex;
            justify-content: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        #cv-container { width: {{pageWidth}}; min-height: {{pageHeight}}; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
        @media print {
            body { background: none; }
            #cv-container { margin: 0; box-shadow: none; width: 100%; }
        }
    </style>
</head>
<body>
    <div id="cv-container">
        <div id="shadow-host">
            <template shadowrootmode="open">
                <style>{{{css}}}</style>
                <div>{{{content}}}</div>
            </template>
        </div>
    </div>
</body>
</html>`);

type SectionConfig = {
    id?: string;
    type: string;
    label: string;
    visible?: boolean;
    placement?: "main" | "sidebar";
    display_mode?: string;
    detail_level?: string;
    show_dates?: boolean;
    show_locations?: boolean;
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
    order?: number;
};

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: "experience", type: "experience", label: "Expériences", placement: "main" },
    { id: "projects", type: "projects", label: "Projets", placement: "main" },
    { id: "skills", type: "skills", label: "Compétences", placement: "sidebar" },
    { id: "education", type: "education", label: "Formation", placement: "sidebar" },
    { id: "languages", type: "languages", label: "Langues", placement: "sidebar" },
    { id: "interests", type: "interests", label: "Intérêts", placement: "sidebar" },
];

function html(value: unknown): string {
    return Handlebars.escapeExpression(String(value ?? ""));
}

function items(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
}

function documentLanguage(cvData: any): "fr" | "en" | "de" | "es" {
    const language = cvData?.global_settings?.locale?.label_language;
    return ["fr", "en", "de", "es"].includes(language) ? language : "fr";
}

const LUCIDE_PATHS: Record<string, string> = {
    email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"/>',
    location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    social: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    experience: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    education: '<path d="m22 10-10-5L2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    projects: '<path d="M3 7V5a2 2 0 0 1 2-2h6l2 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    skills: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"/>',
    default: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
};

function lucideSvg(name: string): string {
    const paths = LUCIDE_PATHS[name] ?? LUCIDE_PATHS.default;
    return `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

const MONTH_NAMES: Record<string, { short: string[]; long: string[] }> = {
    fr: {
        short: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
        long: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    },
    en: {
        short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    },
    de: {
        short: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
        long: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    },
    es: {
        short: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
        long: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    },
};

function formatDateText(value: unknown, locale: any): string {
    const source = String(value ?? "");
    const format = locale?.date_format ?? "MM/YYYY";
    const requestedLanguage = String(locale?.label_language ?? "fr");
    const language = Object.hasOwn(MONTH_NAMES, requestedLanguage)
        ? requestedLanguage
        : "en";
    const names = MONTH_NAMES[language] ?? MONTH_NAMES.en!;
    return source.replace(/\b(\d{4})[-/](0?[1-9]|1[0-2])\b|\b(0?[1-9]|1[0-2])\/(\d{4})\b/g, (match, yearFirst, monthFirst, monthSecond, yearSecond) => {
        const year = yearFirst || yearSecond;
        const month = Number(monthFirst || monthSecond);
        if (!year || !month) return match;
        const padded = String(month).padStart(2, "0");
        if (format === "YYYY-MM") return `${year}-${padded}`;
        if (format === "MMM YYYY") return `${names.short[month - 1]} ${year}`;
        if (format === "MMMM YYYY") return `${names.long[month - 1]} ${year}`;
        return `${padded}/${year}`;
    });
}

function configuredSections(cvData: any): SectionConfig[] {
    const configured = cvData?.global_settings?.sections;
    const sections: SectionConfig[] = Array.isArray(configured) && configured.length > 0
        ? configured
        : DEFAULT_SECTIONS;
    const usedIds = new Set<string>();
    return sections.map((section, order) => {
        const baseId = String(section.id || section.type || `section-${order}`);
        let id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) {
            id = `${baseId}-${suffix}`;
            suffix += 1;
        }
        usedIds.add(id);
        return { ...section, id, order };
    });
}

function renderContact(profile: any, settings: any): string {
    const arrangement = ["inline", "grid", "bullet", "bar", "icons"].includes(
        settings?.header_details_arrangement,
    )
        ? settings.header_details_arrangement
        : "inline";
    const iconStyle = ["none", "outline", "filled"].includes(settings?.header_icon_style)
        ? settings.header_icon_style
        : "outline";
    const contact = (kind: string, content: string) =>
        `<span class="contact-item" data-cv-role="contact-item" data-contact-type="${kind}">${
            iconStyle === "none"
                ? ""
                : `<span class="contact-icon" aria-hidden="true">${lucideSvg(kind)}</span>`
        }${content}</span>`;
    const contacts = [
        profile?.email ? contact("email", html(profile.email)) : "",
        profile?.phone ? contact("phone", html(profile.phone)) : "",
        profile?.location?.city
            ? contact("location", `${html(profile.location.city)}, ${html(profile.location.country)}`)
            : "",
        ...items(profile?.socials).map((social) => {
            const label = social.label || social.type || social.url;
            return contact("social", `<a href="${html(social.url)}" class="contact-link">${html(label)}</a>`);
        }),
    ].filter(Boolean);
    return contacts.length
        ? `<div class="contact-bar contact-layout-${arrangement} contact-icon-${iconStyle}" data-cv-role="contact-list">${contacts.join("")}</div>`
        : "";
}

function renderHeader(cvData: any): string {
    const profile = cvData?.profile ?? {};
    const photoSettings = cvData?.global_settings?.layout?.photo ?? {};
    const photo = renderProfilePhoto(profile, photoSettings);
    const photoPosition = ["left", "top", "right"].includes(photoSettings.position)
        ? photoSettings.position
        : "left";
    const summary = profile.text_markdown
        ? `<p class="summary">${html(profile.text_markdown)}</p>`
        : "";
    return `
  <header class="header${photo ? ` header-with-photo header-photo-${photoPosition}` : ""}" data-cv-role="header">
    <div class="header-accent"></div>
    ${photo}
    <div class="header-body">
      <h1 data-cv-role="profile-name">${html(profile.full_name)}</h1>
      <p class="tagline">${html(profile.title)}</p>
      ${renderContact(profile, cvData?.global_settings?.layout)}
      ${summary}
    </div>
  </header>`;
}

function renderProfilePhoto(profile: any, settings: any): string {
    if (settings?.enabled !== true || typeof profile?.photo_url !== "string") return "";
    const source = profile.photo_url.trim();
    if (!/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(source)) return "";
    const position = ["left", "top", "right"].includes(settings.position)
        ? settings.position
        : "left";
    const size = ["xs", "s", "m", "l", "xl"].includes(settings.size)
        ? settings.size
        : "m";
    const shape = ["round", "square", "rounded", "portrait"].includes(settings.shape)
        ? settings.shape
        : "round";
    const grayscale = settings.grayscale === true ? " profile-photo-grayscale" : "";
    return `<img class="profile-photo profile-photo-${position} profile-photo-${size} profile-photo-${shape}${grayscale}" data-cv-role="profile-photo" src="${html(source)}" alt="" />`;
}

function sectionShell(section: SectionConfig, content: string): string {
    if (!content) return "";
    const placement = section.placement || "main";
    const displayMode = section.display_mode || "list";
    const detailLevel = section.detail_level || "normal";
    const headingStyle = section.heading_style || "line";
    const headingCapitalization = section.heading_capitalization || "uppercase";
    const dateLocationPosition = section.date_location_position || "inline";
    const skillStyle = section.skill_style || "tags";
    const headingLine = section.heading_line === false ? "no-line" : "line";
    const iconStyle = section.icon_style || "none";
    const pageBreakClass = section.page_break_before ? " section-page-break-before" : "";
    const pageBreakAttribute = section.page_break_before
        ? ' data-section-page-break-before="true"'
        : "";
    return `<section class="section section-placement-${placement} section-display-${html(displayMode)} section-detail-${html(detailLevel)} section-heading-${html(headingStyle)} section-heading-${html(headingCapitalization)} section-heading-${headingLine} section-icon-${html(iconStyle)} section-meta-${html(dateLocationPosition)} section-skill-style-${html(skillStyle)}${pageBreakClass}" data-cv-role="section" data-section-id="${html(section.id || section.type)}" data-section-type="${html(section.type)}" data-placement="${html(placement)}" data-section-placement="${html(placement)}" data-order="${html(section.order ?? 0)}" data-page-break="${section.page_break_before === true ? "before" : "none"}" data-display-mode="${html(displayMode)}" data-detail-level="${html(detailLevel)}" data-section-display-mode="${html(displayMode)}" data-section-detail-level="${html(detailLevel)}" data-section-heading-style="${html(headingStyle)}" data-section-heading-capitalization="${html(headingCapitalization)}" data-section-date-location-position="${html(dateLocationPosition)}" data-section-skill-style="${html(skillStyle)}"${pageBreakAttribute}>
      <h2 class="section-title" data-cv-role="section-heading"><span class="section-heading-icon" aria-hidden="true">${iconStyle === "none" ? "" : lucideSvg(section.type)}</span>${html(section.label)}</h2>
      ${content}
    </section>`;
}

function renderTitleSubtitle(
    section: SectionConfig,
    title: unknown,
    subtitle: unknown,
): string {
    const titleMarkup = title ? `<h3 data-cv-role="entry-title">${html(title)}</h3>` : "";
    const subtitleMarkup = subtitle ? `<span class="company" data-cv-role="entry-subtitle">${html(subtitle)}</span>` : "";
    return section.title_subtitle_order === "subtitle_first"
        ? `${subtitleMarkup}${titleMarkup}`
        : `${titleMarkup}${subtitleMarkup}`;
}

function renderExperience(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.experience);
    if (!rows.length) return "";
    const showDates = section.show_dates !== false;
    const showLocations = section.show_locations !== false;
    return sectionShell(
        section,
        rows.map((entry) => {
            const meta = [
                showDates ? formatDateText(entry.period, cvData?.global_settings?.locale) : "",
                showLocations ? entry.location?.city : "",
            ].filter(Boolean).map(html).join(" · ");
            const keywords = items(entry.keywords).length
                ? `<div class="keyword-tags" data-cv-role="tag-list">${items(entry.keywords).map((kw) => `<span class="kw-tag" data-cv-role="tag">${html(kw)}</span>`).join("")}</div>`
                : "";
            return `<div class="item" data-cv-role="entry">
          <div class="item-header">
            ${renderTitleSubtitle(section, entry.role, entry.company)}
            ${meta ? `<span class="meta" data-cv-role="entry-date">${meta}</span>` : ""}
          </div>
          ${entry.description_markdown ? `<p class="description" data-cv-role="entry-description">${html(entry.description_markdown)}</p>` : ""}
          ${keywords}
        </div>`;
        }).join(""),
    );
}

function renderProjects(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.projects);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((project) => {
            const linkLabels = {
                fr: "Lien du projet",
                en: "Project link",
                de: "Projektlink",
                es: "Enlace del proyecto",
            };
            const url = project.url
                ? ` <a href="${html(project.url)}" class="proj-link" data-cv-role="entry-link" aria-label="${linkLabels[documentLanguage(cvData)]}">${html(project.url)}</a>`
                : "";
            const stack = items(project.tech_stack).length
                ? `<div class="keyword-tags" data-cv-role="tag-list">${items(project.tech_stack).map((tech) => `<span class="kw-tag" data-cv-role="tag">${html(tech)}</span>`).join("")}</div>`
                : "";
            return `<div class="item" data-cv-role="entry">
          <div class="item-header"><h3 data-cv-role="entry-title">${html(project.name)}${url}</h3></div>
          ${project.description_markdown ? `<p class="description" data-cv-role="entry-description">${html(project.description_markdown)}</p>` : ""}
          ${stack}
        </div>`;
        }).join(""),
    );
}

function renderCertifications(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.certifications);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((item) => {
            const meta = [
                formatDateText(item.date, cvData?.global_settings?.locale),
                item.url,
            ].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact" data-cv-role="entry">
          <div class="item-header"><h3 data-cv-role="entry-title">${html(item.name)}</h3><span class="company" data-cv-role="entry-subtitle">${html(item.issuer)}</span>${meta ? `<span class="meta" data-cv-role="entry-date">${meta}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(item.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderVolunteering(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.volunteering);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((item) => {
            const meta = [
                formatDateText(item.period, cvData?.global_settings?.locale),
                item.location,
            ].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact" data-cv-role="entry">
          <div class="item-header"><h3 data-cv-role="entry-title">${html(item.role)}</h3><span class="company" data-cv-role="entry-subtitle">${html(item.organization)}</span>${meta ? `<span class="meta" data-cv-role="entry-date">${meta}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(item.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderPublications(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.publications);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((item) => {
            const meta = [
                item.publisher,
                formatDateText(item.date, cvData?.global_settings?.locale),
            ].filter(Boolean).map(html).join(" · ");
            const url = item.url ? `<span class="meta" data-cv-role="entry-link">${html(item.url)}</span>` : "";
            return `<div class="item item--compact" data-cv-role="entry">
          <div class="item-header"><h3 data-cv-role="entry-title">${html(item.title)}</h3>${meta ? `<span class="company" data-cv-role="entry-subtitle">${meta}</span>` : ""}${url}</div>
          ${item.description_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(item.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderReferences(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.references);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((item) => {
            const meta = [item.role, item.company].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact" data-cv-role="entry">
          <div class="item-header"><h3 data-cv-role="entry-title">${html(item.name)}</h3>${meta ? `<span class="company" data-cv-role="entry-subtitle">${meta}</span>` : ""}${item.contact ? `<span class="meta">${html(item.contact)}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(item.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderCustomSections(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.custom_sections);
    if (!rows.length) return "";
    return rows
        .map((item, index) => {
            const bullets = items(item.items).length
                ? `<div class="skill-tags" data-cv-role="tag-list">${items(item.items).map((bullet) => `<span class="tag" data-cv-role="tag">${html(bullet)}</span>`).join("")}</div>`
                : "";
            return sectionShell(
                {
                    ...section,
                    id: String(item.id || `${section.id || "custom"}-${index}`),
                    label: item.title,
                    order: (section.order ?? 0) + index,
                },
                `<div class="item item--compact" data-cv-role="entry">
          ${item.content_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(item.content_markdown)}</p>` : ""}
          ${bullets}
        </div>`,
            );
        })
        .join("");
}

function renderFallbackSections(cvData: any, usedTypes: Set<string>): string {
    const labels: Record<string, Record<string, string>> = {
        certifications: { fr: "Certifications", en: "Certifications", de: "Zertifikate", es: "Certificaciones" },
        volunteering: { fr: "Bénévolat", en: "Volunteering", de: "Ehrenamt", es: "Voluntariado" },
        publications: { fr: "Publications", en: "Publications", de: "Veröffentlichungen", es: "Publicaciones" },
        references: { fr: "Références", en: "References", de: "Referenzen", es: "Referencias" },
        custom: { fr: "Sections personnalisées", en: "Custom sections", de: "Eigene Abschnitte", es: "Secciones personalizadas" },
    };
    const language = documentLanguage(cvData);
    const fallbacks: Array<{ type: string; render: (data: any, section: SectionConfig) => string }> = [
        { type: "certifications", render: renderCertifications },
        { type: "volunteering", render: renderVolunteering },
        { type: "publications", render: renderPublications },
        { type: "references", render: renderReferences },
        { type: "custom", render: renderCustomSections },
    ];
    return fallbacks
        .filter(({ type }) => !usedTypes.has(type))
        .map(({ type, render }, index) =>
            render(cvData, {
                id: type,
                type,
                label: labels[type]?.[language] ?? labels[type]?.en ?? type,
                placement: "main",
                visible: true,
                order: configuredSections(cvData).length + index,
            }),
        )
        .filter(Boolean)
        .join("");
}

function renderSkills(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.skills);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((group) => `<div class="skill-group">
          <h4 class="skill-category">${html(group.category)}</h4>
          <div class="skill-tags" data-cv-role="tag-list">${items(group.skills).map((skill) => `<span class="tag" data-cv-role="tag">${html(skill)}</span>`).join("")}</div>
        </div>`).join(""),
    );
}

function renderEducation(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.education);
    if (!rows.length) return "";
    const showDates = section.show_dates !== false;
    const showLocations = section.show_locations !== false;
    return sectionShell(
        section,
        rows.map((entry) => {
            const meta = [
                showDates ? formatDateText(entry.period, cvData?.global_settings?.locale) : "",
                showLocations ? entry.location : "",
            ].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact" data-cv-role="entry">
          <div class="item-header">
            ${renderTitleSubtitle(section, entry.degree, entry.institution)}
          ${meta ? `<span class="meta" data-cv-role="entry-date">${meta}</span>` : ""}
          </div>
          ${entry.description_markdown ? `<p class="description description--sm" data-cv-role="entry-description">${html(entry.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderLanguages(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.languages);
    if (!rows.length) return "";
    return sectionShell(
        section,
        rows.map((entry) => `<div class="lang-item">
          <span class="lang-name">${html(entry.language)}</span>
          <span class="lang-level">${html(entry.level)}</span>
        </div>`).join(""),
    );
}

function renderInterests(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.hobbies);
    if (!rows.length) return "";
    return sectionShell(
        section,
        `<div class="skill-tags" data-cv-role="tag-list">${rows.map((interest) => `<span class="tag" data-cv-role="tag">${html(interest)}</span>`).join("")}</div>`,
    );
}

function renderSection(cvData: any, section: SectionConfig): string {
    if (section.visible === false) return "";
    switch (section.type) {
        case "experience":
            return renderExperience(cvData, section);
        case "projects":
            return renderProjects(cvData, section);
        case "certifications":
            return renderCertifications(cvData, section);
        case "volunteering":
            return renderVolunteering(cvData, section);
        case "publications":
            return renderPublications(cvData, section);
        case "references":
            return renderReferences(cvData, section);
        case "custom":
            return renderCustomSections(cvData, section);
        case "skills":
            return renderSkills(cvData, section);
        case "education":
            return renderEducation(cvData, section);
        case "languages":
            return renderLanguages(cvData, section);
        case "interests":
            return renderInterests(cvData, section);
        default:
            return "";
    }
}

function usesTwoColumnLayout(cvData: any, templateId: string): boolean {
    const layout = cvData?.global_settings?.layout;
    if (!resolveTemplateContract(templateId).capabilities.columns.includes(2)) {
        return false;
    }
    return layout?.columns !== 1 && layout?.sidebar_position !== "none";
}

function renderCvContent(cvData: any, templateId: string): string {
    const sectionsConfig = configuredSections(cvData);
    const usedTypes = new Set(sectionsConfig.map((section) => section.type));
    const warning = renderOnePageWarning(cvData);
    const cssWarning = renderAdvancedCssWarning(cvData);
    const twoColumns = usesTwoColumnLayout(cvData, templateId);
    const renderedSections = sectionsConfig
        .map((section) => ({
            placement:
                twoColumns && section.placement === "sidebar" ? "sidebar" : "main",
            content: renderSection(
                cvData,
                twoColumns ? section : { ...section, placement: "main" },
            ),
        }))
        .filter((section) => Boolean(section.content));
    const fallbackSections = renderFallbackSections(cvData, usedTypes);
    const sections = twoColumns
        ? `<div class="section-column section-column-main" data-cv-role="column" data-placement="main">${renderedSections
            .filter((section) => section.placement === "main")
            .map((section) => section.content)
            .join("")}${fallbackSections}</div><div class="section-column section-column-sidebar" data-cv-role="column" data-placement="sidebar">${renderedSections
            .filter((section) => section.placement === "sidebar")
            .map((section) => section.content)
            .join("")}</div>`
        : renderedSections.map((section) => section.content).join("") + fallbackSections;
    const headerPosition = ["top", "left", "right"].includes(
        cvData?.global_settings?.layout?.header_position,
    )
        ? cvData.global_settings.layout.header_position
        : "top";
    return `<article class="cv-wrapper header-position-${headerPosition}" data-cv-role="document" data-template-id="${html(templateId)}">
      ${renderHeader(cvData)}
      <div class="cv-content" data-cv-role="content">
      ${warning}
      ${cssWarning}
      <div class="main-grid">${sections}</div>
      </div>
    </article>`;
}

function renderOnePageWarning(cvData: any): string {
    if (cvData?.global_settings?.page?.one_page_challenge !== true) return "";
    const risk = onePageOverflowRisk(cvData);
    if (risk === "fit") return "";
    const language = String(
        cvData?.global_settings?.locale?.label_language ?? "fr",
    );
    const messages: Record<string, Record<"high" | "medium", string>> = {
        fr: {
            high: "Le défi une page est actif, mais ce CV risque de déborder. Réduisez le contenu ou choisissez un modèle plus dense.",
            medium: "Le défi une page est actif. Ce CV approche de la limite.",
        },
        en: {
            high: "One-page challenge is active, but this resume is likely to overflow. Reduce content or choose a denser template.",
            medium: "One-page challenge is active. This resume is close to the limit.",
        },
        de: {
            high: "Die Ein-Seiten-Option ist aktiv, aber dieser Lebenslauf könnte überlaufen. Kürzen Sie den Inhalt oder wählen Sie eine kompaktere Vorlage.",
            medium: "Die Ein-Seiten-Option ist aktiv. Dieser Lebenslauf nähert sich dem Limit.",
        },
        es: {
            high: "El reto de una página está activo, pero este currículum podría desbordarse. Reduzca el contenido o elija una plantilla más compacta.",
            medium: "El reto de una página está activo. Este currículum se acerca al límite.",
        },
    };
    const level = risk === "high" ? "high" : "medium";
    const messageId = `renderer.one_page_overflow_${level}`;
    const message = (messages[language] ?? messages.en!)[level];
    return `<aside class="one-page-warning" data-message-id="${messageId}" data-overflow-risk="${risk}">${html(message)}</aside>`;
}

function renderAdvancedCssWarning(cvData: any): string {
    const warnings = items(cvData?.global_settings?.advanced_css?.warnings);
    if (!warnings.length) return "";
    const language = String(
        cvData?.global_settings?.locale?.label_language ?? "fr",
    );
    const labels: Record<string, string> = {
        fr: "Le CSS avancé contenait des règles non prises en charge.",
        en: "Advanced CSS contained unsupported rules.",
        de: "Das erweiterte CSS enthielt nicht unterstützte Regeln.",
        es: "El CSS avanzado contenía reglas no compatibles.",
    };
    return `<aside class="advanced-css-warning" data-message-id="renderer.advanced_css_rules_dropped">${html(
        labels[language] ?? labels.en,
    )}</aside>`;
}

function onePageOverflowRisk(cvData: any): "fit" | "medium" | "high" {
    const score =
        items(cvData?.experience).length * 20 +
        items(cvData?.projects).length * 14 +
        items(cvData?.education).length * 10 +
        items(cvData?.skills).length * 6 +
        items(cvData?.languages).length * 4 +
        items(cvData?.certifications).length * 8 +
        items(cvData?.volunteering).length * 8 +
        items(cvData?.publications).length * 8 +
        items(cvData?.references).length * 6 +
        items(cvData?.custom_sections).length * 8 +
        markdownWeight(cvData?.profile?.text_markdown) +
        markdownWeight(items(cvData?.experience).map((item) => item?.description_markdown).join(" ")) +
        markdownWeight(items(cvData?.projects).map((item) => item?.description_markdown).join(" "));

    if (score >= 180) return "high";
    if (score >= 130) return "medium";
    return "fit";
}

function markdownWeight(value: unknown): number {
    if (typeof value !== "string" || !value.trim()) return 0;
    return Math.ceil(value.length / 120);
}

function pageSize(settings?: any): { pageWidth: string; pageHeight: string } {
    if (settings?.page?.format === "Letter") {
        return { pageWidth: "216mm", pageHeight: "279mm" };
    }
    return { pageWidth: "210mm", pageHeight: "297mm" };
}



// ── Engine Entry Point ────────────────────────────────────────────────────────

export type RenderedDocument = {
    html: string;
    contentHash: string;
    template: TemplateContract;
    format: "A4" | "Letter";
};

function stableJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableJson).join(",")}]`;
    }
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

export function renderDocument(cvData: any, templateId?: string): RenderedDocument {
    // An operation-level selection must win over the CV's persisted default.
    const resolvedTemplate =
        templateId ??
        (cvData?.global_settings?.template_id as string | undefined) ??
        "modern";

    const contract = resolveTemplateContract(resolvedTemplate);
    const { activeTemplate, css: templateCss } =
        resolveTemplateAssets(resolvedTemplate);
    let css = templateCss;

    const normalizedCvData = structuredClone(cvData ?? {});
    const cssSelectorVersion =
        normalizedCvData?.global_settings?.advanced_css
            ?.selector_contract_version;
    if (
        cssSelectorVersion !== undefined &&
        cssSelectorVersion !== contract.selectorContractVersion
    ) {
        throw new TemplateContractError(
            `Advanced CSS selector contract "${cssSelectorVersion}" is incompatible with renderer contract "${contract.selectorContractVersion}".`,
        );
    }
    const contentHash = createHash("sha256")
        .update(
            stableJson({
                cv_data: normalizedCvData,
                template_id: activeTemplate,
            }),
        )
        .digest("hex");
    const advancedCss = sanitizeAdvancedCss(normalizedCvData?.global_settings);
    normalizedCvData.global_settings = normalizedCvData.global_settings ?? {};
    normalizedCvData.global_settings.advanced_css = {
        ...(normalizedCvData.global_settings.advanced_css ?? {}),
        warnings: advancedCss.warnings,
    };

    const content = renderCvContent(normalizedCvData, activeTemplate);

    // Append user token overrides — these win the cascade inside Shadow DOM
    const tokenOverrides = buildTokenOverrides(normalizedCvData?.global_settings);
    css += `\n\n/* ── Dynamic Section Layout Contract ── */\n${dynamicSectionCss}`;
    if (tokenOverrides) css += `\n\n/* ── User Design Tokens ── */\n${tokenOverrides}`;
    if (advancedCss.css) {
        css += `\n\n/* ── Advanced CSS Patch ── */\n${advancedCss.css}`;
    }

    const format: "A4" | "Letter" =
        normalizedCvData?.global_settings?.page?.format === "Letter"
            ? "Letter"
            : "A4";
    return {
        html: shellTemplate({
            css,
            content,
            language: documentLanguage(normalizedCvData),
            ...pageSize(normalizedCvData?.global_settings),
        }),
        contentHash,
        template: contract,
        format,
    };
}

export function generateHtml(cvData: any, templateId?: string): string {
    return renderDocument(cvData, templateId).html;
}
