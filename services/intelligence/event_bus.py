"""SSE event bus for the LangGraph pipeline.

Each pipeline run gets its own asyncio.Queue identified by job_id.
Nodes push events into the queue; the SSE route drains it.
"""

import asyncio
from collections.abc import AsyncGenerator

# job_id → asyncio.Queue of SSE event dicts
_queues: dict[str, asyncio.Queue] = {}


def create_job_queue(job_id: str) -> asyncio.Queue:
    """Create and register a new queue for a job run."""
    q: asyncio.Queue = asyncio.Queue()
    _queues[job_id] = q
    return q


def get_job_queue(job_id: str) -> asyncio.Queue | None:
    return _queues.get(job_id)


def remove_job_queue(job_id: str) -> None:
    _queues.pop(job_id, None)


def emit(job_id: str, event: str, data: dict) -> None:
    """Push an event into the job's queue (sync-safe, called from workflow nodes)."""
    q = _queues.get(job_id)
    if q:
        try:
            q.put_nowait({"event": event, "data": data})
        except asyncio.QueueFull:
            pass  # Drop if consumer is too slow


async def stream_events(job_id: str, timeout: float = 300.0) -> AsyncGenerator[dict, None]:
    """Async generator that yields SSE dicts until the pipeline sends 'done' or times out."""
    q = get_job_queue(job_id)
    if q is None:
        yield {"event": "error", "data": {"message": f"Job {job_id} not found."}}
        return

    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            yield {"event": "error", "data": {"message": "Pipeline timeout."}}
            break
        try:
            item = await asyncio.wait_for(q.get(), timeout=min(remaining, 30.0))
            yield item
            if item.get("event") in ("done", "error"):
                break
        except TimeoutError:
            # Send a heartbeat to keep the connection alive
            yield {"event": "ping", "data": {}}

    remove_job_queue(job_id)
