FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
COPY packages ./packages
COPY services ./services
COPY run_pipeline.py ./run_pipeline.py
RUN uv sync --all-packages --no-dev

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
WORKDIR /app/services/api-gateway
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
