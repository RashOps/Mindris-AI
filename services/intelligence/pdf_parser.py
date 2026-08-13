"""PDF parsing service using the official llama-cloud SDK.

This module handles PDF CV ingestion:
1. Upload PDF to LlamaParse API (llama-cloud) → returns clean Markdown.
2. Use a structured LiteLLM call (Groq) to extract structured JSON from Markdown.
3. Return a dict conforming to the Mindris CV schema.
"""

import json
import re
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Literal

from llama_cloud import AsyncLlamaCloud
from utils.config import settings
from utils.logger import get_logger
from utils.runtime_config import resolve_secret_slot

from intelligence.privacy import (
    DataCategory,
    OutboundProviderError,
    PrivacyMode,
    PrivacyTask,
    PseudonymizationError,
    scan_sensitive_text,
    structured_untrusted_data,
    validate_provider_response,
)
from intelligence.privacy_gateway import outbound_gateway

logger = get_logger(__name__, service_name="intelligence")
PDFIngestionMode = Literal["auto", "llama_parse", "local_text"]


# ── LlamaParse Configuration ──────────────────────────────────────────────────


def _get_api_key() -> str:
    """Get the LlamaCloud API key from settings."""
    api_key = resolve_secret_slot("llama_cloud_api_key", settings.llama_cloud_api_key)
    if not api_key:
        raise ValueError(
            "LLAMA_CLOUD_API_KEY is not set. "
            "Get a free key at https://cloud.llamaindex.ai"
        )
    return api_key


# ── PDF → Markdown ─────────────────────────────────────────────────────────────


async def pdf_to_markdown_llama_parse(
    pdf_bytes: bytes, filename: str = "cv.pdf"
) -> str:
    """Parse a PDF file bytes to Markdown using the LlamaCloud parsing API.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        filename: Original filename (used as hint).

    Returns:
        The parsed content as Markdown.
    """
    gateway = outbound_gateway()
    if gateway.mode != PrivacyMode.FULL_CONTEXT_CLOUD:
        raise PermissionError("privacy.pdf.full_context_cloud_required")
    prepared = gateway.prepare(
        provider="llama_cloud",
        model="llama-parse",
        task=PrivacyTask.CV_PARSE,
        payload={
            "profile": {
                "text_markdown": (
                    f"Raw PDF upload: {filename}; {len(pdf_bytes)} bytes. "
                    "The complete document may contain every CV data category."
                )
            }
        },
        declared_categories=frozenset(
            {
                DataCategory.DIRECT_IDENTIFIER,
                DataCategory.CONTACT,
                DataCategory.LOCATION,
                DataCategory.SOCIAL_IDENTIFIER,
                DataCategory.EMPLOYER,
                DataCategory.EDUCATION_INSTITUTION,
                DataCategory.PROFESSIONAL_DATA,
                DataCategory.PROJECT,
                DataCategory.SENSITIVE_DATA,
                DataCategory.FREE_TEXT,
            }
        ),
        character_count_override=len(pdf_bytes),
    )
    api_key = _get_api_key()
    client = AsyncLlamaCloud(api_key=api_key)

    # Write bytes to a temp file (SDK requires a file path)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        logger.info("📤 Uploading %s to LlamaCloud for parsing...", filename)
        try:
            with tmp_path.open("rb") as f:
                result = await client.parsing.parse(
                    upload_file=(filename, f, "application/pdf"),
                    tier="cost_effective",
                    version="latest",
                    expand=["markdown"],
                )
            markdown_content = str(result.markdown) if result.markdown else ""
            if any(
                finding.category == DataCategory.TECHNICAL_SECRET
                for finding in scan_sensitive_text(markdown_content)
            ):
                raise PseudonymizationError("privacy.response.secret_detected")
        except PseudonymizationError:
            gateway.audit_sink(prepared.manifest, "error")
            raise
        except Exception:
            gateway.audit_sink(prepared.manifest, "error")
            raise OutboundProviderError(
                "llama_cloud",
                PrivacyTask.CV_PARSE,
            ) from None
        gateway.audit_sink(prepared.manifest, "success")
        logger.info("LlamaCloud parsing complete (%d chars).", len(markdown_content))
    finally:
        prepared.close()
        tmp_path.unlink(missing_ok=True)

    return markdown_content


async def pdf_to_markdown_local_text(pdf_bytes: bytes, filename: str = "cv.pdf") -> str:
    """Extract text locally from a PDF and reshape it as plain Markdown."""
    try:
        import pdfplumber  # noqa: PLC0415
    except ModuleNotFoundError as exc:  # pragma: no cover - packaging guardrail
        raise RuntimeError(
            "Local PDF parsing requires the 'pdfplumber' dependency."
        ) from exc

    logger.info("📄 Extracting %s locally with pdfplumber...", filename)
    pages: list[str] = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = (page.extract_text() or "").strip()
            if text:
                pages.append(text)

    markdown_content = "\n\n".join(pages).strip()
    if not markdown_content:
        raise ValueError("Local PDF parsing produced no extractable text.")
    logger.info("Local PDF parsing complete (%d chars).", len(markdown_content))
    return markdown_content


def _resolve_ingestion_mode(
    ingestion_mode: PDFIngestionMode,
) -> Literal["llama_parse", "local_text"]:
    if ingestion_mode == "llama_parse":
        return "llama_parse"
    if ingestion_mode == "local_text":
        return "local_text"
    api_key = (
        resolve_secret_slot("llama_cloud_api_key", settings.llama_cloud_api_key) or ""
    )
    return "llama_parse" if api_key else "local_text"


# ── Markdown → Structured CV JSON ────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert CV parser. Extract structured information from a CV in Markdown format.

Return a **JSON object** with EXACTLY this structure (Mindris AI schema v2):
{
  "global_settings": {
    "font_family": "Inter",
    "font_size": "11pt",
    "primary_color": "#2563eb"
  },
  "profile": {
    "full_name": "string",
    "title": "string (current role or headline)",
    "phone": "string",
    "email": "string",
    "location": { "city": "string", "country": "string" },
    "socials": [
      { "type": "linkedin|github|website|other", "url": "string", "label": "string or omit" }
    ],
    "text_markdown": "string (2-4 sentence professional summary)"
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "string",
      "role": "string (job title)",
      "period": "string (e.g. '2022 - Present' or 'Jan 2022 - Dec 2023')",
      "location": { "city": "string", "country": "string" },
      "description_markdown": "string (bullet points or paragraph, markdown ok)",
      "keywords": ["string"]
    }
  ],
  "education": [
    {
      "id": "ed-1",
      "institution": "string",
      "degree": "string",
      "period": "string (e.g. '2020 - 2024')",
      "location": "string (city, country)",
      "description_markdown": "string"
    }
  ],
  "skills": [
    {
      "id": "sk-1",
      "category": "string (e.g. 'Backend', 'AI/ML', 'Frontend')",
      "skills": ["string"]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "string",
      "url": "string or empty",
      "description_markdown": "string",
      "tech_stack": ["string"]
    }
  ],
  "languages": [
    { "id": "lang-1", "language": "string", "level": "string (e.g. Natif, C1, B2)" }
  ],
  "hobbies": ["string"]
}

Rules:
- IDs must be unique strings: exp-1, exp-2, ed-1, sk-1, proj-1, lang-1, etc.
- If a field is missing, use empty string "" or empty array [].
- Do NOT invent data. Use only what is explicitly in the CV.
- Return ONLY the JSON object — no markdown fences, no explanation.
"""


def markdown_to_cv_json(
    markdown: str,
    provider: str = "groq",
    model_name: str = "llama-3.3-70b-versatile",
) -> dict:
    """Use an LLM to extract structured CV data from Markdown text.

    Args:
        markdown: CV content as Markdown from LlamaParse.
        provider: LLM provider (groq, gemini, etc.).
        model_name: Model to use for structuring.

    Returns:
        Structured CV dictionary conforming to the Mindris schema.
    """
    import litellm  # noqa: PLC0415

    full_model = f"{provider}/{model_name}"
    logger.info("🤖 Structuring CV with %s...", full_model)
    gateway = outbound_gateway()
    prepared = gateway.prepare(
        provider=provider,
        model=model_name,
        task=PrivacyTask.CV_PARSE,
        payload={"profile": {"text_markdown": markdown}},
    )
    filtered_markdown = (
        prepared.payload.get("profile", {}).get("text_markdown", "")
        if isinstance(prepared.payload, dict)
        else ""
    )
    protected_cv_block = structured_untrusted_data(
        "cv",
        filtered_markdown,
        limit=prepared.manifest.character_count,
    )
    try:
        response = litellm.completion(
            model=full_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Parse the structured untrusted CV block below and return "
                        f"the requested JSON.\n\n{protected_cv_block}"
                    ),
                },
            ],
            temperature=0.0,
        )
        protected_text = response.choices[0].message.content.strip()
        validate_provider_response(protected_text)
        raw_text = prepared.pseudonymizer.rehydrate(protected_text)
    except PseudonymizationError:
        gateway.audit_sink(prepared.manifest, "error")
        raise
    except Exception:
        gateway.audit_sink(prepared.manifest, "error")
        raise OutboundProviderError(provider, PrivacyTask.CV_PARSE) from None
    else:
        gateway.audit_sink(prepared.manifest, "success")
    finally:
        prepared.close()

    # Strip potential markdown code fences (```json ... ```)
    raw_text = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text)
    raw_text = re.sub(r"\n?```$", "", raw_text)
    raw_text = raw_text.strip()

    return json.loads(raw_text)


# ── Main Convenience Function ─────────────────────────────────────────────────


async def parse_pdf_cv(
    pdf_bytes: bytes,
    filename: str = "cv.pdf",
    provider: str = "groq",
    model_name: str = "llama-3.3-70b-versatile",
    ingestion_mode: PDFIngestionMode = "auto",
) -> dict:
    """Full pipeline: PDF bytes → Markdown → Structured CV JSON.

    Args:
        pdf_bytes: Raw PDF file bytes.
        filename: Original filename for LlamaCloud hint.
        provider: LLM provider for structuring.
        model_name: LLM model name for structuring.
        ingestion_mode: Preferred extraction path: local, LlamaParse, or auto.

    Returns:
        Structured CV dictionary ready for ChromaDB ingestion.
    """
    logger.info("📄 Starting PDF parsing pipeline...")
    resolved_mode = _resolve_ingestion_mode(ingestion_mode)
    logger.info(
        "PDF ingestion mode requested=%s resolved=%s", ingestion_mode, resolved_mode
    )
    try:
        if resolved_mode == "llama_parse":
            markdown = await pdf_to_markdown_llama_parse(pdf_bytes, filename=filename)
        else:
            markdown = await pdf_to_markdown_local_text(pdf_bytes, filename=filename)
    except Exception:
        if ingestion_mode == "auto" and resolved_mode == "llama_parse":
            logger.warning(
                "LlamaParse path failed in auto mode; falling back to local_text",
                exc_info=True,
            )
            markdown = await pdf_to_markdown_local_text(pdf_bytes, filename=filename)
        else:
            raise

    cv_json = markdown_to_cv_json(markdown, provider=provider, model_name=model_name)

    logger.info("✅ PDF CV successfully parsed and structured.")
    return cv_json
