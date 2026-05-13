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
        print(f"📤 Uploading {filename} to LlamaCloud for parsing...")
        with tmp_path.open("rb") as f:
            result = await client.parsing.parse(
                upload_file=(filename, f, "application/pdf"),
                tier="cost_effective",
                version="latest",
                expand=["markdown"],  # Request only markdown output
            )

        markdown_content = str(result.markdown) if result.markdown else ""
        print(f"LlamaCloud parsing complete ({len(markdown_content)} chars).")
    finally:
        tmp_path.unlink(missing_ok=True)

    return markdown_content


# ── Markdown → Structured CV JSON ────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert CV parser. Your task is to extract structured information \
from a CV in Markdown format.

Return a **JSON object** with **exactly** this structure:
{
  "profile_name": "string (full name)",
  "profile_title": "string (current role / headline)",
  "profile_summary": "string (1-2 sentence summary)",
  "experience": [
    {
      "id": "exp-1",
      "title": "string (job title)",
      "company": "string (company name)",
      "start_date": "string (e.g. '2022' or 'Jan 2022')",
      "end_date": "string (e.g. 'Present' or '2024')",
      "description": "string (1-2 sentence description)",
      "achievements": ["string", "string"]
    }
  ],
  "skills": [
    {
      "id": "sk-1",
      "category": "string (e.g. 'Languages', 'Frameworks', 'Tools')",
      "items": ["string", "string"]
    }
  ],
  "education": [
    {
      "id": "ed-1",
      "degree": "string (e.g. 'Master in Data Science')",
      "institution": "string",
      "start_date": "string",
      "end_date": "string"
    }
  ],
  "profile": "string (one paragraph summary combining name, title, and background)"
}

Rules:
- id fields must be unique: exp-1, exp-2... sk-1, sk-2... ed-1, ed-2...
- If any field is missing in the CV, return an empty string or empty array.
- Do NOT invent data. Only use what is explicitly in the CV.
- Return ONLY the JSON object, no explanation, no markdown code block.
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
    print(f"🤖 Structuring CV with {full_model}...")

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
    print("📄 Starting PDF parsing pipeline...")
    markdown = await pdf_to_markdown(pdf_bytes, filename=filename)

    cv_json = markdown_to_cv_json(markdown, provider=provider, model_name=model_name)

    print("✅ PDF CV successfully parsed and structured.")
    return cv_json
