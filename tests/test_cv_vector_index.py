"""Tests for resume-scoped vector ingestion."""

from intelligence import ingest_cv


def test_ingestion_replaces_only_the_selected_resume_locale(monkeypatch) -> None:
    calls: dict[str, object] = {}

    class FakeStore:
        def __init__(self, collection_name: str) -> None:
            calls["collection"] = collection_name

        def delete_where(self, filter_dict: dict) -> None:
            calls["filter"] = filter_dict

        def add_texts(self, *, texts: list[str], metadatas: list[dict]) -> None:
            calls["texts"] = texts
            calls["metadatas"] = metadatas

    monkeypatch.setattr(ingest_cv, "MindrisVectorStore", FakeStore)

    ingest_cv.ingest_cv_data(
        {
            "global_settings": {"locale": {"label_language": "en"}},
            "profile": {"full_name": "Ada Lovelace", "title": "Engineer"},
            "skills": [{"category": "Backend", "skills": ["Python"]}],
        },
        resume_id=42,
        locale="en",
    )

    assert calls["filter"] == {
        "$and": [
            {"resume_id": {"$eq": "42"}},
            {"locale": {"$eq": "en"}},
        ]
    }
    metadatas = calls["metadatas"]
    assert isinstance(metadatas, list)
    assert metadatas
    assert all(item["resume_id"] == "42" for item in metadatas)
    assert all(item["locale"] == "en" for item in metadatas)
