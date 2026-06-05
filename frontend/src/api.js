const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Upload a PDF file to the backend.
 * Returns the ingest summary ({ filename, total_chunks, ... }).
 */
export async function uploadPDF(file, onProgress) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

/**
 * Send a question and stream the answer back.
 * Calls onToken(text) for each streamed chunk, onDone() when finished.
 */
export async function queryStream(question, { onToken, onDone, onError, topK = 3 }) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, top_k: topK }),
    });
  } catch (e) {
    onError?.(e.message);
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    onError?.(err.detail || "Query failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }

  onDone?.();
}