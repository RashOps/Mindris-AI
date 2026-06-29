import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// ── CSS Token Injection ───────────────────────────────────────────────────────

/**
 * Build a :host { } override block from cv_data.global_settings.
 * Only properties explicitly set by the user are overridden.
 */
function cssFontFamily(value: string): string {
    const family = value.includes(" ") ? `'${value}'` : value;
    return `${family}, sans-serif`;
}

function buildTokenOverrides(settings?: any): string {
    if (!settings || typeof settings !== "object") return "";

    const props: string[] = [];
    const typography = settings.typography ?? {};
    const colors = settings.colors ?? {};
    const page = settings.page ?? {};
    const layout = settings.layout ?? {};
    const onePageChallenge = page.one_page_challenge === true;

    const primaryColor = colors.primary ?? settings.primary_color;
    if (primaryColor)
        props.push(`  --primary-color: ${primaryColor};`);
    if (colors.secondary)
        props.push(`  --secondary-color: ${colors.secondary};`);
    if (colors.text)
        props.push(`  --text-color: ${colors.text};`);
    if (colors.heading)
        props.push(`  --heading-color: ${colors.heading};`);
    if (colors.sidebar_background)
        props.push(`  --sidebar-background: ${colors.sidebar_background};`);
    if (colors.separators)
        props.push(`  --separator-color: ${colors.separators};`);
    if (colors.monochrome) {
        props.push(`  --primary-color: ${colors.heading ?? "#111827"};`);
        props.push(`  --secondary-color: ${colors.text ?? "#475569"};`);
        props.push(`  --sidebar-background: #ffffff;`);
    }

    const bodyFont = typography.body_font ?? settings.font_family;
    if (bodyFont) {
        props.push(`  --font-family: ${cssFontFamily(bodyFont)};`);
    }
    if (typography.heading_font)
        props.push(`  --heading-font-family: ${cssFontFamily(typography.heading_font)};`);
    if (typography.base_size ?? settings.font_size)
        props.push(`  --font-size-base: ${typography.base_size ?? settings.font_size};`);
    if (typography.heading_scale)
        props.push(`  --heading-scale: ${typography.heading_scale};`);
    if (typography.weight)
        props.push(`  --body-font-weight: ${typography.weight};`);
    if (typeof typography.titles_uppercase === "boolean") {
        props.push(
            `  --section-title-transform: ${typography.titles_uppercase ? "uppercase" : "none"};`,
        );
    }

    if (typography.line_height ?? settings.line_height)
        props.push(`  --line-height: ${typography.line_height ?? settings.line_height};`);
    if (typography.date_style === "italic")
        props.push(`  --date-font-style: italic;`);
    if (typography.date_style === "small")
        props.push(`  --date-font-size: calc(var(--font-size-base) * 0.78);`);
    if (typography.date_style === "right") {
        props.push(`  --date-text-align: right;`);
        props.push(`  --date-display: block;`);
    }
    if (typography.bullet_style === "dash")
        props.push(`  --description-bullet-indent: 0.8em;`);
    if (typography.bullet_style === "dots")
        props.push(`  --description-bullet-indent: 1em;`);
    if (typography.bullet_style === "icons")
        props.push(`  --description-bullet-indent: 1.2em;`);

    // Spacing — prefer granular tokens, fall back to margin_page
    if (page.margins?.horizontal)
        props.push(`  --margin-page-h: ${page.margins.horizontal};`);
    else if (settings.margin_h)
        props.push(`  --margin-page-h: ${settings.margin_h};`);
    else if (settings.margin_page)
        props.push(`  --margin-page-h: ${settings.margin_page};`);

    if (page.margins?.vertical)
        props.push(`  --margin-page-v: ${page.margins.vertical};`);
    else if (settings.margin_v)
        props.push(`  --margin-page-v: ${settings.margin_v};`);
    else if (settings.margin_page)
        props.push(`  --margin-page-v: ${settings.margin_page};`);

    if (settings.entry_spacing)
        props.push(`  --entry-spacing: ${settings.entry_spacing};`);

    // Layout — column width & placement
    const sidebarWidth =
        layout.sidebar_width ??
        (settings.col_left_width ? `${settings.col_left_width}%` : "35%");
    if (layout.columns === 1 || layout.sidebar_position === "none") {
        props.push(`  --col-left-width: 100%;`);
        props.push(`  --grid-template-columns: 1fr;`);
        props.push(`  --main-column: 1;`);
        props.push(`  --sidebar-column: 1;`);
    } else if (layout.sidebar_position === "left" || settings.col_swap === "true") {
        props.push(`  --col-left-width: ${sidebarWidth};`);
        props.push(`  --grid-template-columns: ${sidebarWidth} 1fr;`);
        props.push(`  --main-column: 2;`);
        props.push(`  --sidebar-column: 1;`);
    } else {
        props.push(`  --col-left-width: ${sidebarWidth};`);
        props.push(`  --grid-template-columns: 1fr ${sidebarWidth};`);
        props.push(`  --main-column: 1;`);
        props.push(`  --sidebar-column: 2;`);
    }

    if (layout.header_alignment)
        props.push(`  --header-text-align: ${layout.header_alignment};`);
    if (layout.density)
        props.push(`  --resume-density: ${layout.density};`);
    if (!settings.entry_spacing) {
        const densitySpacing =
            layout.density === "compact"
                ? "16px"
                : layout.density === "student"
                  ? "18px"
                  : layout.density === "senior"
                    ? "24px"
                    : "20px";
        props.push(`  --entry-spacing: ${densitySpacing};`);
    }

    if (onePageChallenge) {
        props.push(`  --font-size-base: ${smallerCssSize(typography.base_size ?? settings.font_size, "11.5px")};`);
        props.push(`  --line-height: ${smallerLineHeight(typography.line_height ?? settings.line_height, "1.35")};`);
        props.push(`  --margin-page-h: ${smallerCssSize(page.margins?.horizontal ?? settings.margin_h ?? "64px", "36px")};`);
        props.push(`  --margin-page-v: ${smallerCssSize(page.margins?.vertical ?? settings.margin_v ?? "48px", "28px")};`);
        props.push(`  --entry-spacing: ${smallerCssSize(settings.entry_spacing ?? "20px", "10px")};`);
        props.push(`  --resume-density: compact;`);
        props.push(`  --section-title-spacing: 5px;`);
    }

    const blocks: string[] = [];
    if (props.length) {
        blocks.push(`:host {\n${props.join("\n")}\n}`);
    }
    if (onePageChallenge) {
        blocks.push(`
.one-page-warning {
  display: block;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid #f59e0b;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 11px;
  line-height: 1.4;
}
@media print {
  .one-page-warning {
    display: none;
  }
}
`);
    }
    return blocks.join("\n\n");
}

function smallerCssSize(current: string, fallback: string): string {
    const currentValue = numericPrefix(current);
    const fallbackValue = numericPrefix(fallback);
    if (currentValue === null || fallbackValue === null) return fallback;
    return currentValue <= fallbackValue ? current : fallback;
}

function smallerLineHeight(current: string, fallback: string): string {
    const currentValue = Number.parseFloat(current);
    const fallbackValue = Number.parseFloat(fallback);
    if (Number.isNaN(currentValue) || Number.isNaN(fallbackValue)) return fallback;
    return currentValue <= fallbackValue ? current : fallback;
}

function numericPrefix(value: string): number | null {
    const candidate = String(value).trim().replace(/(px|%)$/, "");
    const parsed = Number.parseFloat(candidate);
    return Number.isNaN(parsed) ? null : parsed;
}

const shellTemplate = Handlebars.compile(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mindris AI - Generated CV</title>
    <style>
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
        <div id="shadow-host"></div>
    </div>
    <script>
        const host = document.getElementById('shadow-host');
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = \`{{{css}}}\`;
        shadow.appendChild(style);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = \`{{{content}}}\`;
        shadow.appendChild(wrapper);
    </script>
</body>
</html>`);

// ── Handlebars Helpers ────────────────────────────────────────────────────────

Handlebars.registerHelper("hasItems", (arr: any[]) => Array.isArray(arr) && arr.length > 0);
Handlebars.registerHelper("join", (arr: any[], sep: string) =>
    Array.isArray(arr) ? arr.join(typeof sep === "string" ? sep : ", ") : ""
);
Handlebars.registerHelper("socialIcon", (type: string) => {
    const icons: Record<string, string> = {
        linkedin: "in",
        github: "gh",
        website: "www",
        other: "↗",
    };
    return icons[type] || "↗";
});

type SectionConfig = {
    id?: string;
    type: string;
    label: string;
    visible?: boolean;
    placement?: "main" | "sidebar";
    display_mode?: string;
    show_dates?: boolean;
    show_locations?: boolean;
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

function configuredSections(cvData: any): SectionConfig[] {
    const configured = cvData?.global_settings?.sections;
    return Array.isArray(configured) && configured.length > 0
        ? configured
        : DEFAULT_SECTIONS;
}

function renderContact(profile: any): string {
    const contacts = [
        profile?.email ? `<span class="contact-item">✉ ${html(profile.email)}</span>` : "",
        profile?.phone ? `<span class="contact-item">☎ ${html(profile.phone)}</span>` : "",
        profile?.location?.city
            ? `<span class="contact-item">📍 ${html(profile.location.city)}, ${html(profile.location.country)}</span>`
            : "",
        ...items(profile?.socials).map((social) => {
            const label = social.label || social.type || social.url;
            return `<span class="contact-item"><a href="${html(social.url)}" class="contact-link">${html(label)}</a></span>`;
        }),
    ].filter(Boolean);
    return contacts.length ? `<div class="contact-bar">${contacts.join("")}</div>` : "";
}

function renderHeader(cvData: any): string {
    const profile = cvData?.profile ?? {};
    const summary = profile.text_markdown
        ? `<p class="summary">${html(profile.text_markdown)}</p>`
        : "";
    return `
  <header class="header">
    <div class="header-accent"></div>
    <div class="header-body">
      <h1>${html(profile.full_name)}</h1>
      <p class="tagline">${html(profile.title)}</p>
      ${renderContact(profile)}
      ${summary}
    </div>
  </header>`;
}

function sectionShell(section: SectionConfig, content: string): string {
    if (!content) return "";
    const placement = section.placement || "main";
    return `<section class="section section-placement-${placement}" data-section-type="${html(section.type)}" data-section-placement="${html(placement)}">
      <h2 class="section-title">${html(section.label)}</h2>
      ${content}
    </section>`;
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
                showDates ? entry.period : "",
                showLocations ? entry.location?.city : "",
            ].filter(Boolean).map(html).join(" · ");
            const keywords = items(entry.keywords).length
                ? `<div class="keyword-tags">${items(entry.keywords).map((kw) => `<span class="kw-tag">${html(kw)}</span>`).join("")}</div>`
                : "";
            return `<div class="item">
          <div class="item-header">
            <h3>${html(entry.role)}</h3>
            <span class="company">${html(entry.company)}</span>
            ${meta ? `<span class="meta">${meta}</span>` : ""}
          </div>
          ${entry.description_markdown ? `<p class="description">${html(entry.description_markdown)}</p>` : ""}
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
            const url = project.url
                ? ` <a href="${html(project.url)}" class="proj-link">↗</a>`
                : "";
            const stack = items(project.tech_stack).length
                ? `<div class="keyword-tags">${items(project.tech_stack).map((tech) => `<span class="kw-tag">${html(tech)}</span>`).join("")}</div>`
                : "";
            return `<div class="item">
          <div class="item-header"><h3>${html(project.name)}${url}</h3></div>
          ${project.description_markdown ? `<p class="description">${html(project.description_markdown)}</p>` : ""}
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
            const meta = [item.date, item.url].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact">
          <div class="item-header"><h3>${html(item.name)}</h3><span class="company">${html(item.issuer)}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm">${html(item.description_markdown)}</p>` : ""}
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
            const meta = [item.period, item.location].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact">
          <div class="item-header"><h3>${html(item.role)}</h3><span class="company">${html(item.organization)}</span>${meta ? `<span class="meta">${meta}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm">${html(item.description_markdown)}</p>` : ""}
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
            const meta = [item.publisher, item.date].filter(Boolean).map(html).join(" · ");
            const url = item.url ? `<span class="meta">${html(item.url)}</span>` : "";
            return `<div class="item item--compact">
          <div class="item-header"><h3>${html(item.title)}</h3>${meta ? `<span class="company">${meta}</span>` : ""}${url}</div>
          ${item.description_markdown ? `<p class="description description--sm">${html(item.description_markdown)}</p>` : ""}
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
            return `<div class="item item--compact">
          <div class="item-header"><h3>${html(item.name)}</h3>${meta ? `<span class="company">${meta}</span>` : ""}${item.contact ? `<span class="meta">${html(item.contact)}</span>` : ""}</div>
          ${item.description_markdown ? `<p class="description description--sm">${html(item.description_markdown)}</p>` : ""}
        </div>`;
        }).join(""),
    );
}

function renderCustomSections(cvData: any, section: SectionConfig): string {
    const rows = items(cvData?.custom_sections);
    if (!rows.length) return "";
    return rows
        .map((item) => {
            const bullets = items(item.items).length
                ? `<div class="skill-tags">${items(item.items).map((bullet) => `<span class="tag">${html(bullet)}</span>`).join("")}</div>`
                : "";
            return sectionShell(
                { ...section, label: item.title },
                `<div class="item item--compact">
          ${item.content_markdown ? `<p class="description description--sm">${html(item.content_markdown)}</p>` : ""}
          ${bullets}
        </div>`,
            );
        })
        .join("");
}

function renderFallbackSections(cvData: any, usedTypes: Set<string>): string {
    const fallbacks: Array<{ type: string; label: string; render: (data: any, section: SectionConfig) => string }> = [
        { type: "certifications", label: "Certifications", render: renderCertifications },
        { type: "volunteering", label: "Volunteering", render: renderVolunteering },
        { type: "publications", label: "Publications", render: renderPublications },
        { type: "references", label: "References", render: renderReferences },
        { type: "custom", label: "Custom sections", render: renderCustomSections },
    ];
    return fallbacks
        .filter(({ type }) => !usedTypes.has(type))
        .map(({ type, label, render }) =>
            render(cvData, { type, label, placement: "main", visible: true }),
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
          <div class="skill-tags">${items(group.skills).map((skill) => `<span class="tag">${html(skill)}</span>`).join("")}</div>
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
                showDates ? entry.period : "",
                showLocations ? entry.location : "",
            ].filter(Boolean).map(html).join(" · ");
            return `<div class="item item--compact">
          <h3>${html(entry.degree)}</h3>
          <span class="institution">${html(entry.institution)}</span>
          ${meta ? `<span class="meta">${meta}</span>` : ""}
          ${entry.description_markdown ? `<p class="description description--sm">${html(entry.description_markdown)}</p>` : ""}
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
        `<div class="skill-tags">${rows.map((interest) => `<span class="tag">${html(interest)}</span>`).join("")}</div>`,
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

function renderCvContent(cvData: any): string {
    const sectionsConfig = configuredSections(cvData);
    const usedTypes = new Set(sectionsConfig.map((section) => section.type));
    const warning = renderOnePageWarning(cvData);
    const sections = sectionsConfig
        .map((section) => renderSection(cvData, section))
        .concat(renderFallbackSections(cvData, usedTypes))
        .filter(Boolean)
        .join("");
    return `<div class="cv-wrapper">
      ${renderHeader(cvData)}
      ${warning}
      <div class="main-grid">${sections}</div>
    </div>`;
}

function renderOnePageWarning(cvData: any): string {
    if (cvData?.global_settings?.page?.one_page_challenge !== true) return "";
    const risk = onePageOverflowRisk(cvData);
    if (risk === "fit") return "";
    const message =
        risk === "high"
            ? "One-page challenge is active, but this resume is likely to overflow one page. Reduce content or switch to a denser template."
            : "One-page challenge is active. This resume is close to the one-page limit.";
    return `<aside class="one-page-warning" data-overflow-risk="${risk}">${html(message)}</aside>`;
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

// ── Modern Template (aligned with new cv_schema.json structure) ───────────────
const modernTemplate = Handlebars.compile(`
<div class="cv-wrapper">

  {{!-- HEADER --}}
  <header class="header">
    <div class="header-accent"></div>
    <div class="header-body">
      <h1>{{profile.full_name}}</h1>
      <p class="tagline">{{profile.title}}</p>

      {{!-- Contact bar --}}
      <div class="contact-bar">
        {{#if profile.email}}<span class="contact-item">✉ {{profile.email}}</span>{{/if}}
        {{#if profile.phone}}<span class="contact-item">☎ {{profile.phone}}</span>{{/if}}
        {{#if profile.location.city}}<span class="contact-item">📍 {{profile.location.city}}, {{profile.location.country}}</span>{{/if}}
        {{#each profile.socials}}
          <span class="contact-item"><a href="{{url}}" class="contact-link">{{#if label}}{{label}}{{else}}{{type}}{{/if}}</a></span>
        {{/each}}
      </div>

      {{#if profile.text_markdown}}
        <p class="summary">{{profile.text_markdown}}</p>
      {{/if}}
    </div>
  </header>

  {{!-- MAIN GRID: left column + right column --}}
  <div class="main-grid">

    {{!-- LEFT COLUMN --}}
    <div class="left-col">

      {{!-- EXPERIENCE --}}
      {{#if (hasItems experience)}}
      <section class="section">
        <h2 class="section-title">Expériences</h2>
        {{#each experience}}
        <div class="item">
          <div class="item-header">
            <h3>{{role}}</h3>
            <span class="company">{{company}}</span>
            <span class="meta">{{period}}{{#if location.city}} · {{location.city}}{{/if}}</span>
          </div>
          {{#if description_markdown}}
            <p class="description">{{description_markdown}}</p>
          {{/if}}
          {{#if (hasItems keywords)}}
          <div class="keyword-tags">
            {{#each keywords}}<span class="kw-tag">{{this}}</span>{{/each}}
          </div>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- PROJECTS --}}
      {{#if (hasItems projects)}}
      <section class="section">
        <h2 class="section-title">Projets</h2>
        {{#each projects}}
        <div class="item">
          <div class="item-header">
            <h3>{{name}}{{#if url}} <a href="{{url}}" class="proj-link">↗</a>{{/if}}</h3>
          </div>
          {{#if description_markdown}}
            <p class="description">{{description_markdown}}</p>
          {{/if}}
          {{#if (hasItems tech_stack)}}
          <div class="keyword-tags">
            {{#each tech_stack}}<span class="kw-tag">{{this}}</span>{{/each}}
          </div>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

    </div>

    {{!-- RIGHT COLUMN --}}
    <div class="right-col">

      {{!-- SKILLS --}}
      {{#if (hasItems skills)}}
      <section class="section">
        <h2 class="section-title">Compétences</h2>
        {{#each skills}}
        <div class="skill-group">
          <h4 class="skill-category">{{category}}</h4>
          <div class="skill-tags">
            {{#each skills}}<span class="tag">{{this}}</span>{{/each}}
          </div>
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- EDUCATION --}}
      {{#if (hasItems education)}}
      <section class="section">
        <h2 class="section-title">Formation</h2>
        {{#each education}}
        <div class="item item--compact">
          <h3>{{degree}}</h3>
          <span class="institution">{{institution}}</span>
          <span class="meta">{{period}}{{#if location}} · {{location}}{{/if}}</span>
          {{#if description_markdown}}
            <p class="description description--sm">{{description_markdown}}</p>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- LANGUAGES --}}
      {{#if (hasItems languages)}}
      <section class="section">
        <h2 class="section-title">Langues</h2>
        {{#each languages}}
        <div class="lang-item">
          <span class="lang-name">{{language}}</span>
          <span class="lang-level">{{level}}</span>
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- HOBBIES --}}
      {{#if (hasItems hobbies)}}
      <section class="section">
        <h2 class="section-title">Intérêts</h2>
        <div class="skill-tags">
          {{#each hobbies}}<span class="tag">{{this}}</span>{{/each}}
        </div>
      </section>
      {{/if}}

    </div>
  </div>
</div>
`);

// ── Engine Entry Point ────────────────────────────────────────────────────────

export function generateHtml(cvData: any, templateId: string = "modern"): string {
    // Prefer template_id from global_settings if not explicitly passed
    const resolvedTemplate =
        (cvData?.global_settings?.template_id as string | undefined) ?? templateId;

    const supportedTemplates = new Set([
        "modern",
        "compact",
        "ats",
        "student",
        "creative",
    ]);
    const activeTemplate = supportedTemplates.has(resolvedTemplate)
        ? resolvedTemplate
        : "modern";

    const cssPath = join(import.meta.dir, "styles", `${activeTemplate}.css`);
    let css = "";
    try {
        css = readFileSync(cssPath, "utf-8");
    } catch {
        console.warn(`CSS not found for template "${activeTemplate}", using fallback.`);
        css = ":host { font-family: sans-serif; }";
    }

    let content = "";
    if (supportedTemplates.has(activeTemplate)) {
        content = renderCvContent(cvData);
    } else {
        throw new Error(`Template "${resolvedTemplate}" is not supported.`);
    }

    // Append user token overrides — these win the cascade inside Shadow DOM
    const tokenOverrides = buildTokenOverrides(cvData?.global_settings);
    if (tokenOverrides) css += `\n\n/* ── User Design Tokens ── */\n${tokenOverrides}`;

    return shellTemplate({ css, content, ...pageSize(cvData?.global_settings) });
}
