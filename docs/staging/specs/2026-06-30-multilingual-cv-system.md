milestone: Phase 12 (see docs/roadmap.md)

# Multilingual CV System

## Approaches considered

approach: Duplicate one resume per language.

tradeoff:
- simple technically
- bad product ergonomics
- weak link between variants of the same CV
- versioning, export, and tracker association become fragmented

approach: Store field-level translation overlays only.

tradeoff:
- space efficient
- too complex for the current renderer/export stack
- hard to reason about section-level edits and structural drift

approach: Store full locale variants under one backend-owned resume document.

tradeoff:
- duplicates some content
- simplest coherent product model for preview, export, versioning, and tracker integration

decision: Run 12 uses full backend-owned locale variants under a single resume.

## Contract

contract: A resume can contain multiple locale variants while remaining one logical resume in the library.

contract: `ResumeRecord.data_json` gains a backend-owned multilingual block:
- `multilingual`
  - `default_locale`: `fr | en | de | es`
  - `active_locale`: `fr | en | de | es`
  - `variants`: map of locale -> full CV payload snapshot for that locale

contract: The existing top-level `cvData` remains the resolved active variant in API responses for backward compatibility.

contract: API serialization returns both:
- `cvData`: the currently resolved active locale payload
- `multilingual`: metadata and variant availability with:
  - `defaultLocale`
  - `activeLocale`
  - `availableLocales`

contract: Editing a resume always targets one locale variant explicitly. The frontend passes the target locale through the resume API and never merges variants client-side.

contract: The frontend remains a client only:
- it lists variants
- switches active locale
- creates or duplicates a locale variant through API calls
- edits the selected locale payload
- requests preview/export for the selected locale

contract: Template, section configuration, exports, ATS scoring, and versioning operate on the resolved locale variant, not on a frontend-composed projection.

## Data

data: Each locale variant is a full CV payload using the current schema:
- `global_settings`
- `profile`
- `experience`
- `education`
- `skills`
- `projects`
- `languages`
- advanced sections

data: `global_settings.locale.label_language` must match the variant locale unless explicitly overridden by backend migration rules.

data: Creating a new locale variant duplicates the source locale payload as a starting point. No automatic machine translation is required for Run 12.

data: `record.locale` remains the library-level default locale and mirrors `multilingual.default_locale`.

## Invariants

invariant: One logical resume id can expose several locale variants without duplicating tracker links, revision lineage, or library ownership.

invariant: Backward compatibility is preserved for existing single-locale resumes. A resume without `multilingual.variants` is migrated lazily into a single default variant.

invariant: Preview, PDF, JSON, Markdown, HTML, DOCX, LaTeX, and Typst all resolve from the same selected locale variant.

invariant: Switching locale never mutates another locale variant implicitly.

invariant: A missing locale variant never falls back silently during save. The API must return a clear error or create the variant explicitly.

## Failure

failure: Requesting an unknown locale variant returns normalized 404 or 422 with the locale identifier.

failure: Attempting to save invalid locale metadata returns normalized 422.

failure: Deleting the default locale variant is rejected unless another locale is promoted first.

failure: If `active_locale` points to a missing variant, backend serialization repairs it to `default_locale` and emits a warning.

## API shape

contract: Resume routes are extended with locale-aware operations:
- list variant metadata on existing resume payloads
- `POST /api/v1/resumes/{id}/locales`
- `POST /api/v1/resumes/{id}/locales/{locale}/activate`
- `DELETE /api/v1/resumes/{id}/locales/{locale}`
- locale-targeted `PATCH /api/v1/resumes/{id}` via `target_locale`

contract: Export routes accept an optional locale selector and resolve the matching variant server-side.

contract: Versioning stores the locale of each snapshot and compares revisions within the same locale variant by default.

## Test

test: Backend tests validate lazy migration of legacy resumes, create/switch/delete variant flows, locale-aware exports, and error handling.

test: Frontend tests validate normalization of multilingual metadata, active-locale switching, and controlled inputs for variant management.

test: Browser tests validate creating an EN variant from FR, switching locale in the builder, editing locale-specific content, and exporting the selected locale.

## Deferred

deferred: Automatic translation with LLM or external providers.

deferred: Shared-field deduplication between locale variants.

deferred: Per-locale template selection if it introduces incompatible preview/export behavior.

deferred: Public portfolio URLs per locale.

## Working notes

Current code already carries partial locale signals:
- `record.locale`
- `global_settings.locale.label_language`
- bilingual template presets

What is missing is a true product model that lets one resume own multiple language variants without fragmenting the library or pushing merge logic into the frontend.
