"""SSE event bus for the LangGraph pipeline.

Each pipeline run gets its own asyncio.Queue identified by job_id.
Nodes push events into the queue; the SSE route drains it.

Queue lifecycle
---------------
Queues are created via :func:`create_job_queue` and automatically
removed when the stream terminates (done/error/timeout).  A TTL-based
cleanup helper :func:`cleanup_stale_queues` can be called periodically
(e.g. from the FastAPI lifespan) to evict orphaned queues.
"""

import asyncio
import time
from collections.abc import AsyncGenerator

from utils.logger import get_logger

logger = get_logger(__name__, service_name="intelligence")

# ── Internal registry ─────────────────────────────────────────────────────────

# job_id → asyncio.Queue of SSE event dicts
_queues: dict[str, asyncio.Queue] = {}

# job_id → creation timestamp (Unix epoch seconds)
_queue_created_at: dict[str, float] = {}

# Queues older than this TTL are considered orphaned and safe to evict
QUEUE_TTL_SECONDS: float = 600.0  # 10 minutes


# ── Public API ────────────────────────────────────────────────────────────────


def create_job_queue(job_id: str) -> asyncio.Queue:
    """Create and register a new SSE event queue for a pipeline run.

    Args:
        job_id: Unique identifier for the pipeline run.

    Returns:
        A fresh :class:`asyncio.Queue` bound to *job_id*.
    """
    q: asyncio.Queue = asyncio.Queue()
    _queues[job_id] = q
    _queue_created_at[job_id] = time.monotonic()
    logger.debug("Queue created for job %s", job_id)
    return q


def get_job_queue(job_id: str) -> asyncio.Queue | None:
    """Return the queue for *job_id*, or ``None`` if it doesn't exist.

    Args:
        job_id: Unique identifier for the pipeline run.

    Returns:
        The registered :class:`asyncio.Queue`, or ``None``.
    """
    return _queues.get(job_id)


def remove_job_queue(job_id: str) -> None:
    """Remove the queue for *job_id* from the registry.

    Args:
        job_id: Unique identifier for the pipeline run.
    """
    _queues.pop(job_id, None)
    _queue_created_at.pop(job_id, None)
    logger.debug("Queue removed for job %s", job_id)


def emit(job_id: str, event: str, data: dict) -> None:
    """Push an event into the job's SSE queue (sync-safe, called from workflow nodes).

    Silently drops the event if the queue is full to avoid blocking nodes.

    Args:
        job_id: Unique identifier for the pipeline run.
        event:  SSE event type (e.g. ``"node_start"``, ``"done"``).
        data:   Payload dictionary serialised as SSE data.
    """
    q = _queues.get(job_id)
    if q:
        try:
            q.put_nowait({"event": event, "data": data})
        except asyncio.QueueFull:
            logger.warning("Queue full for job %s — dropping event '%s'", job_id, event)


async def stream_events(
    job_id: str, timeout: float = 300.0
) -> AsyncGenerator[dict, None]:
    """Async generator that yields SSE dicts until the pipeline finishes or times out.

    Sends a ``ping`` heartbeat every 30 seconds of inactivity to keep the
    connection alive through proxies and load balancers.

    Args:
        job_id:  Unique identifier for the pipeline run.
        timeout: Maximum number of seconds to wait for the pipeline to finish.

    Yields:
        SSE event dicts with ``"event"`` and ``"data"`` keys.
    """
    q = get_job_queue(job_id)
    if q is None:
        logger.warning("stream_events called for unknown job %s", job_id)
        yield {"event": "error", "data": {"message": f"Job {job_id} not found."}}
        return

    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout

    while True:
        remaining = deadline - loop.time()
        if remaining <= 0:
            logger.warning("Pipeline timeout for job %s", job_id)
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


def cleanup_stale_queues() -> int:
    """Evict queues that have exceeded :data:`QUEUE_TTL_SECONDS`.

    Intended to be called periodically from the FastAPI lifespan or a
    background task to prevent memory leaks in long-running processes.

    Returns:
        Number of stale queues removed.
    """
    now = time.monotonic()
    stale = [
        jid for jid, ts in _queue_created_at.items() if now - ts > QUEUE_TTL_SECONDS
    ]
    for jid in stale:
        remove_job_queue(jid)

    if stale:
        logger.info("Cleaned up %d stale SSE queue(s): %s", len(stale), stale)

    return len(stale)
