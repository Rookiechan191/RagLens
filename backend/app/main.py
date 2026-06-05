import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.ingest import ingest_pdf
from app.llm import stream_answer

app = FastAPI(title="RAG Document Q&A")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Adjust allow_origins in production to your actual Vercel URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://rag-lens-ivory.vercel.app", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accept a PDF, run the full ingest pipeline, return a summary.
    UploadFile streams the bytes so large files don't sit in memory as strings.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        file_bytes = await file.read()
        result = ingest_pdf(file_bytes, file.filename)
        return {"message": "Ingested successfully.", **result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3


@app.post("/query")
def query(req: QueryRequest):
    """
    Embed the question, retrieve top-k chunks, stream GPT-4o-mini's answer.

    StreamingResponse + a generator = tokens reach the browser immediately.
    The frontend reads them with fetch() + ReadableStream (or axios onDownloadProgress).
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    try:
        return StreamingResponse(
            stream_answer(req.question, top_k=req.top_k),
            media_type="text/plain",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")