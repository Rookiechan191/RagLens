from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    question: str
    top_k: int = 3
    history: Optional[List[Message]] = []

@app.post("/query")
def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")
    try:
        history = [{"role": m.role, "content": m.content} for m in req.history]
        return StreamingResponse(
            stream_answer(req.question, history=history, top_k=req.top_k),
            media_type="text/plain",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")