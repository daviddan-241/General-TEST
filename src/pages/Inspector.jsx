import React, { useState } from "react";
import { Card, CardHeader, Badge, Btn, Input, Empty } from "../components/Card";

const TECH_COLORS = {
  "Next.js": "#fff", "React": "#61dafb", "Vue.js": "#42b883", "Angular": "#dd1b16",
  "Svelte": "#ff3e00", "Nuxt.js": "#42b883", "Astro": "#ff5d01", "Gatsby": "#663399",
  "WordPress": "#21759b", "Shopify": "#96bf48", "Vite": "#646cff", "Remix": "#121212",
};

export default function Inspector() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analyze, setAnalyze] = useState(null);
  const [analyzingMore, setAnalyzingMore] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  const check = async () => {
    const target = url.trim().replace(/\/$/, "");
    if (!target) return;
    const fullUrl = target.startsWith("http") ? target : `https://${target}`;
    setLoading(true); setError(""); setResult(null); setAnalyze(null);
    try {
      const res = await fetch("/api/site/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl }),
      });
      const data = await res.json();
      setResult({ ...data, url: fullUrl });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const analyzeMore = async () => {
    if (!result?.url) return;
    setAnalyzingMore(true);
    try {
      const res = await fetch("/api/site/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url }),
      });
      const data = await res.json();
      setAnalyze(data);
    } catch {}
    setAnalyzingMore(false);
  };

  const statusColor = result?.status
    ? result.status < 300 ? "var(--accent)" : result.status < 400 ? "var(--yellow)" : "var(--red)"
    : "#666";

  const TABS = ["overview", "headers", "preview", analyze ? "analysis" : null].filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>Site Inspector</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
          Real-time health check, headers, tech stack, and live preview of any URL
        </p>
      </div>

      {/* URL input */}
      <Card>
        <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input
            value={url}
            onChange={setUrl}
            placeholder="https://example.com"
            onKeyDown={e => e.key === "Enter" && check()}
            style={{ flex: 1, minWidth: 220, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}
          />
          <Btn onClick={check} loading={loading}>Inspect</Btn>
        </div>
      </Card>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--red-dim)", border: "1px solid rgba(255,68,85,0.25)", color: "var(--red)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <>
          {/* Status overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {[
              { label: "Status", value: result.ok ? "Online" : "Error", sub: result.statusText, color: result.ok ? "var(--accent)" : "var(--red)", icon: result.ok ? "✅" : "❌" },
              { label: "HTTP Code", value: result.status || "—", color: statusColor, icon: "📡" },
              { label: "Response Time", value: result.responseTime ? `${result.responseTime}ms` : "—", color: result.responseTime < 500 ? "var(--accent)" : result.responseTime < 1500 ? "var(--yellow)" : "var(--red)", icon: "⚡" },
              { label: "Page Size", value: result.htmlLength ? `${(result.htmlLength / 1024).toFixed(1)}kb` : "—", color: "var(--text)", icon: "📄" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 10, color: "var(--text-dimmer)", marginTop: 2 }}>{s.sub}</div>}
                <div style={{ fontSize: 11, color: "var(--text-dimmer)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Analyze more button */}
          {!analyze && (
            <Btn variant="secondary" onClick={analyzeMore} loading={analyzingMore}>
              🔬 Deep Analyze (tech stack, meta tags, links, images)
            </Btn>
          )}

          {/* Tabs */}
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "8px 16px", background: "none", border: "none",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === t ? "var(--accent)" : "var(--text-dim)",
                  fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 13,
                  marginBottom: -1, textTransform: "capitalize", fontFamily: "inherit",
                }}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card>
                  <CardHeader title="Connection Info" icon="🔗" />
                  <div style={{ padding: 18 }}>
                    {[
                      { k: "Final URL", v: result.finalUrl || result.url },
                      { k: "Status", v: `${result.status} ${result.statusText}` },
                      { k: "Response Time", v: result.responseTime ? `${result.responseTime}ms` : "—" },
                      { k: "Content Length", v: result.htmlLength ? `${result.htmlLength.toLocaleString()} chars` : "—" },
                    ].map(row => (
                      <div key={row.k} style={{ display: "flex", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                        <span className="mono" style={{ color: "var(--text-dimmer)", fontSize: 11, width: 130, flexShrink: 0 }}>{row.k}</span>
                        <span className="mono" style={{ color: "#fff", fontSize: 12, wordBreak: "break-all" }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === "headers" && (
              <Card>
                <CardHeader title="Response Headers" icon="📋" subtitle={`${Object.keys(result.headers || {}).length} headers`} />
                <div style={{ padding: "0 0 8px" }}>
                  {Object.entries(result.headers || {}).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 16, padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap" }}>
                      <span className="mono" style={{ color: "var(--accent)", fontSize: 11, minWidth: 160, flexShrink: 0 }}>{k}</span>
                      <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, wordBreak: "break-all" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "preview" && (
              <Card>
                <CardHeader title="Live Preview" icon="👁" subtitle="Some sites block iframe embedding (X-Frame-Options)" />
                <div style={{ padding: 0 }}>
                  <iframe
                    src={result.url}
                    style={{ width: "100%", height: 600, border: "none", display: "block", borderRadius: "0 0 14px 14px" }}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    title="Site Preview"
                  />
                </div>
              </Card>
            )}

            {tab === "analysis" && analyze && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Title + meta */}
                <Card>
                  <CardHeader title="Page Metadata" icon="📝" />
                  <div style={{ padding: 18 }}>
                    {analyze.title && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="mono" style={{ color: "var(--text-dimmer)", fontSize: 10, marginBottom: 6 }}>TITLE</div>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{analyze.title}</div>
                      </div>
                    )}
                    {Object.entries(analyze.metas || {}).slice(0, 20).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 16, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap" }}>
                        <span className="mono" style={{ color: "var(--accent)", fontSize: 10, width: 160, flexShrink: 0 }}>{k}</span>
                        <span style={{ color: "var(--text-dim)", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Tech stack */}
                {analyze.tech?.length > 0 && (
                  <Card>
                    <CardHeader title="Tech Stack Detected" icon="🛠" />
                    <div style={{ padding: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {analyze.tech.map(t => (
                        <Badge key={t} color={TECH_COLORS[t] || "var(--text-dim)"}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Images */}
                {analyze.images?.length > 0 && (
                  <Card>
                    <CardHeader title="Images Found" icon="🖼" subtitle={`${analyze.images.length} detected`} />
                    <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {analyze.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }}
                            onError={e => { e.target.style.display = "none"; }} />
                        </a>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Scripts */}
                {analyze.scripts?.length > 0 && (
                  <Card>
                    <CardHeader title="External Scripts" icon="📦" subtitle={`${analyze.scripts.length} found`} />
                    <div style={{ padding: "0 0 8px" }}>
                      {analyze.scripts.slice(0, 12).map((s, i) => (
                        <div key={i} className="mono" style={{ padding: "6px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 11, color: "var(--text-dimmer)", wordBreak: "break-all" }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!result && !loading && (
        <Empty icon="🔍" title="Enter a URL to inspect" desc="Paste any website URL above — get live status, headers, tech stack, and a preview" />
      )}
    </div>
  );
}
