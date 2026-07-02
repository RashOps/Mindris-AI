milestone: Phase 19 (see docs/roadmap.md)

# Run 19 - Recruiter intelligence layer

contract: Mindris must enrich a job opportunity with recruiter-facing company context, role-fit hints, and explicit uncertainty signals without defaulting to token-heavy LLM analysis.

invariant: The frontend remains a client-only surface. Company enrichment, fit evaluation, provenance, caching, and any optional LLM usage remain backend-owned.

decision: The enrichment strategy for this run is `base-first, LLM-last`.

reason: The product needs faster, cheaper, and more auditable company intelligence than a prompt-first approach can provide.

contract: The backend must build a deterministic `company profile` before any optional LLM synthesis.

contract: A company profile must prioritize non-LLM signals from:
- the scraped job source URL
- the company homepage when resolvable
- detected `about`, `careers`, and `jobs` pages when available
- HTML title and meta description
- JSON-LD and structured metadata
- visible text snippets relevant to hiring, stack, culture, and work mode

contract: The company profile output for this run must expose:
- company name
- canonical domain when present
- homepage URL when found
- careers URL when found
- inferred industry
- inferred company size
- inferred work mode (`remote`, `hybrid`, `onsite`, `unknown`)
- detected locations
- detected tech stack keywords
- detected culture/process keywords
- raw evidence snippets per field
- provenance classification per field: `verified`, `derived`, `unknown`
- freshness timestamps and cache metadata

decision: `verified` means explicitly found in source material, `derived` means inferred locally from deterministic heuristics, and `unknown` means not confidently resolved.

contract: The backend must compute `role-fit hints` locally from:
- job offer signals
- company profile signals
- selected resume signals when available

contract: Role-fit hints for this run must cover:
- skills to foreground
- wording to mirror from the job/company language
- likely priority experiences/projects to surface
- recruiter-facing emphasis suggestions for CV and cover letter

contract: The backend must compute `risk & unknowns` locally and explicitly, including:
- missing company context
- unclear work mode/location
- stack mismatch signals
- seniority mismatch signals
- weak evidence or ambiguity warnings

decision: Optional LLM synthesis is allowed only after deterministic enrichment has completed and only when the caller explicitly requests a synthesized briefing.

failure: The absence of a reachable homepage, careers page, or about page must not fail the enrichment pipeline. The API must still return partial deterministic results with explicit `unknown` provenance.

contract: Company enrichment results must be cached persistently by normalized company/domain identity to avoid repeated token or network cost.

contract: Existing company insight storage may be extended, but the run must preserve backward compatibility for earlier cached payloads.

contract: The UI for this run must expose:
- deterministic company profile
- field provenance and evidence
- role-fit hints
- explicit unknowns/risks
- optional synthesized summary only when invoked

test: Backend tests must validate:
- deterministic extraction/parsing from representative HTML inputs
- provenance assignment rules
- cache reuse behavior
- fit/risk outputs without LLM calls
- backward compatibility with older company insight payloads

test: Frontend tests must validate:
- rendering of verified/derived/unknown signals
- display of hints and risk sections
- no hidden frontend orchestration for company analysis

deferred: External news aggregation, Glassdoor-style scraping, and deep web enrichment remain out of scope for this run.

deferred: Autonomous company crawling beyond a bounded set of pages remains out of scope until network/runtime controls are better formalized.
