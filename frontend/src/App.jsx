import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: form });
    if (res.ok) setUploaded(true);
    setUploading(false);
  }

  async function handleQuery() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    const res = await fetch(`${API_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, top_k: 3 }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setAnswer((prev) => prev + decoder.decode(value));
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 700, margin: "60px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1>RagLens</h1>
      <p>Upload a PDF and ask questions about it.</p>

      <div style={{ marginBottom: 24 }}>
        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: 8 }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {uploaded && <span style={{ marginLeft: 8, color: "green" }}>✓ Ready</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <textarea
          rows={3}
          style={{ width: "100%", padding: 8, fontSize: 14 }}
          placeholder="Ask a question about the document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={handleQuery} disabled={loading || !uploaded} style={{ marginTop: 8 }}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {answer && (
        <div style={{ background: "#f4f4f4", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap" }}>
          {answer}
        </div>
      )}
    </div>
  );
}