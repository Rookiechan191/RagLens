# ── Stage 1: builder ─────────────────────────────────────────────────────────
# Separate build stage keeps the final image lean by not shipping pip cache
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build deps (chromadb needs gcc for hnswlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/

# ChromaDB persists to this directory inside the container.
# Mount a volume here in production (Azure Files share / persistent storage)
# so embeddings survive container restarts.
RUN mkdir -p chroma_db

# Azure Container Apps injects PORT env var; default to 8000 locally
ENV PORT=8000

EXPOSE ${PORT}

# Run with uvicorn. --host 0.0.0.0 is required inside containers.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]