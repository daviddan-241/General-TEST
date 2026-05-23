import React, { useState } from "react";
import { TECH_META } from "../store";

function Section({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", borderBottom: open ? "1px solid var(--border)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{title}</span>
        </div>
        <span style={{ color: "var(--text-dimmer)", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

function StatBox({ label, value, color = "#fff", icon }) {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-dimmer)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

const TECH_COLORS = { "Next.js": "#fff", "React": "#61dafb", "Vue.js": "#42b883", "Angular": "#dd1b16", "Svelte": "#ff3e00", "Nuxt.js": "#00DC82", "Astro": "#ff5d01", "WordPress": "#21759b" };

export default function Inspector() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analyze, setAnalyze] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  const check = async () => {
    const fullUrl = url.trim().replace(/\/$/, "");
    if (!fullUrl) return;
    const target = fullUrl.startsWith("http") ? fullUrl : `https://${fullUrl}`;
    setLoading(true); setError(""); setResult(null); setAnalyze(null);
    try {
      const [checkRes, analyzeRes] = await Promise.all([
        fetch("/api/site/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) }).then(r => r.json()),
        fetch("/api/site/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) }).then(r => r.json()),
      ]);
      setResult({ ...checkRes, _url: target });
      setAnalyze(analyzeRes);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const TABS = ["overview", "headers", "meta", "preview"].filter(t => t !== "meta" || analyze);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>Site Inspector</h1>
        <p style={{ margin: "5px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>Full real-time analysis of any URL — headers, tech stack, meta, and live preview</p>
      </div>

      {/* Input */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && check()}
            placeholder="https://example.com"
            style={{
              flex: 1, minWidth: 220, padding: "11px 14px", fontSize: 13, borderRadius: 10,
              fontFamily: "JetBrains Mono, monospace", background: "var(--surface2)",
              border: "1px solid var(--border2)", color: "var(--text)",
            }}
          />
          <button onClick={check} disabled={loading} style={{
            padding: "11px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", color: "#fff",
            opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit",
          }}>
            {loading ? <><span className="spin" style={{ display: "inline-block" }}>↻</span> Inspecting…</> : "◎ Inspect"}
          </button>
        </div>
        {/* Quick examples */}
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["github.com", "vercel.com", "tailwindcss.com", "react.dev"].map(ex => (
            <button key={ex} onClick={() => { setUrl(`https://${ex}`); }} style={{
              padding: "3px 10px", borderRadius: 20, background: "var(--surface2)", border: "1px solid var(--border2)",
              color: "var(--text-dimmer)", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
            }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatBox icon={result.ok ? "🟢" : "🔴"} label="Status" value={result.ok ? "Online" : "Offline"} color={result.ok ? "var(--green)" : "var(--red)"} />
            <StatBox icon="📡" label="HTTP Code" value={result.status || "—"} color={result.status < 300 ? "var(--green)" : result.status < 400 ? "var(--amber)" : "var(--red)"} />
            <StatBox icon="⚡" label="Response" value={result.responseTime ? `${result.responseTime}ms` : "—"} color={result.responseTime < 500 ? "var(--green)" : result.responseTime < 1500 ? "var(--amber)" : "var(--red)"} />
            <StatBox icon="📄" label="Size" value={result.htmlLength ? `${(result.htmlLength / 1024).toFixed(1)}kb` : "—"} />
          </div>

          {/* Tech stack */}
          {analyze?.tech?.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Tech Stack</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {analyze.tech.map(t => {
                  const meta = TECH_META[t] || { icon: "◆", color: "#888" };
                  return (
                    <span key={t} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 10,
                      background: `${meta.color}12`, border: `1px solid ${meta.color}25`,
                      fontSize: 13, fontWeight: 700, color: meta.color,
                    }}>
                      <span>{meta.icon}</span> {t}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div>
            <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
              {["overview", "headers", "meta", "preview"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "9px 16px", background: "none", border: "none",
                  borderBottom: tab === t ? "2px solid var(--indigo)" : "2px solid transparent",
                  color: tab === t ? "#a5b4fc" : "var(--text-dimmer)",
                  fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 13,
                  marginBottom: -1, textTransform: "capitalize", fontFamily: "inherit", transition: "color 0.15s",
                }}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {[
                  { k: "Final URL", v: result.finalUrl || result._url },
                  { k: "Status", v: `${result.status} ${result.statusText || ""}` },
                  { k: "Response Time", v: result.responseTime ? `${result.responseTime}ms` : "—" },
                  { k: "Content Length", v: result.htmlLength ? `${result.htmlLength.toLocaleString()} chars` : "—" },
                  analyze?.title ? { k: "Page Title", v: analyze.title } : null,
                  analyze?.favicon ? { k: "Favicon", v: analyze.favicon } : null,
                ].filter(Boolean).map(row => (
                  <div key={row.k} style={{ display: "flex", gap: 14, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="mono" style={{ color: "var(--text-dimmer)", fontSize: 11, width: 140, flexShrink: 0 }}>{row.k}</span>
                    <span className="mono" style={{ color: "#e2e4f0", fontSize: 12, wordBreak: "break-all" }}>{row.v}</span>
                  </div>
                ))}
                {analyze?.images?.length > 0 && (
                  <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Images ({analyze.images.length})
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {analyze.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="" style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)", display: "block" }}
                            onError={e => { e.target.style.display = "none"; }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "headers" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Response Headers</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>{Object.keys(result.headers || {}).length} headers</span>
                </div>
                {Object.entries(result.headers || {}).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 14, padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span className="mono" style={{ color: "var(--indigo)", fontSize: 11, minWidth: 180, flexShrink: 0 }}>{k}</span>
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "meta" && analyze && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {analyze.title && (
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Title</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{analyze.title}</div>
                  </div>
                )}
                {Object.entries(analyze.metas || {}).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 14, padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap" }}>
                    <span className="mono" style={{ color: "var(--green)", fontSize: 10, width: 180, flexShrink: 0, paddingTop: 2 }}>{k}</span>
                    <span style={{ color: "var(--text-dim)", fontSize: 12, flex: 1, wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "preview" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-dimmer)" }}>
                    ℹ Some sites block iframe embedding with X-Frame-Options. If it's blank, that's why.
                  </span>
                </div>
                <iframe src={result._url} style={{ width: "100%", height: 520, border: "none", display: "block" }}
                  sandbox="allow-scripts allow-same-origin allow-forms" title="Site Preview" />
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--surface)", border: "1px dashed var(--border2)", borderRadius: 20, color: "var(--text-dimmer)" }}>
          <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.3 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>Enter a URL to inspect</div>
          <div style={{ fontSize: 13 }}>Paste any website URL to get live status, headers, tech stack, meta tags, and an iframe preview</div>
        </div>
      )}
    </div>
  );
}
