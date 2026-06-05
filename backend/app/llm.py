import os
from groq import Groq
from app.retriever import retrieve, format_context
from typing import Iterator

_client = None

def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly \
based on the provided document context. If the answer is not contained in the \
context, say "I don't have enough information in the uploaded document to answer \
that." Do not make up information."""


def stream_answer(query: str, top_k: int = 3) -> Iterator[str]:
    chunks = retrieve(query, top_k=top_k)
    context = format_context(chunks)

    user_message = f"""Answer the following question using only the context below.

CONTEXT:
{context}

QUESTION:
{query}"""

    client = get_client()
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=800,
        stream=True,
    )

    for chunk in response:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            yield delta.content