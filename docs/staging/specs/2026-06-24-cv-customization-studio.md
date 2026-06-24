milestone: Phase 8 (see docs/roadmap.md)

# CV Customization Studio

contract: CV customization is backend-owned. The frontend may edit and submit settings, but defaults, validation, supported options, section labels, section placement, and renderer-safe values must be defined by API schemas/catalogue endpoints.

contract: `cvData.global_settings` is expanded into a versioned customization contract:
- `schema_version`
- `page`: format, margins, page break mode
- `layout`: column count, sidebar position, sidebar width, section placement, density, header alignment, photo options
- `typography`: body font, heading font, base size, heading scale, weight, capitalization, line height, date style, bullet style
- `colors`: primary, secondary, text, heading, sidebar background, separators, palette preset, monochrome mode
- `sections`: ordered section configuration with id, type, label, visible, placement, display mode, show dates, show locations, detail level, optional icon
- `locale`: label language and text direction

contract: The backend exposes a customization catalogue endpoint used by the frontend to render controls. The catalogue lists allowed values, min/max ranges, presets, supported section types, supported languages, and template compatibility.

contract: The renderer receives CV data only. It resolves defaults and applies customization from `global_settings`; no renderer route accepts frontend-only layout state.

contract: The frontend keeps its role to orchestration:
- load customization catalogue from API
- display controls
- patch resume through `/api/v1/resumes/{id}`
- request preview/export from renderer/API
- no hardcoded business defaults except temporary load fallbacks for unavailable API

data: Existing fields remain backward compatible. Legacy keys such as `primary_color`, `font_family`, `font_size`, `line_height`, `margin_h`, `margin_v`, `entry_spacing`, `col_left_width`, `col_swap`, and `template_id` are migrated into the versioned contract on backend validation/serialization.

data: Section data additions for this milestone:
- `certifications`: name, issuer, date, url, description_markdown
- `volunteering`: organization, role, period, location, description_markdown
- `publications`: title, publisher, date, url, description_markdown
- `references`: name, role, company, contact, description_markdown
- `custom_sections`: id, title, content_markdown, items

invariant: ATS strict mode forces a single column, no photo, conservative bullets, high contrast colors, and text-based export compatibility.

invariant: Contrast validation rejects or adjusts unreadable foreground/background combinations before persistence.

invariant: Hidden sections remain persisted in CV data but are excluded from preview and exports.

invariant: Section ordering and placement are deterministic across live preview, PDF, DOCX, HTML, Markdown, and JSON exports. If an export cannot support a visual option, it must degrade to a readable semantic order.

failure: Invalid customization values return normalized 422 API errors with field-level details.

failure: Unsupported template/section combinations fall back to backend defaults and return warnings in the serialized response.

test: Backend tests validate schema migration, invalid customization rejection, section visibility, section labels, and ATS strict constraints.

test: Renderer tests verify generated HTML contains expected CSS variables, section labels, order, placement classes, and hidden-section exclusion.

test: Browser E2E verifies changing page format, columns/sidebar, palette, font, section labels, visibility, order, and template still saves and exports.

deferred: RTL rendering beyond validated direction metadata is deferred unless the selected renderer templates can be made reliable in the same milestone.

deferred: Manual page-break placement is deferred after automatic/semantic page-break behavior unless PDF testing shows it is low risk.

## Working notes

Current implementation already supports five backend templates, primary color, font family, base font size, line height, horizontal/vertical margins, entry spacing, left column width, column swap, live preview, autosave, and exports.

Current gaps are backend contract depth, section metadata, advanced section types, semantic section renderer, color contrast checks, palette presets, A4/Letter support, sidebar options, header/photo controls, date/bullet styles, label localization, and export parity.

T1 implementation note: backend schema now validates a versioned `global_settings` contract, migrates MVP1 flat keys into nested page/layout/typography/colors/sections/locale settings, applies ATS strict constraints, and rejects low-contrast text/sidebar combinations.

T2 implementation note: `/api/v1/templates/customization-catalogue` now exposes backend-owned customization options for page formats, layout controls, typography ranges, color presets, section types, locale options, and template compatibility/enforcement.

T3 implementation note: renderer content generation now resolves sections from `global_settings.sections`, preserves configured order, applies labels and `data-section-placement`, and excludes hidden sections from generated HTML.
