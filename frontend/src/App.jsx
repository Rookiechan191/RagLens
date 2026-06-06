import { useState, useRef, useCallback, useEffect } from "react";
import { uploadPDF, queryStream } from "./api";

const T = {
  bg:        "#08080d",
  surface:   "#0f0f18",
  surfaceHi: "#14141f",
  border:    "#1c1c2e",
  borderHi:  "#26263a",
  accent:    "#7c6dfa",
  accentDim: "#5548d9",
  accentGlow:"rgba(124,109,250,0.15)",
  success:   "#20d4a0",
  successDim:"rgba(32,212,160,0.1)",
  error:     "#f87171",
  text:      "#eaeaf5",
  textMid:   "#7878a0",
  textDim:   "#3a3a58",
  fontMono:  "'IBM Plex Mono', monospace",
  fontSans:  "'Outfit', system-ui, sans-serif",
  radius:    "16px",
  radiusSm:  "10px",
  trans:     "all 0.2s cubic-bezier(0.4,0,0.2,1)",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.text};
    font-family: ${T.fontSans};
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.borderHi}; border-radius: 99px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes successPop {
    0%   { transform: scale(0.85); opacity: 0; }
    60%  { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.05); }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideLeft {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .msg-user { animation: slideLeft 0.22s ease forwards; }
  .msg-bot  { animation: slideRight 0.22s ease forwards; }

  .drop-active {
    border-color: ${T.accent} !important;
    background: ${T.accentGlow} !important;
  }

  textarea::placeholder { color: ${T.textDim}; }

  @media (max-width: 768px) {
    .layout { flex-direction: column !important; height: auto !important; overflow: auto !important; }
    .left-panel { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${T.border} !important; min-height: 260px !important; }
    .right-panel { min-height: 500px !important; }
    body { overflow: auto; }
  }
`;

const Spinner = ({ size = 14 }) => (
  <span style={{
    display: "inline-block", width: size, height: size,
    border: `2px solid ${T.textDim}`, borderTopColor: T.accent,
    borderRadius: "50%", animation: "spin 0.65s linear infinite",
    verticalAlign: "middle", flexShrink: 0,
  }} />
);

const Cursor = () => (
  <span style={{
    display: "inline-block", width: 2, height: "0.9em",
    background: T.accent, verticalAlign: "text-bottom", marginLeft: 2,
    animation: "blink 0.9s step-end infinite", borderRadius: 1,
  }} />
);

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <div style={{
      width: 30, height: 30, borderRadius: 9,
      background: `linear-gradient(135deg, ${T.accentGlow}, transparent)`,
      border: `1px solid ${T.borderHi}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h8M2 8h12M2 12h6" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13" cy="11" r="2.5" stroke={T.success} strokeWidth="1.3"/>
        <path d="M14.8 12.8L16 14" stroke={T.success} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </div>
    <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.03em", color: T.text }}>
      Rag<span style={{ color: T.accent }}>Lens</span>
    </span>
  </div>
);

function UploadPanel({ file, setFile, uploaded, uploading, onUpload }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }, [setFile]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div
        className={dragging ? "drop-active" : ""}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        style={{
          flex: 1,
          border: `1.5px dashed ${uploaded ? T.success : dragging ? T.accent : T.border}`,
          borderRadius: T.radius,
          background: uploaded ? T.successDim : T.surfaceHi,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, cursor: file ? "default" : "pointer",
          transition: T.trans, padding: "24px 16px",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage: `radial-gradient(circle, ${T.textMid} 1px, transparent 1px)`,
          backgroundSize: "20px 20px", pointerEvents: "none",
        }} />

        {uploaded ? (
          <div style={{ textAlign: "center", animation: "successPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: T.successDim, border: `1.5px solid ${T.success}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke={T.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontWeight: 600, color: T.success, fontSize: 13 }}>PDF Ready</p>
            <p style={{ color: T.textMid, fontSize: 11, marginTop: 4, fontFamily: T.fontMono, wordBreak: "break-all" }}>
              {file?.name}
            </p>
          </div>
        ) : file ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 40, height: 48, borderRadius: 6,
              background: T.accentGlow, border: `1px solid ${T.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 10px",
            }}>
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                <path d="M3 4h10M3 8h12M3 12h8" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ color: T.text, fontSize: 12, fontWeight: 500 }}>{file.name}</p>
            <p style={{ color: T.textMid, fontSize: 11, marginTop: 3 }}>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: `1.5px dashed ${T.borderHi}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 14V6M10 6L7 9M10 6l3 3" stroke={T.textMid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 15h12" stroke={T.textMid} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
              </svg>
            </div>
            <p style={{ color: T.textMid, fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>
              Drop a <strong style={{ color: T.text }}>PDF</strong> here<br/>
              <span style={{ fontSize: 11, color: T.textDim }}>or click to browse</span>
            </p>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }}
          onChange={e => setFile(e.target.files[0])} />
      </div>

      {!uploaded ? (
        <button onClick={onUpload} disabled={!file || uploading} style={{
          width: "100%", padding: "10px 0",
          background: file && !uploading ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})` : T.surfaceHi,
          border: `1px solid ${file && !uploading ? "transparent" : T.border}`,
          borderRadius: T.radiusSm,
          color: file && !uploading ? "#fff" : T.textDim,
          fontFamily: T.fontSans, fontWeight: 500, fontSize: 13,
          cursor: file && !uploading ? "pointer" : "not-allowed",
          transition: T.trans,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: file && !uploading ? `0 4px 20px ${T.accentGlow}` : "none",
        }}>
          {uploading ? <><Spinner /> Uploading…</> : "Upload PDF"}
        </button>
      ) : (
        <button onClick={() => { setFile(null); window.location.reload(); }} style={{
          width: "100%", padding: "10px 0",
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: T.radiusSm, color: T.textMid,
          fontFamily: T.fontSans, fontSize: 13,
          cursor: "pointer", transition: T.trans,
        }}>
          ↺ New PDF
        </button>
      )}
    </div>
  );
}

function ChatPanel({ uploaded, question, setQuestion, messages, loading, onQuery }) {
  const bottomRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onQuery(); }
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 20px",
        display: "flex", flexDirection: "column",
        gap: 16,
        justifyContent: messages.length === 0 ? "center" : "flex-start",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: T.accentGlow, border: `1px solid ${T.borderHi}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              animation: uploaded ? "pulse 2.5s ease-in-out infinite" : "none",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 3C6.6 3 3 6.6 3 11s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke={T.accent} strokeWidth="1.4"/>
                <path d="M11 7v4.5l3 1.5" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ color: uploaded ? T.textMid : T.textDim, fontSize: 13.5, lineHeight: 1.7 }}>
              {uploaded
                ? <><strong style={{ color: T.text }}>Document loaded.</strong><br/>Ask anything about it.</>
                : "Upload a PDF to begin"}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}
            className={msg.role === "user" ? "msg-user" : "msg-bot"}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: T.accentGlow, border: `1px solid ${T.borderHi}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: 8, marginTop: 2,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: "75%",
              background: msg.role === "user"
                ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`
                : T.surfaceHi,
              border: msg.role === "user" ? "none" : `1px solid ${T.borderHi}`,
              borderRadius: msg.role === "user"
                ? "16px 16px 4px 16px"
                : "4px 16px 16px 16px",
              padding: "10px 14px",
              fontSize: 13.5, lineHeight: 1.75,
              color: T.text,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {msg.content}
              {loading && i === messages.length - 1 && msg.role === "assistant" && msg.content === "" && (
                <span style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
                  {[0, 1, 2].map(n => (
                    <span key={n} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: T.textMid,
                      animation: `pulse 1.2s ease-in-out ${n * 0.2}s infinite`,
                    }} />
                  ))}
                </span>
              )}
              {loading && i === messages.length - 1 && msg.role === "assistant" && msg.content !== "" && <Cursor />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "14px 18px",
        borderTop: `1px solid ${T.border}`,
        background: T.surface,
      }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: T.surfaceHi,
          border: `1px solid ${uploaded ? T.borderHi : T.border}`,
          borderRadius: T.radius, padding: "10px 12px",
          transition: T.trans,
          boxShadow: uploaded ? `0 0 0 1px ${T.accentGlow}` : "none",
        }}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => { setQuestion(e.target.value); autoResize(e); }}
            onKeyDown={handleKey}
            disabled={!uploaded || loading}
            placeholder={uploaded ? "Ask a question… (Enter to send)" : "Upload a PDF first"}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: uploaded ? T.text : T.textDim,
              fontFamily: T.fontSans, fontSize: 13.5, lineHeight: 1.6,
              resize: "none", overflow: "hidden",
            }}
          />
          <button
            onClick={onQuery}
            disabled={!uploaded || !question.trim() || loading}
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: T.radiusSm,
              background: uploaded && question.trim() && !loading
                ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})` : T.border,
              border: "none",
              cursor: uploaded && question.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: T.trans,
              boxShadow: uploaded && question.trim() && !loading ? `0 0 16px ${T.accentGlow}` : "none",
            }}
          >
            {loading
              ? <Spinner />
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            }
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: T.textDim, marginTop: 7, paddingLeft: 2 }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [file, setFile]           = useState(null);
  const [uploaded, setUploaded]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion]   = useState("");
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      await uploadPDF(file);
      setUploaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!question.trim() || !uploaded || loading) return;
    const q = question.trim();
    setQuestion("");
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    let fullAnswer = "";
    try {
      await queryStream(q, {
        history,
        onToken: (token) => {
          fullAnswer += token;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: fullAnswer };
            return updated;
          });
        },
        onDone: () => setLoading(false),
        onError: (err) => { console.error(err); setLoading(false); },
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
      <header style={{
        height: 52, display: "flex", alignItems: "center",
        padding: "0 22px", borderBottom: `1px solid ${T.border}`,
        background: T.surface, flexShrink: 0, justifyContent: "space-between",
      }}>
        <Logo />
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", border: `1px solid ${T.border}`,
          borderRadius: 99, fontSize: 11, color: T.textMid, fontFamily: T.fontMono,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: uploaded ? T.success : T.textDim,
            display: "inline-block",
            boxShadow: uploaded ? `0 0 6px ${T.success}` : "none",
            transition: T.trans,
          }} />
          {uploaded ? "PDF loaded" : "No document"}
        </div>
      </header>

      <div className="layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <aside className="left-panel" style={{
          width: 290, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          background: T.surface, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Document
            </p>
          </div>
          <UploadPanel file={file} setFile={setFile} uploaded={uploaded} uploading={uploading} onUpload={handleUpload} />
        </aside>

        <main className="right-panel" style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <p style={{ fontSize: 10, fontFamily: T.fontMono, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Q &amp; A
            </p>
          </div>
          <ChatPanel
            uploaded={uploaded}
            question={question} setQuestion={setQuestion}
            messages={messages} loading={loading}
            onQuery={handleQuery}
          />
        </main>
      </div>
    </div>
  );
}