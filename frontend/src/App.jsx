import { useState, useRef, useCallback, useEffect } from "react";
import { uploadPDF, queryStream } from "./api";

/* ── Design tokens ───────────────────────────────────────────── */
const T = {
  bg:        "#0a0a0f",
  surface:   "#111118",
  surfaceHi: "#16161f",
  border:    "#1e1e2e",
  borderHi:  "#2a2a3d",
  accent:    "#6c63ff",
  accentDim: "#4b44cc",
  accentGlow:"rgba(108,99,255,0.18)",
  success:   "#22d3a5",
  successDim:"rgba(34,211,165,0.12)",
  text:      "#e8e8f0",
  textMid:   "#8888a8",
  textDim:   "#44445a",
  fontMono:  "'JetBrains Mono', 'Fira Code', monospace",
  fontSans:  "'DM Sans', 'Sora', system-ui, sans-serif",
  radius:    "14px",
  radiusSm:  "8px",
  trans:     "all 0.22s cubic-bezier(0.4,0,0.2,1)",
};

/* ── Global styles injected once ─────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.text};
    font-family: ${T.fontSans};
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.borderHi}; border-radius: 99px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.95); box-shadow: 0 0 0 0 ${T.accentGlow}; }
    70%  { transform: scale(1);    box-shadow: 0 0 0 10px transparent; }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 transparent; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes blink {
    0%,100% { opacity: 1; } 50% { opacity: 0; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes successPop {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.08); }
    100% { transform: scale(1); opacity: 1; }
  }

  .drop-zone-active {
    border-color: ${T.accent} !important;
    background: ${T.accentGlow} !important;
  }
  .chat-bubble { animation: fadeUp 0.28s ease forwards; }

  @media (max-width: 768px) {
    .layout { flex-direction: column !important; height: auto !important; overflow: auto !important; }
    .left-panel { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${T.border} !important; min-height: 280px !important; flex-shrink: 0 !important; }
    .right-panel { flex: 1 !important; min-height: 400px !important; }
    body { overflow: auto; }
  }
`;

/* ── Tiny helpers ─────────────────────────────────────────────── */
const Spinner = () => (
  <span style={{
    display:"inline-block", width:14, height:14,
    border:`2px solid ${T.textDim}`, borderTopColor:T.accent,
    borderRadius:"50%", animation:"spin 0.7s linear infinite",
    verticalAlign:"middle"
  }}/>
);

const Cursor = () => (
  <span style={{
    display:"inline-block", width:2, height:"1em",
    background:T.accent, verticalAlign:"text-bottom", marginLeft:2,
    animation:"blink 1s step-end infinite"
  }}/>
);

/* ── Logo ─────────────────────────────────────────────────────── */
const Logo = () => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill={T.accent} fillOpacity="0.15"/>
      <path d="M7 8h10M7 12h14M7 16h8" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="20" cy="19" r="4" stroke={T.success} strokeWidth="1.6"/>
      <path d="M22.5 21.5L24 23" stroke={T.success} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
    <span style={{
      fontFamily: T.fontSans, fontWeight:600, fontSize:16,
      letterSpacing:"-0.02em", color: T.text
    }}>
      Rag<span style={{ color: T.accent }}>Lens</span>
    </span>
  </div>
);

/* ── Upload panel ─────────────────────────────────────────────── */
function UploadPanel({ file, setFile, uploaded, uploading, onUpload }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }, [setFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:20,
      padding:"28px 24px", height:"100%"
    }}>
      {/* Drop zone */}
      <div
        className={dragging ? "drop-zone-active" : ""}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && inputRef.current?.click()}
        style={{
          flex: 1,
          border: `1.5px dashed ${uploaded ? T.success : dragging ? T.accent : T.border}`,
          borderRadius: T.radius,
          background: uploaded ? T.successDim : T.surfaceHi,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:14, cursor: file ? "default" : "pointer",
          transition: T.trans,
          padding:"32px 20px",
          position:"relative", overflow:"hidden",
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position:"absolute", inset:0, opacity:0.03,
          backgroundImage:`linear-gradient(${T.textMid} 1px, transparent 1px), linear-gradient(90deg, ${T.textMid} 1px, transparent 1px)`,
          backgroundSize:"24px 24px", borderRadius:T.radius,
          pointerEvents:"none"
        }}/>

        {uploaded ? (
          <div style={{ animation:"successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards", textAlign:"center" }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{margin:"0 auto 12px"}}>
              <circle cx="22" cy="22" r="21" fill={T.successDim} stroke={T.success} strokeWidth="1.5"/>
              <path d="M13 22l6 6 12-13" stroke={T.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontWeight:600, color:T.success, fontSize:14 }}>PDF Ready</p>
            <p style={{ color:T.textMid, fontSize:12, marginTop:4, fontFamily:T.fontMono }}>
              {file?.name}
            </p>
          </div>
        ) : file ? (
          <div style={{ textAlign:"center" }}>
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" style={{margin:"0 auto 12px"}}>
              <rect width="40" height="48" rx="6" fill={T.accentGlow} stroke={T.accent} strokeWidth="1.2"/>
              <path d="M10 18h20M10 24h16M10 30h12" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M26 4v8h8" fill="none" stroke={T.accent} strokeWidth="1.2"/>
            </svg>
            <p style={{ color:T.text, fontWeight:500, fontSize:13 }}>{file.name}</p>
            <p style={{ color:T.textMid, fontSize:11, marginTop:4 }}>
              {(file.size/1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 28V16M20 16l-5 5M20 16l5 5" stroke={T.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="30" width="28" height="2" rx="1" fill={T.textDim} opacity="0.4"/>
            </svg>
            <p style={{ color:T.textMid, fontSize:13, textAlign:"center", lineHeight:1.5 }}>
              Drop a <strong style={{color:T.text}}>PDF</strong> here<br/>
              <span style={{fontSize:11, color:T.textDim}}>or click to browse</span>
            </p>
          </>
        )}
        <input
          ref={inputRef} type="file" accept=".pdf"
          style={{ display:"none" }}
          onChange={e => setFile(e.target.files[0])}
        />
      </div>

      {/* Action button */}
      {!uploaded && (
        <button
          onClick={onUpload}
          disabled={!file || uploading}
          style={{
            width:"100%", padding:"11px 0",
            background: file && !uploading
              ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`
              : T.surfaceHi,
            border: `1px solid ${file && !uploading ? "transparent" : T.border}`,
            borderRadius: T.radiusSm,
            color: file && !uploading ? "#fff" : T.textDim,
            fontFamily: T.fontSans, fontWeight:500, fontSize:13,
            cursor: file && !uploading ? "pointer" : "not-allowed",
            transition: T.trans,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow: file && !uploading ? `0 0 20px ${T.accentGlow}` : "none",
          }}
        >
          {uploading ? <><Spinner /> Uploading…</> : "Upload PDF"}
        </button>
      )}

      {uploaded && (
        <button
          onClick={() => { setFile(null); window.location.reload(); }}
          style={{
            width:"100%", padding:"11px 0",
            background:"transparent",
            border:`1px solid ${T.border}`,
            borderRadius:T.radiusSm,
            color:T.textMid, fontFamily:T.fontSans,
            fontSize:13, cursor:"pointer", transition:T.trans,
          }}
        >
          ↺ New PDF
        </button>
      )}
    </div>
  );
}

/* ── Chat panel ───────────────────────────────────────────────── */
function ChatPanel({ uploaded, question, setQuestion, answer, loading, onQuery }) {
  const bottomRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [answer]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onQuery(); }
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height:"100%", padding:"0",
    }}>
      {/* Answer area */}
      <div style={{
        flex:1, overflowY:"auto", padding:"28px 24px",
        display:"flex", flexDirection:"column", justifyContent: answer ? "flex-start" : "center",
      }}>
        {!answer && !loading && (
          <div style={{ textAlign:"center", animation:"fadeUp 0.5s ease" }}>
            <div style={{
              width:56, height:56, borderRadius:"50%",
              background:T.accentGlow, border:`1px solid ${T.borderHi}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 16px", animation: uploaded ? "pulse-ring 2.5s ease infinite" : "none"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke={T.accent} strokeWidth="1.5"/>
                <path d="M12 8v4l3 3" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ color: uploaded ? T.textMid : T.textDim, fontSize:14, lineHeight:1.6 }}>
              {uploaded
                ? <>Ask anything about your <strong style={{color:T.text}}>PDF</strong></>
                : "Upload a PDF to start asking questions"
              }
            </p>
          </div>
        )}

        {(answer || loading) && (
          <div className="chat-bubble" style={{
            background: T.surfaceHi,
            border:`1px solid ${T.borderHi}`,
            borderRadius: T.radius,
            padding:"18px 20px",
            fontSize:14, lineHeight:1.75,
            color:T.text, fontFamily:T.fontSans,
            whiteSpace:"pre-wrap", wordBreak:"break-word",
          }}>
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              marginBottom:12, paddingBottom:10,
              borderBottom:`1px solid ${T.border}`
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" fill={T.accentGlow} stroke={T.accent} strokeWidth="1"/>
                <path d="M4 7l2 2 4-4" stroke={T.accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:11, color:T.accent, fontFamily:T.fontMono, fontWeight:500 }}>
                RagLens
              </span>
            </div>
            {answer}
            {loading && <Cursor />}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div style={{
        padding:"16px 20px",
        borderTop:`1px solid ${T.border}`,
        background:T.surface,
      }}>
        <div style={{
          display:"flex", gap:10, alignItems:"flex-end",
          background:T.surfaceHi,
          border:`1px solid ${uploaded ? T.borderHi : T.border}`,
          borderRadius:T.radius,
          padding:"10px 12px",
          transition:T.trans,
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
              flex:1, background:"transparent", border:"none", outline:"none",
              color: uploaded ? T.text : T.textDim,
              fontFamily:T.fontSans, fontSize:13.5, lineHeight:1.6,
              resize:"none", overflow:"hidden",
              placeholder: T.textDim,
            }}
          />
          <button
            onClick={onQuery}
            disabled={!uploaded || !question.trim() || loading}
            style={{
              flexShrink:0,
              width:34, height:34,
              borderRadius: T.radiusSm,
              background: uploaded && question.trim() && !loading
                ? `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`
                : T.border,
              border:"none",
              cursor: uploaded && question.trim() && !loading ? "pointer" : "not-allowed",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:T.trans,
              boxShadow: uploaded && question.trim() ? `0 0 12px ${T.accentGlow}` : "none",
            }}
          >
            {loading
              ? <Spinner/>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            }
          </button>
        </div>
        <p style={{ fontSize:10.5, color:T.textDim, marginTop:8, paddingLeft:2 }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────── */
export default function App() {
  const [file, setFile]         = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer]     = useState("");
  const [loading, setLoading]   = useState(false);

  // Inject global CSS once
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
    setAnswer("");
    setLoading(true);
    try {
      await queryStream(q, {
        onToken: (token) => setAnswer(prev => prev + token),
        onDone:  ()      => setLoading(false),
        onError: (err)   => { console.error(err); setLoading(false); },
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{
      height:"100vh", display:"flex", flexDirection:"column",
      background:T.bg, overflow:"hidden",
    }}>
      {/* Top bar */}
      <header style={{
        height:54, display:"flex", alignItems:"center",
        padding:"0 24px",
        borderBottom:`1px solid ${T.border}`,
        background:T.surface,
        flexShrink:0,
        justifyContent:"space-between",
      }}>
        <Logo/>
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"4px 10px",
          border:`1px solid ${T.border}`,
          borderRadius:99,
          fontSize:11, color:T.textMid,
          fontFamily:T.fontMono,
        }}>
          <span style={{
            width:6, height:6, borderRadius:"50%",
            background: uploaded ? T.success : T.textDim,
            display:"inline-block",
            boxShadow: uploaded ? `0 0 6px ${T.success}` : "none",
            transition:T.trans,
          }}/>
          {uploaded ? "PDF loaded" : "No document"}
        </div>
      </header>

      {/* Main layout */}
      <div
        className="layout"
        style={{
          flex:1, display:"flex", overflow:"hidden",
        }}
      >
        {/* Left — upload */}
        <aside
          className="left-panel"
          style={{
            width:300, flexShrink:0,
            borderRight:`1px solid ${T.border}`,
            background:T.surface,
            display:"flex", flexDirection:"column",
          }}
        >
          <div style={{
            padding:"14px 20px 10px",
            borderBottom:`1px solid ${T.border}`,
          }}>
            <p style={{
              fontSize:10.5, fontFamily:T.fontMono,
              color:T.textDim, letterSpacing:"0.08em",
              textTransform:"uppercase"
            }}>
              Document
            </p>
          </div>
          <UploadPanel
            file={file} setFile={setFile}
            uploaded={uploaded} uploading={uploading}
            onUpload={handleUpload}
          />
        </aside>

        {/* Right — chat */}
        <main
          className="right-panel"
          style={{
            flex:1, display:"flex", flexDirection:"column",
            background:T.bg, overflow:"hidden",
          }}
        >
          <div style={{
            padding:"14px 20px 10px",
            borderBottom:`1px solid ${T.border}`,
            background:T.surface,
          }}>
            <p style={{
              fontSize:10.5, fontFamily:T.fontMono,
              color:T.textDim, letterSpacing:"0.08em",
              textTransform:"uppercase"
            }}>
              Q &amp; A
            </p>
          </div>
          <ChatPanel
            uploaded={uploaded}
            question={question} setQuestion={setQuestion}
            answer={answer} loading={loading}
            onQuery={handleQuery}
          />
        </main>
      </div>
    </div>
  );
}