# Run 22 - Workflow reliability and data integrity

milestone: Phase 22 (see docs/roadmap.md)

contract: Mindris must behave like one coherent candidate workflow even when artifacts are created at different times, partially fail, or are resumed later. Opportunity, resume, ATS report, cover letter, tracker application, and activity history must remain linkable, inspectable, and recoverable.

invariant: The frontend remains a client-only shell. Workflow truth, linkage repair, retries, and integrity checks stay backend-owned and API-mediated.

decision: This run prioritizes workflow correctness over new surface area. We strengthen state transitions, artifact linkage, and degraded-state handling before adding more product features.

contract: Workflow state must remain explicit and backend-resolved. Operators should be able to answer:
- what opportunity this artifact belongs to
- which resume locale/version was used
- whether ATS and cover letter were generated, linked, or failed
- whether a tracker entry exists, is attached, or is missing
- what can be retried safely

decision: Partial failure is normal, not exceptional. The system should preserve useful progress and expose resumable next steps instead of collapsing the whole workflow into a generic failed state.

contract: Integrity checks must detect at least:
- opportunity records with missing linked artifacts
- tracker entries pointing to deleted or unknown opportunity context
- ATS or cover-letter records without recoverable lineage metadata
- stale resume references after delete/duplicate/locale operations

failure: If a destructive or linking operation would leave the workflow in a more inconsistent state, the backend must reject it or degrade it into a known detached state with explicit metadata.

decision: Recovery is bounded. This run does not introduce a generic event-sourcing framework or background repair daemon. It adds targeted verification and repair primitives for the existing workflow model.

contract: The application must expose one workflow integrity surface that makes degraded states visible and actionable without requiring DB inspection.

test: Backend validation must cover state transitions, orphan detection, and repair/retry behavior for core workflow records.

test: Browser validation must cover at least one end-to-end resumed workflow, one partial-failure path, and one repair-visible state.

deferred: This run does not add collaboration, multi-user concurrency controls, or remote queue orchestration.

deferred: This run does not redesign the full workflow UI from scratch; it tightens behavior and clarity on the existing product surfaces.

## Working notes

- Phase 17 already introduced a unified activity ledger.
- Phase 18 introduced the explicit opportunity workflow backbone.
- Phase 21 stabilized the UI shell and builder header, which removes a major source of navigation noise.
- The next product risk is no longer discoverability; it is confidence that linked workflow data stays coherent as users iterate on artifacts over time.
