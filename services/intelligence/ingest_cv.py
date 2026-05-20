"""Ingestion script for Mindris AI.

Reads the Master CV profile (JSON/Markdown) and embeds it into ChromaDB
using local Hugging Face embeddings (sentence-transformers).
"""

import json
import logging
from pathlib import Path

from database.vector_store import MindrisVectorStore
from utils.config import settings

logger = logging.getLogger(__name__)


def chunk_cv_data(cv_data: dict) -> list[dict]:
    """Break down the CV JSON into embeddable chunks.

    Supports the Mindris AI schema v2 (cv_schema.json).
    Returns a list of dicts, each with 'text' and 'metadata'.
    """
    chunks = []

    # 1. Profile Summary
    profile = cv_data.get("profile", {})
    if isinstance(profile, dict):
        name = profile.get("full_name", "")
        title = profile.get("title", "")
        summary = profile.get("text_markdown", "")
        text = f"Profile: {name} — {title}.\n{summary}".strip()
        if text:
            chunks.append({
                "text": text,
                "metadata": {"type": "profile", "name": name},
            })
    elif isinstance(profile, str) and profile:
        # Legacy fallback: profile was a plain string
        chunks.append({
            "text": f"Profile Summary: {profile}",
            "metadata": {"type": "summary", "category": "profile"},
        })

    # 2. Work Experience
    for exp in cv_data.get("experience", []):
        role = exp.get("role") or exp.get("title", "")  # support both schemas
        period = exp.get("period") or (
            f"{exp.get('start_date', '')} - {exp.get('end_date', '')}".strip(" -")
        )
        description = exp.get("description_markdown") or exp.get("description", "")
        keywords = exp.get("keywords") or exp.get("achievements", [])

        text = (
            f"Experience: {role} at {exp.get('company', '')} ({period}).\n"
            f"{description}"
        )
        if keywords:
            text += f"\nKeywords: {', '.join(keywords)}"

        chunks.append({
            "text": text,
            "metadata": {
                "type": "experience",
                "company": exp.get("company", ""),
                "role": role,
            },
        })

    # 3. Education
    for edu in cv_data.get("education", []):
        period = edu.get("period") or (
            f"{edu.get('start_date', '')} - {edu.get('end_date', '')}".strip(" -")
        )
        text = (
            f"Education: {edu.get('degree', '')} at {edu.get('institution', '')} "
            f"({period}). {edu.get('location', '')}. {edu.get('description_markdown', '')}"
        ).strip()
        chunks.append({
            "text": text,
            "metadata": {
                "type": "education",
                "institution": edu.get("institution", ""),
            },
        })

    # 4. Skills
    for skill_cat in cv_data.get("skills", []):
        # new schema: skills[], old schema: items[]
        skill_list = skill_cat.get("skills") or skill_cat.get("items", [])
        text = f"Skills — {skill_cat.get('category', '')}: {', '.join(skill_list)}"
        chunks.append({
            "text": text,
            "metadata": {
                "type": "skills",
                "category": skill_cat.get("category", ""),
            },
        })

    # 5. Projects
    for proj in cv_data.get("projects", []):
        tech = ", ".join(proj.get("tech_stack", []))
        text = (
            f"Project: {proj.get('name', '')}. "
            f"{proj.get('description_markdown', '')} "
            f"Tech: {tech}"
        ).strip()
        chunks.append({
            "text": text,
            "metadata": {"type": "project", "name": proj.get("name", "")},
        })

    # 6. Languages
    lang_texts = [
        f"{l.get('language', '')} ({l.get('level', '')})"
        for l in cv_data.get("languages", [])
    ]
    if lang_texts:
        chunks.append({
            "text": f"Languages: {', '.join(lang_texts)}",
            "metadata": {"type": "languages"},
        })

    return chunks



def ingest_cv_data(cv_data: dict) -> None:
    """Chunk and index a CV dictionary into ChromaDB.

    Args:
        cv_data: The CV data dictionary.
    """
    logger.info("🚀 Initializing Vector Store...")
    # Will connect to storage/vectordb and use HuggingFace embeddings
    store = MindrisVectorStore(collection_name="mindris_master_profile")

    logger.info("✂️  Chunking CV data...")
    chunks = chunk_cv_data(cv_data)

    texts = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    logger.info("🧠 Generating embeddings for %d chunks and saving to ChromaDB...", len(chunks))

    # Clear existing vectors to avoid duplicates / dead data
    store.clear()

    if texts:
        store.add_texts(texts=texts, metadatas=metadatas)
        logger.info("✅ Ingestion complete! Master Profile is ready for RAG.")
    else:
        logger.warning("⚠️ No data to ingest.")


def ingest_master_cv(cv_json_path: str) -> None:
    """Load, chunk, and index the master CV into ChromaDB.

    Args:
        cv_json_path: Path to the Master CV JSON file.
    """
    logger.info("📖 Reading Master CV from %s...", cv_json_path)
    path = Path(cv_json_path)
    if not path.exists():
        logger.error("❌ File not found: %s", path)
        return

    with path.open(encoding="utf-8") as f:
        cv_data = json.load(f)

    ingest_cv_data(cv_data)


if __name__ == "__main__":
    # Create a dummy CV for testing if it doesn't exist
    dummy_cv_path = settings.storage_dir / "master_cv.json"
    if not dummy_cv_path.exists():
        logger.warning("⚠️ No master_cv.json found. Creating a sample one in storage/...")
        sample_data = {
            "profile": "Data Analyst and AI Engineer passionate about building smart systems.",
            "experience": [
                {
                    "title": "Data Analyst F/H",
                    "company": "AXA",
                    "start_date": "2023",
                    "end_date": "Present",
                    "description": "Analyzed large datasets to improve insurance models.",
                    "achievements": ["Increased model accuracy by 15%", "Automated daily reporting in Python"]
                }
            ],
            "education": [
                {
                    "degree": "Master",
                    "field": "Data Science",
                    "institution": "University of Paris",
                    "start_date": "2021",
                    "end_date": "2023"
                }
            ],
            "skills": [
                {
                    "category": "Data",
                    "items": ["Python", "SQL", "Power BI", "R", "Machine Learning"]
                }
            ]
        }
        with dummy_cv_path.open("w", encoding="utf-8") as f:
            json.dump(sample_data, f, indent=2)

    ingest_master_cv(str(dummy_cv_path))
