import os
import uuid
import pypdf
import chromadb
from fastembed import TextEmbedding

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
COLLECTION_NAME = "documents"
EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"  # lightweight, fast, good quality

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

from typing import Optional
_embed_model: Optional[TextEmbedding] = None
_chroma_client = None
_collection = None


def get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = TextEmbedding(EMBED_MODEL_NAME)
    return _embed_model

def get_collection():
    """Return (or create) the ChromaDB collection."""
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},   # cosine similarity for semantic search
        )
    return _collection


# ── Core helpers ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Read raw bytes of a PDF and return all page text concatenated.
    pypdf is used page-by-page so large files don't blow up memory.
    """
    import io
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:                          # skip empty / image-only pages
            pages.append(text.strip())
    return "\n\n".join(pages)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split *text* into overlapping windows.

    Example with chunk_size=10, overlap=3 and text="abcdefghijklmnop":
        ["abcdefghij", "hijklmnop"]
    The overlap keeps context that would otherwise be severed at a boundary.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap      # step back by `overlap` chars each time
    return [c.strip() for c in chunks if c.strip()]


def ingest_pdf(file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
      1. Extract text from PDF
      2. Split into overlapping chunks
      3. Embed each chunk with Sentence Transformers
      4. Upsert into ChromaDB

    Returns a summary dict suitable for an API response.
    """
    # ── 1. Extract ────────────────────────────────────────────────────────────
    full_text = extract_text_from_pdf(file_bytes)
    if not full_text:
        raise ValueError(f"No extractable text found in '{filename}'. "
                         "The PDF may be scanned or image-only.")

    # ── 2. Chunk ──────────────────────────────────────────────────────────────
    chunks = chunk_text(full_text)

    # ── 3. Embed ──────────────────────────────────────────────────────────────
    model = get_embed_model()
    embeddings = list(model.embed(chunks))
    embeddings = [e.tolist() for e in embeddings]
    # .tolist() converts numpy arrays → plain Python lists (JSON-serialisable)

    # ── 4. Store ──────────────────────────────────────────────────────────────
    collection = get_collection()

    # Build a stable namespace so re-uploading the same file overwrites old chunks.
    # uuid5 is deterministic: same filename → same namespace prefix.
    namespace = str(uuid.uuid5(uuid.NAMESPACE_DNS, filename))
    ids = [f"{namespace}_chunk_{i}" for i in range(len(chunks))]

    metadatas = [
        {"source": filename, "chunk_index": i}
        for i in range(len(chunks))
    ]

    # upsert = insert if new, update if ID already exists
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    return {
        "filename": filename,
        "total_characters": len(full_text),
        "total_chunks": len(chunks),
        "chunk_size": CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "embed_model": EMBED_MODEL_NAME,
    }