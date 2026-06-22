"""PDF parsing service using the official llama-cloud SDK.

This module handles PDF CV ingestion:
1. Upload PDF to LlamaParse API (llama-cloud) → returns clean Markdown.
2. Use a structured LiteLLM call (Groq) to extract structured JSON from Markdown.
3. Return a dict conforming to the Mindris CV schema.
"""

import json
import re
import tempfile
from pathlib import Path

from llama_cloud import AsyncLlamaCloud
from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


# ── LlamaParse Configuration ──────────────────────────────────────────────────

def _get_api_key() -> str:
    """Get the LlamaCloud API key from settings."""
    api_key = (
        settings.llama_cloud_api_key.get_secret_value()
        if settings.llama_cloud_api_key else None
    )
    if not api_key:
        raise ValueError(
            "LLAMA_CLOUD_API_KEY is not set. "
            "Get a free key at https://cloud.llamaindex.ai"
        )
    return api_key


# ── PDF → Markdown ─────────────────────────────────────────────────────────────

async def pdf_to_markdown(pdf_bytes: bytes, filename: str = "cv.pdf") -> str:
    """Parse a PDF file bytes to Markdown using the LlamaCloud parsing API.

    Args:
        pdf_bytes: Raw bytes of the PDF file.
        filename: Original filename (used as hint).

    Returns:
        The parsed content as Markdown.
    """
    api_key = _get_api_key()
    client = AsyncLlamaCloud(api_key=api_key)

    # Write bytes to a temp file (SDK requires a file path)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        logger.info("📤 Uploading %s to LlamaCloud for parsing...", filename)
        with tmp_path.open("rb") as f:
            result = await client.parsing.parse(
                upload_file=(filename, f, "application/pdf"),
                tier="cost_effective",
                version="latest",
                expand=["markdown"],  # Request only markdown output
            )

        markdown_content = str(result.markdown) if result.markdown else ""
        logger.info("LlamaCloud parsing complete (%d chars).", len(markdown_content))
    finally:
        tmp_path.unlink(missing_ok=True)

    return markdown_content


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

    response = litellm.completion(
        model=full_model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Parse this CV and return the structured JSON:\n\n{markdown}"
                ),
            },
        ],
        temperature=0.0,  # Deterministic output for parsing
    )

    raw_text = response.choices[0].message.content.strip()

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
) -> dict:
    """Full pipeline: PDF bytes → Markdown → Structured CV JSON.

    Args:
        pdf_bytes: Raw PDF file bytes.
        filename: Original filename for LlamaCloud hint.
        provider: LLM provider for structuring.
        model_name: LLM model name for structuring.

    Returns:
        Structured CV dictionary ready for ChromaDB ingestion.
    """
    logger.info("📄 Starting PDF parsing pipeline...")
    markdown = await pdf_to_markdown(pdf_bytes, filename=filename)

    cv_json = markdown_to_cv_json(markdown, provider=provider, model_name=model_name)

    logger.info("✅ PDF CV successfully parsed and structured.")
    return cv_json
