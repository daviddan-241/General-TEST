import React, { useState, useEffect } from "react";
import { Card, CardHeader, Badge, Btn } from "../components/Card";

function Field({ label, value, onChange, type = "text", placeholder, hint, mono }) {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: isSecret ? "9px 40px 9px 13px" : "9px 13px",
            fontSize: 13, borderRadius: 9, background: "var(--surface2)",
            border: "1px solid var(--border2)", color: "var(--text)", outline: "none",
            fontFamily: mono ? "JetBrains Mono, monospace" : "inherit",
            boxSizing: "border-box",
          }}
        />
        {isSecret && (
          <button onClick={() => setShow(s => !s)} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "var(--text-dimmer)", cursor: "pointer",
            fontSize: 14,
          }}>
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {hint && <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--text-dimmer)" }}>{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [token, setToken] = useState(() => localStorage.getItem("ma_gh_token") || "");
  const [saved, setSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  const save = () => {
    localStorage.setItem("ma_gh_token", token);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (token) checkRateLimit();
  };

  const checkRateLimit = async () => {
    const t = token || localStorage.getItem("ma_gh_token");
    if (!t) return;
    try {
      const res = await fetch(`/api/github/repo?repo=octocat/Hello-World${t ? "&token=" + encodeURIComponent(t) : ""}`);
      const data = await res.json();
      // Check rate limit via a simple call
      const rlRes = await fetch("https://api.github.com/rate_limit", {
        headers: { Authorization: `token ${t}`, "User-Agent": "MasterAdmin/1.0" },
      });
      if (rlRes.ok) {
        const rl = await rlRes.json();
        setRateLimitInfo(rl.rate);
      }
    } catch {}
  };

  const checkApi = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setApiStatus(data);
    } catch (e) { setApiStatus({ ok: false, error: e.message }); }
  };

  useEffect(() => { checkApi(); if (token) checkRateLimit(); }, []); // eslint-disable-line

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
          Configure your GitHub token and preferences
        </p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader title="Server Status" icon="⚡"
          action={<Btn small variant="secondary" onClick={checkApi}>Refresh</Btn>} />
        <div style={{ padding: 18 }}>
          {apiStatus ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: apiStatus.ok ? "var(--accent)" : "var(--red)", boxShadow: apiStatus.ok ? "0 0 8px var(--accent)" : "none" }} />
              <span style={{ color: apiStatus.ok ? "var(--accent)" : "var(--red)", fontWeight: 700 }}>
                {apiStatus.ok ? "API Online" : "API Offline"}
              </span>
              {apiStatus.time && (
                <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>{apiStatus.time}</span>
              )}
            </div>
          ) : (
            <span style={{ color: "var(--text-dimmer)" }}>Checking…</span>
          )}
        </div>
      </Card>

      {/* GitHub Token */}
      <Card>
        <CardHeader title="GitHub Token" icon="🔑" subtitle="For private repos + GitHub Actions" />
        <div style={{ padding: 18 }}>
          <Field
            label="Personal Access Token"
            value={token}
            onChange={setToken}
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            hint="Create at github.com/settings/tokens — needs repo + workflow scopes for full access"
            mono
          />

          {rateLimitInfo && (
            <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dimmer)", marginBottom: 4 }}>GitHub API Rate Limit</div>
              <div style={{ display: "flex", gap: 16 }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>
                  {rateLimitInfo.remaining}/{rateLimitInfo.limit} requests remaining
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                  Resets {new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 4, background: "var(--border)", borderRadius: 2 }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(rateLimitInfo.remaining / rateLimitInfo.limit) * 100}%`,
                  background: "var(--accent)",
                }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save}>{saved ? "✅ Saved!" : "Save Token"}</Btn>
            {token && <Btn variant="secondary" onClick={checkRateLimit}>Check Rate Limit</Btn>}
            {token && <Btn variant="danger" onClick={() => { setToken(""); localStorage.removeItem("ma_gh_token"); }}>Clear</Btn>}
          </div>
        </div>
      </Card>

      {/* Usage guide */}
      <Card>
        <CardHeader title="How to Use" icon="📖" />
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { step: "1", title: "Dashboard", desc: "Add any URL to monitor it in real time. Ping status, response time, and HTTP codes update every 60 seconds automatically." },
              { step: "2", title: "Inspector", desc: "Paste any URL for deep analysis — live site check, response headers, tech stack detection, meta tags, images, and an iframe preview." },
              { step: "3", title: "GitHub Browser", desc: "Enter any GitHub repo URL to browse commits, files, and workflow run history. Add your token above to access private repos and trigger deploys." },
              { step: "4", title: "Deploy Trigger", desc: "In the GitHub tab, click 'Trigger Deploy' to dispatch a `deploy.yml` GitHub Actions workflow. Requires a token with `workflow` scope." },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: "var(--accent-dim)", border: "1px solid rgba(0,255,136,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 12, color: "var(--accent)",
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dimmer)", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Render deploy info */}
      <Card>
        <CardHeader title="Render Deployment" icon="🚀" />
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Build Command", value: "npm install && npm run build", mono: true },
              { label: "Start Command", value: "npm run start", mono: true },
              { label: "Port", value: "10000", mono: true },
              { label: "Node Version", value: "18+", mono: true },
              { label: "Environment", value: "PORT=10000, NODE_ENV=production", mono: true },
              { label: "Repo", value: "github.com/daviddan-241/General-TEST", mono: true },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-dimmer)", fontSize: 11, width: 120, flexShrink: 0 }}>{r.label}</span>
                <span className={r.mono ? "mono" : ""} style={{ color: "var(--accent)", fontSize: 12 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
