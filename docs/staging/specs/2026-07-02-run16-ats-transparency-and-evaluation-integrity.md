milestone: Phase 16 (see docs/roadmap.md)

# Run 16 - ATS transparency and evaluation integrity

contract: ATS scoring must be inspectable, reproducible enough for operator trust, and explicit about how a score was produced.

invariant: The frontend remains a client-only surface. ATS scoring policy, scoring mode, deduction semantics, and report persistence stay backend-owned.

decision: Preserve the current detailed ATS report shape as baseline, then extend it with explicit transparency metadata instead of replacing it.

contract: The ATS report contract must expose:
- overall score
- summary
- scoring breakdown by rubric criterion
- keyword analysis
- recommendations
- evaluation mode (`standard` or `strict`)
- published rubric metadata used for the run
- deduction reasons with severity and evidence
- report context linking the evaluated resume and job context

decision: Add two backend-owned ATS modes:
- `standard`: balanced scoring for common modern ATS workflows
- `strict`: harsher penalties and more conservative expectations for old or rigid ATS environments

contract: Mode selection is explicit in the API request and persisted with the ATS report.

decision: The published rubric is fixed by contract for this run and exposed by API so the UI can explain the score without inventing policy in the browser.

contract: Rubric dimensions for this run are:
- keyword match rate
- experience relevance
- formatting and structure
- quantification
- title and role alignment
- overall coherence

decision: Deductions are first-class data, not only prose inside criterion explanations.

contract: Each deduction entry includes:
- code
- title
- severity
- points_lost
- evidence
- recommendation

failure: If the LLM provider fails to return a valid structured ATS report, the backend returns a safe fallback report that still includes mode, rubric metadata, and a machine-readable failure reason.

decision: ATS history linkage is limited in this run to persisted report context, not the full event ledger planned for Phase 17.

contract: Persisted ATS reports must include enough context to answer:
- which resume was scored
- which locale or variant was active when relevant
- which job or job insights were scored against
- which provider/model generated the report
- which mode was used

decision: The ATS UI must make three things visible without requiring users to infer them:
- the active evaluation mode
- the rubric and weighting method
- the top deductions driving the score

test: Backend tests must validate:
- ATS report schema with mode, rubric, deductions, and context
- fallback report shape
- API request acceptance for standard vs strict modes
- persistence serialization for the added ATS metadata

test: Frontend tests must validate:
- mode selection is sent through API requests
- rubric metadata and deductions can be rendered from backend payloads
- no frontend-local scoring policy is introduced

deferred: Full ATS score history browsing remains part of Phase 17.

deferred: Automatic workflow reactions to ATS results remain part of later orchestration runs.

## Working notes

- Current `services/intelligence/ats_score.py` already has partial transparency via `scoring_breakdown` and `keyword_analysis`, but it lacks explicit mode, rubric contract, deductions, and persisted context.
- Current ATS page already renders rich charts, which is good leverage for transparency work instead of a UI rewrite.
- Current `/api/v1/cv/score` route can likely be extended without changing the frontend ownership model.
