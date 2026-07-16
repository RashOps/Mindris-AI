"""LLM run persistence tests."""

from conftest import client
from database.session import SessionLocal
from llm_runs import save_llm_run, stable_input_hash


def test_save_llm_run_persists_trace_without_raw_prompt() -> None:
    client()
    payload = {"job_id": 12, "prompt": "private prompt body"}
    expected_hash = stable_input_hash(payload)

    with SessionLocal() as session:
        record = save_llm_run(
            session,
            task_key="ats_score",
            provider="groq",
            model_name="llama-3.1-8b-instant",
            input_payload=payload,
            output_artifact_type="ats_report",
            output_artifact_id=34,
            duration_ms=1200,
            metadata={"mode": "strict"},
        )

    assert record.id is not None
    assert record.input_hash == expected_hash
    assert record.output_artifact_type == "ats_report"
    assert record.output_artifact_id == 34
    assert record.metadata_json == '{"mode": "strict"}'
    assert "private prompt body" not in record.metadata_json
