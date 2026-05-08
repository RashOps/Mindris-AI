# ADR-004 — AI Scraping Pipeline: Technical Decisions

**Date:** 2026-05-08  
**Status:** Accepted  
**Authors:** Rayhan (Mindris AI), Antigravity AI  
**Deciders:** Rayhan

---

## Context

This ADR documents all technical decisions made during the construction and
stabilisation of the end-to-end Mindris AI pipeline, which consists of:

1. A Playwright-based scraper that retrieves job offer pages and converts them
   to Markdown.
2. A CrewAI / Ollama intelligence service that extracts structured data from
   the Markdown and returns a validated `JobOffer` Pydantic model.

Several problems were encountered and solved iteratively; each solution
constitutes a decision recorded here.

---

## Decisions

---

### D1 — Use `extra_body` to inject Ollama options through the OpenAI SDK

**Problem:**  
The Ollama server defaulted to a 4 096-token context window (`KvSize:4096`).
Passing `num_ctx` directly as a keyword argument to `crewai.LLM()` raised
`Completions.parse() got an unexpected keyword argument 'num_ctx'` because
CrewAI uses the official OpenAI Python SDK internally, which rejects unknown
parameters at the Python level before the request is even sent.  
Setting `OLLAMA_NUM_CTX` as a system environment variable on Windows had no
effect because Ollama reads that variable only at process start, and the running
service had already allocated the KV cache at 4 k.

**Decision:**  
Pass `extra_body={"options": {"num_ctx": 32768}}` to `crewai.LLM()`.  
The OpenAI SDK forwards the `extra_body` dict as-is in the raw JSON request
body. Ollama's OpenAI-compatible endpoint reads the nested `options` object and
honours `num_ctx` on a per-request basis.

**Consequences:**  
- ✅ No changes required on the Windows host.  
- ✅ The 32 k context is activated transparently from Python code.  
- ⚠️ This relies on undocumented Ollama behaviour. The `Modelfile` approach
  (see D2) remains the canonical long-term fix.

---

### D2 — Create a dedicated `gemma4:32k` Modelfile for permanent 32 k context

**Problem:**  
The `extra_body` trick works per-request but Ollama still *loads* the model
with `KvSize:4096` when the model is first started. If another client calls the
model without `options.num_ctx`, the context reverts to 4 k.

**Decision:**  
Ship a `gemma4-32k.modelfile` at the repository root. Running
`ollama create gemma4:32k -f gemma4-32k.modelfile` once on Windows creates a
named variant that always starts with `num_ctx 32768` baked in. The `.env`
variable `OPENAI_MODEL_NAME` is then updated to `gemma4:32k`.

**Consequences:**  
- ✅ Permanent fix — no runtime tricks needed.  
- ✅ The `extra_body` remains as a safety net and is harmless.  
- ℹ️ Requires a one-time manual action on Windows.

---

### D3 — Set `timeout=600` on `crewai.LLM` for local GPU models

**Problem:**  
LiteLLM (the HTTP routing layer inside CrewAI) has a default timeout of ≈ 90
seconds. The local `gemma4:32k` model running on an AMD Radeon RX 6800M takes
1–3 minutes to generate a structured JSON response. LiteLLM closed the
connection first, causing Ollama to log
`"aborting completion request due to client closing the connection"` and return
HTTP 500.

**Decision:**  
Pass `timeout=600` to `crewai.LLM()`. This gives the GPU model up to 10 minutes
before the client abandons the request.

**Consequences:**  
- ✅ No more spurious 500 errors.  
- ⚠️ A genuinely hung request will block for 10 minutes. This is acceptable for
  a development pipeline; a production service would use async streaming instead.

---

### D4 — Place JSON schema rules before the Markdown content in the task prompt

**Problem:**  
Even with a 32 k context window, the scraped Markdown of some pages (e.g. the
AXA recruitment site) totalled 54 906 tokens. Ollama truncates the *end* of the
prompt when the input overflows, which removed the JSON instructions that
appeared after the Markdown. The model then received raw text with no output
format guidance and generated a multi-minute prose response.

**Decision:**  
In `tasks.py`, the critical JSON rules (key names, output format) are written
**before** the job-offer Markdown. The content comes last. This way, even if
Ollama must truncate, the structural instructions always survive.

**Consequences:**  
- ✅ The model consistently outputs valid JSON regardless of page length.  
- ✅ Compatible with any context window size.

---

### D5 — Truncate Markdown input to 12 000 characters before LLM inference

**Problem:**  
Even with instructions first, sending 54 906 tokens to a 32 768-token model is
wasteful and slow. For skill extraction, the first few thousand words of a job
offer contain all the relevant information.

**Decision:**  
In `tasks.py`, `job_markdown` is sliced to `_MAX_MARKDOWN_CHARS = 12_000`
characters (≈ 3 000 tokens) before being embedded in the prompt. A `[… content
truncated …]` marker is appended when truncation occurs.

**Token budget after truncation:**

| Section | Approx. tokens |
|---|---|
| CrewAI system prompt + agent backstory | ~1 800 |
| JSON rules (task description) | ~200 |
| Markdown content (truncated) | ~3 000 |
| **Total prompt** | **~5 000** |
| LLM response | ~500 |
| **Grand total** | **~5 500 / 32 768** |

**Consequences:**  
- ✅ Inference time drops from 6+ minutes to ~2 minutes.  
- ✅ Vastly reduces the risk of context overflow on any future model.  
- ⚠️ Very long job descriptions may lose supplementary information (benefits,
  detailed process descriptions). Accepted trade-off for a v1 pipeline.

---

### D6 — Inject `url` and `description_markdown` post-inference in Python

**Problem:**  
The `JobOffer` Pydantic model has required fields `url` and
`description_markdown`. Asking the LLM to reproduce the source URL and the full
Markdown body inside a JSON response is wasteful (large tokens) and unreliable
(small models hallucinate or reformat URLs).

**Decision:**  
These two fields are marked `Optional` with `None` defaults. After `crew.kickoff()`
returns, `run_pipeline.py` injects the known values directly on the Pydantic
object:

```python
result.pydantic.url = url
result.pydantic.description_markdown = markdown_content
```

**Consequences:**  
- ✅ Saves ~3 000 tokens per call.  
- ✅ URL and Markdown are guaranteed to be correct (not hallucinated).  
- ℹ️ The LLM is only responsible for the "intelligence" fields it was designed
  to produce.

---

### D7 — Use `AliasChoices` on `JobOffer` to tolerate LLM key-name drift

**Problem:**  
Small LLMs (especially when prompted in French) tended to translate JSON key
names into French (`"entreprise"` instead of `"company"`, `"job_title"` instead
of `"title"`), causing Pydantic validation errors.

**Decision:**  
Use `pydantic.AliasChoices` on the affected fields so that Pydantic accepts
multiple key names:

```python
title: str = Field(
    ...,
    validation_alias=AliasChoices("title", "job_title", "titre"),
)
```

**Consequences:**  
- ✅ Resilient to minor model regressions or prompt language changes.  
- ✅ No change required when switching models.  
- ℹ️ The canonical key names remain English; aliases are only for input parsing.

---

### D8 — Use Chrome 125 user-agent and simulate human behaviour in the scraper

**Problem:**  
The scraper used a Chrome 91 (2021) user-agent, which is immediately flagged as
suspicious by Cloudflare Bot Management. Pages returned the Cloudflare challenge
page instead of content, and sending that challenge HTML to the LLM produced
garbled output.

**Decision:**  
- Update `USER_AGENT_*` constants to Chrome 125 (2025).  
- Add `locale="fr-FR"`, `timezone_id="Europe/Paris"` to the browser context.  
- Add `--disable-blink-features=AutomationControlled` to Chrome args.  
- Simulate human scroll behaviour (progressive `window.scrollTo` calls with
  random 0.3–0.8 s pauses) before extracting content.  
- Randomise the initial page-load delay to 3–8 seconds.

**Consequences:**  
- ✅ Successfully bypasses Cloudflare on standard job boards.  
- ⚠️ Does not defeat Cloudflare Turnstile (interactive CAPTCHA). Those cases
  require a manual first-pass with `headless=False` to populate the persistent
  profile's cookie store.

---

### D9 — Two-pass Cloudflare detection with early abort

**Problem:**  
When Cloudflare was not bypassed, the scraper returned the challenge page's HTML
(containing `cf_chl_opt` and thousands of lines of obfuscated JS). This was
passed to the LLM, which then blocked indefinitely trying to parse it.

**Decision:**  
Implement a two-pass detection strategy:

1. **After navigation:** check `page.title()` for `"Just a moment"` or
   `"Cloudflare"`. If detected, wait 15 s for auto-resolution and re-check.
2. **After extraction:** scan the extracted HTML for known CF fingerprints
   (`"cf_chl_opt"`, `"cf-challenge"`, etc.). If found, return `""` immediately.

An empty string from the scraper causes `run_pipeline.py` to abort before
reaching the LLM.

**Consequences:**  
- ✅ Prevents terminal lock-ups from the LLM processing Cloudflare JS.  
- ✅ Gives Cloudflare's JS challenge a chance to auto-resolve (common on pages
  that only require a browser fingerprint check, not a CAPTCHA).

---

### D10 — Centralise configuration in `packages/utils/config.py` with `pydantic-settings`

**Problem:**  
Configuration values (`OPENAI_API_BASE`, `OPENAI_MODEL_NAME`, log paths, scraper
settings) were scattered across `os.getenv()` calls in multiple service files,
making it hard to audit or change them.

**Decision:**  
Create a `Settings` class in `packages/utils/config.py` using
`pydantic-settings`. It reads `.env` automatically, validates all values, and
exposes a singleton `settings` object imported by all services:

```python
from utils.config import settings
settings.openai_api_base   # "http://172.31.192.1:11434"
settings.llm_num_ctx       # 32768
settings.scraper_headless  # True
```

**Consequences:**  
- ✅ Single source of truth for all runtime configuration.  
- ✅ Type-safe — wrong types in `.env` raise an error at startup, not deep in
  business logic.  
- ✅ `logs_dir` and `storage_dir` are created automatically on first import
  (`model_post_init`).

---

### D11 — Rewrite the intelligence prompt in English

**Problem:**  
Prompts written in French caused small LLMs to respond in French, including
translating JSON key names (see D7). Even with alias fixes, French prompts
produced less reliable extractions.

**Decision:**  
All task descriptions and expected output specifications in `tasks.py` are
written in English. The agent `role`, `goal`, and `backstory` in `agents.yaml`
remain in English. Only user-facing console messages in scripts (`run_pipeline.py`)
may be in French for developer convenience.

**Consequences:**  
- ✅ More reliable JSON key naming from the LLM.  
- ✅ Better compatibility with future English-only models.

---

### D12 — Activate full `ruff` ruleset with per-file ignores

**Problem:**  
The codebase had 227 ruff violations (missing docstrings, deprecated `typing`
imports, unsorted imports, bare `except`, French comments in code, `print()`
used instead of a logger).

**Decision:**  
Enable rules `E`, `F`, `I`, `N`, `W`, `B`, `UP`, `D`, `ANN`, `T20`, `SIM`,
`C4` in `pyproject.toml`. Use `per-file-ignores` to silence `T201` (print) in
the scraper and pipeline scripts, and `D`/`ANN` in auto-generated stubs
(`api-gateway`, `schemas/`). Docstring convention set to Google style (`D212`).

**Result:** 227 → **0 errors**.

**Consequences:**  
- ✅ Consistent code style enforced at CI level.  
- ✅ All public functions and classes have English Google-style docstrings.  
- ✅ All types use native Python 3.12 syntax (`str | None`, `list[str]`).

---

## Summary Table

| # | Decision | File(s) affected |
|---|---|---|
| D1 | `extra_body` for `num_ctx` | `llm_config.py` |
| D2 | `gemma4:32k` Modelfile | `gemma4-32k.modelfile`, `.env` |
| D3 | `timeout=600` on `LLM` | `llm_config.py` |
| D4 | JSON rules before Markdown in prompt | `tasks.py` |
| D5 | Truncate Markdown to 12 000 chars | `tasks.py` |
| D6 | Inject `url` / `description_markdown` post-inference | `run_pipeline.py` |
| D7 | `AliasChoices` for key-name tolerance | `models.py` |
| D8 | Chrome 125 UA + human behaviour simulation | `scraper/core.py` |
| D9 | Two-pass Cloudflare detection with abort | `scraper/core.py` |
| D10 | Centralised config via `pydantic-settings` | `packages/utils/config.py` |
| D11 | English-only prompts | `tasks.py`, `agents.yaml` |
| D12 | Full ruff ruleset + per-file ignores | `pyproject.toml` |
