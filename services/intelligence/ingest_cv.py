"""Ingestion script for Mindris AI.

Reads the Master CV profile (JSON/Markdown) and embeds it into ChromaDB
using local Hugging Face embeddings (sentence-transformers).
"""

import json
from pathlib import Path

from database.vector_store import MindrisVectorStore
from utils.config import settings


def chunk_cv_data(cv_data: dict) -> list[dict]:
    """Break down the CV JSON into embeddable chunks.

    Returns a list of dicts, each with 'text' and 'metadata'.
    """
    chunks = []

    # 1. Profile Summary
    if "profile" in cv_data:
        chunks.append({
            "text": f"Profile Summary: {cv_data['profile']}",
            "metadata": {"type": "summary", "category": "profile"},
        })

    # 2. Work Experience
    for exp in cv_data.get("experience", []):
        text = (
            f"Experience: {exp.get('title')} at {exp.get('company')} "
            f"({exp.get('start_date')} to {exp.get('end_date')}).\n"
            f"Description: {exp.get('description')}\n"
        )
        if exp.get("achievements"):
            text += f"Achievements: {', '.join(exp['achievements'])}"

        chunks.append({
            "text": text,
            "metadata": {
                "type": "experience",
                "company": exp.get("company"),
                "role": exp.get("title"),
            },
        })

    # 3. Education
    for edu in cv_data.get("education", []):
        text = (
            f"Education: {edu.get('degree')} in {edu.get('field')} "
            f"at {edu.get('institution')} ({edu.get('start_date')} to {edu.get('end_date')})."
        )
        chunks.append({
            "text": text,
            "metadata": {
                "type": "education",
                "institution": edu.get("institution"),
            },
        })

    # 4. Skills
    for skill_cat in cv_data.get("skills", []):
        text = f"Skills in {skill_cat.get('category')}: {', '.join(skill_cat.get('items', []))}"
        chunks.append({
            "text": text,
            "metadata": {
                "type": "skills",
                "category": skill_cat.get("category"),
            },
        })

    return chunks


def ingest_master_cv(cv_json_path: str) -> None:
    """Load, chunk, and index the master CV into ChromaDB.

    Args:
        cv_json_path: Path to the Master CV JSON file.
    """
    print("🚀 Initializing Vector Store...")
    # Will connect to storage/vectordb and use HuggingFace embeddings
    store = MindrisVectorStore(collection_name="mindris_master_profile")

    print(f"📖 Reading Master CV from {cv_json_path}...")
    path = Path(cv_json_path)
    if not path.exists():
        print(f"❌ File not found: {path}")
        return

    with path.open(encoding="utf-8") as f:
        cv_data = json.load(f)

    print("✂️  Chunking CV data...")
    chunks = chunk_cv_data(cv_data)

    texts = [c["text"] for c in chunks]
    metadatas = [c["metadata"] for c in chunks]

    print(f"🧠 Generating embeddings for {len(chunks)} chunks and saving to ChromaDB...")

    # We clear first to avoid duplicates if re-running
    store.clear()

    store.add_texts(texts=texts, metadatas=metadatas)

    print("✅ Ingestion complete! Master Profile is ready for RAG.")


if __name__ == "__main__":
    # Create a dummy CV for testing if it doesn't exist
    dummy_cv_path = settings.storage_dir / "master_cv.json"
    if not dummy_cv_path.exists():
        print("⚠️ No master_cv.json found. Creating a sample one in storage/...")
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
