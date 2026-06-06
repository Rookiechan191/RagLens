# RagLens

A RAG-based document Q&A system. Upload a PDF, ask questions, get answers grounded in the document — with full conversation memory across turns.

**Live demo:** https://rag-lens-ivory.vercel.app

---

## What it does

- Upload any PDF
- Ask questions in natural language
- Answers are retrieved from the document, not hallucinated
- Multi-turn conversation — follow-up questions use prior context

---

## Architecture

```
PDF Upload
    │
    ▼
Text Extraction (pypdf)
    │
    ▼
Chunking (500 chars, 50 overlap)
    │
    ▼
Embedding (fastembed · BAAI/bge-small-en-v1.5)
    │
    ▼
Vector Store (ChromaDB · cosine similarity)
    │
    ▼
Query → Semantic Retrieval (top-3 chunks)
    │
    ▼
LLM (Groq · llama-3.1-8b-instant) → Streamed Response
```

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, Python 3.11 |
| Embeddings | fastembed (BAAI/bge-small-en-v1.5) |
| Vector DB | ChromaDB |
| LLM | Groq (llama-3.1-8b-instant) |
| Frontend | React (Vite) |
| Containerization | Docker |
| Backend Hosting | Azure Container Apps |
| Frontend Hosting | Vercel |

---

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/upload` | Upload and ingest a PDF |
| POST | `/query` | Ask a question with optional conversation history |

### Query request body
```json
{
  "question": "What are the main findings?",
  "top_k": 3,
  "history": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

---

## Local setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

export GROQ_API_KEY=your_key_here

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install

# .env
VITE_API_URL=http://localhost:8000

npm run dev
```

---

## Design decisions

**Why fastembed over sentence-transformers?** Docker image goes from ~3GB to ~300MB. Same embedding quality for retrieval tasks, significantly faster cold starts on Azure Container Apps.

**Why ChromaDB?** Zero-config local vector store. No external service, no API keys, embeddings stay in the container. Simple swap to a managed service (Azure AI Search, Pinecone) if scale requires it.

**Why Groq over OpenAI?** Free tier, faster inference on LLaMA models, no credit card required. Azure OpenAI was blocked on student subscriptions.

**Chunking strategy:** 500 character chunks with 50 character overlap. Overlap preserves context at chunk boundaries — without it, sentences split across chunks lose meaning. 500 chars (~100 tokens) fits comfortably within embedding model context limits.

---

## Deployment

Backend is containerized and deployed on Azure Container Apps (Central India region). Frontend is deployed on Vercel with automatic redeployment on git push.

```bash
# Build and push image
az acr login --name ragbackendacr2605
docker build -t ragbackendacr2605.azurecr.io/rag-backend:latest ./backend
docker push ragbackendacr2605.azurecr.io/rag-backend:latest

# Deploy
az containerapp update --name rag-backend --resource-group rag-rg \
  --image ragbackendacr2605.azurecr.io/rag-backend:latest
```
