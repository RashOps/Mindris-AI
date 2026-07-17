// ── CSS Token Injection ───────────────────────────────────────────────────────

/**
 * Build a :host { } override block from cv_data.global_settings.
 * Only properties explicitly set by the user are overridden.
 */
function cssFontFamily(value: string): string {
    const family = value.includes(" ") ? `'${value}'` : value;
    return `${family}, sans-serif`;
}

export function buildTokenOverrides(settings?: any): string {
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

