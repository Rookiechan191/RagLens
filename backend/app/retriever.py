from app.ingest import get_embed_model, get_collection

# How many chunks to pull back for each question.
# 3 is a good default: enough context, short enough to stay under token limits.
TOP_K = 3


def retrieve(query: str, top_k: int = TOP_K) -> list[dict]:
    """
    Semantic search over the ChromaDB collection.

    Steps:
      1. Embed the query with the same Sentence Transformer used at ingest time.
         Using a *different* model here would produce incompatible vector spaces
         and return garbage results.
      2. Ask ChromaDB for the `top_k` nearest neighbours by cosine distance.
      3. Repack the parallel arrays ChromaDB returns into a clean list of dicts.

    Returns a list like:
        [
          {"text": "...", "source": "report.pdf", "chunk_index": 4, "distance": 0.12},
          ...
        ]
    Distance is cosine distance (0 = identical, 2 = opposite).
    Lower distance → more relevant chunk.
    """
    if not query.strip():
        raise ValueError("Query must not be empty.")

    # ── 1. Embed the question ─────────────────────────────────────────────────
    model = get_embed_model()
    query_embedding = [list(model.embed([query]))[0].tolist()]
    # ChromaDB expects a list-of-lists, hence the outer list even for one query.

    # ── 2. Query ChromaDB ─────────────────────────────────────────────────────
    collection = get_collection()

    # Guard: if the collection is empty there's nothing to search
    if collection.count() == 0:
        raise RuntimeError("No documents have been ingested yet. "
                           "Please upload a PDF before asking questions.")

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),  # can't ask for more than we have
        include=["documents", "metadatas", "distances"],
    )
    # results is a dict of parallel lists-of-lists, one inner list per query.
    # Since we always send exactly one query, we unwrap index [0] everywhere.

    # ── 3. Repack into usable dicts ───────────────────────────────────────────
    chunks = []
    for text, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append(
            {
                "text": text,
                "source": meta.get("source", "unknown"),
                "chunk_index": meta.get("chunk_index", -1),
                "distance": round(dist, 4),
            }
        )

    # Already sorted by distance ascending (most relevant first) by ChromaDB
    return chunks


def format_context(chunks: list[dict]) -> str:
    """
    Turn the retrieved chunks into a single context string for the LLM prompt.

    Each chunk is labelled with its source file and chunk index so the model
    can (optionally) cite where information came from.

    Example output:
        [Source: report.pdf | Chunk 4]
        "...text of chunk..."

        [Source: report.pdf | Chunk 7]
        "...text of chunk..."
    """
    parts = []
    for chunk in chunks:
        header = f"[Source: {chunk['source']} | Chunk {chunk['chunk_index']}]"
        parts.append(f"{header}\n{chunk['text']}")
    return "\n\n".join(parts)