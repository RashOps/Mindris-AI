milestone: Phase 11 (see docs/roadmap.md)

# Advanced CSS Editor

contract: The advanced CSS editor is backend-owned. The frontend only edits text, fetches capability metadata, persists resume updates through the API, and requests preview/export from existing services.

contract: `cvData.global_settings` gains an optional `advanced_css` object:
- `enabled`: boolean
- `mode`: `off | tokens | css_patch`
- `css_text`: string
- `preset_id`: optional string for future community snippets
- `warnings`: optional list of renderer-generated validation warnings in serialized responses

contract: The existing customization catalogue endpoint is extended with an `advancedCss` section that declares:
- feature availability
- maximum CSS length
- allowed selector scopes
- blocked at-rules and blocked functions
- examples/snippets for supported customization

contract: The API gateway persists `advanced_css` as resume data only. It performs coarse validation:
- max length
- text type
- reject obvious remote-loading constructs such as `@import`
- reject obvious executable/browser escape constructs such as `javascript:` and `expression(`

contract: The renderer is the execution boundary. It sanitizes and applies advanced CSS only inside the existing Shadow DOM shell used by resume templates.

contract: Supported CSS scope is limited to the resume document and template hooks:
- `:host`
- descendants inside the resume shadow tree
- data attributes already emitted by the renderer such as section placement and section type markers

contract: The renderer rejects or strips CSS that attempts to escape the resume surface, including:
- `@import`
- external `url(...)` resources
- selectors targeting `html`, `body`, `:root`, or script-like constructs outside the shadow tree

invariant: The frontend remains client-only. It never sanitizes, transforms, or executes CSS as a service layer.

invariant: PDF, HTML preview, and live builder preview use the same renderer-side CSS sanitation path.

invariant: If advanced CSS is invalid or partially unsupported, preview/export remains readable with template defaults plus accepted CSS fragments only.

invariant: ATS-safe exports remain semantic. Markdown, JSON, DOCX, LaTeX, and Typst ignore advanced CSS entirely.

data: `advanced_css.mode = tokens` means custom CSS is limited to `:host` token overrides and safe variable assignments.

data: `advanced_css.mode = css_patch` means sanitized selectors and declarations may target approved shadow-tree elements in addition to token overrides.

failure: Invalid `advanced_css` payload shape returns normalized 422 errors from the API gateway.

failure: Oversized or obviously unsafe CSS returns normalized 422 errors from the API gateway.

failure: Renderer-side unsupported selectors or declarations are dropped and surfaced as warnings; they do not crash preview/export.

failure: If all custom CSS is rejected, the renderer falls back to template CSS and emits a warning instead of failing the document.

test: Backend tests validate schema acceptance, unsafe construct rejection, max-length enforcement, and serialization of the `advanced_css` contract.

test: Renderer tests validate selector/function stripping, `:host` token application, css patch scoping inside Shadow DOM, and fallback behavior when CSS is fully rejected.

test: Browser tests verify the builder can enable advanced CSS, persist it through resume reload, show warnings, and keep PDF export stable.

deferred: Community CSS snippet publishing and moderation are deferred to the community templates run.

deferred: Arbitrary custom fonts, remote assets, and third-party CSS imports are deferred.

deferred: Monaco-grade IDE ergonomics, lint markers, and autocomplete are deferred if a simpler textarea plus preview loop is enough to ship the milestone.

## Working notes

Renderer already has a safe insertion point for CSS through the Shadow DOM shell in `services/renderer/src/templates/engine.ts`.

The safest implementation path is layered:
- API gateway: persistence and coarse rejection
- renderer: final sanitation and warnings
- frontend: editor UI and warning display only

The customization catalogue already exists and should carry capability metadata rather than introducing a separate frontend-owned config source.
