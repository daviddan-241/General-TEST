import React, { useState, useEffect } from "react";
import { loadSettings, saveSettings } from "../store";

function Field({ label, value, onChange, type = "text", placeholder, hint, mono }) {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: isSecret ? "10px 40px 10px 13px" : "10px 13px",
            fontSize: 13, fontFamily: mono ? "JetBrains Mono, monospace" : "inherit",
            background: "var(--surface2)", border: "1px solid var(--border2)",
            borderRadius: 10, color: "var(--text)", outline: "none",
          }}
        />
        {isSecret && (
          <button onClick={() => setShow(s => !s)} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "var(--text-dimmer)", cursor: "pointer", fontSize: 14,
          }}>{show ? "🙈" : "👁"}</button>
        )}
      </div>
      {hint && <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--text-dimmer)", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function SaveBtn({ onClick, saved, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "9px 20px", borderRadius: 10,
      background: saved ? "var(--green-dim)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
      border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
      color: saved ? "var(--green)" : "#fff", fontWeight: 700, fontSize: 13,
      cursor: loading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "inherit",
    }}>
      {loading ? <span className="spin" style={{ display: "inline-block" }}>↻</span> : null}
      {saved ? "✅ Saved!" : "Save"}
    </button>
  );
}

export default function Settings({ projects }) {
  const [ghToken, setGhToken] = useState(() => localStorage.getItem("ma_gh_token") || "");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [alertAfterFails, setAlertAfterFails] = useState(2);
  const [savedGh, setSavedGh] = useState(false);
  const [savedNotify, setSavedNotify] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [watchStatus, setWatchStatus] = useState(null);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setApiStatus).catch(() => {});
    fetch("/api/watch/status").then(r => r.json()).then(d => {
      setWatchStatus(d);
      if (d.settings?.ntfyTopic) setNtfyTopic(d.settings.ntfyTopic);
      if (d.settings?.webhookUrl) setWebhookUrl(d.settings.webhookUrl);
      if (d.settings?.alertAfterFails) setAlertAfterFails(d.settings.alertAfterFails);
    }).catch(() => {});
  }, []);

  const saveGh = async () => {
    localStorage.setItem("ma_gh_token", ghToken);
    setSavedGh(true);
    setTimeout(() => setSavedGh(false), 2200);
    if (ghToken) {
      try {
        const r = await fetch("https://api.github.com/rate_limit", {
          headers: { Authorization: `token ${ghToken}`, "User-Agent": "MasterAdmin/2.0" },
        });
        if (r.ok) { const d = await r.json(); setRateLimitInfo(d.rate); }
      } catch {}
    }
  };

  const saveNotify = async () => {
    await fetch("/api/watch/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ntfyTopic, webhookUrl, alertAfterFails: Number(alertAfterFails) }),
    });
    setSavedNotify(true);
    setTimeout(() => setSavedNotify(false), 2200);
  };

  const testNotify = async () => {
    setTesting(true); setTestResult("");
    const res = await fetch("/api/notify/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ntfyTopic, webhookUrl }),
    }).then(r => r.json()).catch(() => ({ error: "Failed" }));
    const msgs = (res.results || []).map(r => Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", ")).join(" | ");
    setTestResult(msgs || (res.error ? "❌ " + res.error : "✅ Sent"));
    setTesting(false);
  };

  const projectsWithUrl = projects.filter(p => p.url);

  return (
    <div style={{ maxWidth: 620, display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
        <p style={{ margin: "5px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>Configure tokens, alerts, and watchdog</p>
      </div>

      {/* Server Status */}
      <Section title="Server Status" icon="⚡">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: apiStatus?.ok ? "var(--green)" : "var(--red)", boxShadow: apiStatus?.ok ? "0 0 8px var(--green)" : "0 0 8px var(--red)" }} />
            <span style={{ fontWeight: 700, color: apiStatus?.ok ? "var(--green)" : "var(--red)", fontSize: 14 }}>
              {apiStatus?.ok ? "API Online" : "API Offline"}
            </span>
          </div>
          {apiStatus?.version && (
            <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)", padding: "2px 8px", background: "var(--surface2)", borderRadius: 6 }}>
              v{apiStatus.version}
            </span>
          )}
          {apiStatus?.watched !== undefined && (
            <span style={{ fontSize: 12, color: "var(--text-dimmer)" }}>
              {apiStatus.watched} URL{apiStatus.watched !== 1 ? "s" : ""} being watched by server
            </span>
          )}
        </div>
      </Section>

      {/* GitHub Token */}
      <Section title="GitHub Token" icon="🔑">
        <Field
          label="Personal Access Token"
          value={ghToken}
          onChange={setGhToken}
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          hint="Create at github.com/settings/tokens — needs repo + workflow scopes. Required for private repos, Actions, and deploy triggers."
          mono
        />
        {rateLimitInfo && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "var(--green-dim)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--green)" }}>
                {rateLimitInfo.remaining.toLocaleString()}/{rateLimitInfo.limit.toLocaleString()} requests remaining
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                Resets {new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${(rateLimitInfo.remaining / rateLimitInfo.limit) * 100}%`, background: "var(--green)" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <SaveBtn onClick={saveGh} saved={savedGh} />
          {ghToken && (
            <button onClick={() => { setGhToken(""); localStorage.removeItem("ma_gh_token"); }} style={{
              padding: "9px 16px", borderRadius: 10, background: "transparent",
              border: "1px solid rgba(239,68,68,0.25)", color: "var(--red)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Clear</button>
          )}
        </div>
      </Section>

      {/* Watchdog & Alerts */}
      <Section title="Watchdog Alerts" icon="🔔">
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-dimmer)", lineHeight: 1.6 }}>
          The server pings all your project URLs every 60 seconds. Get alerted when a site goes down or comes back up.
        </p>

        <Field
          label="ntfy.sh Topic"
          value={ntfyTopic}
          onChange={setNtfyTopic}
          placeholder="my-master-admin-alerts"
          hint="Free push notifications. Visit ntfy.sh and subscribe to your topic in the browser or phone app. No account needed."
        />

        <Field
          label="Webhook URL"
          value={webhookUrl}
          onChange={setWebhookUrl}
          placeholder="https://hooks.slack.com/... or any endpoint"
          hint="Optional: receives POST { event, project, url, message, time } when site goes up or down"
          mono
        />

        <Field
          label="Alert After N Failures"
          value={alertAfterFails}
          onChange={setAlertAfterFails}
          placeholder="2"
          hint="Number of consecutive failed pings before sending a DOWN alert (prevents false alarms)"
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SaveBtn onClick={saveNotify} saved={savedNotify} />
          {(ntfyTopic || webhookUrl) && (
            <button onClick={testNotify} disabled={testing} style={{
              padding: "9px 16px", borderRadius: 10, background: "var(--indigo-dim)",
              border: "1px solid var(--indigo-glow)", color: "#a5b4fc",
              fontWeight: 600, fontSize: 13, cursor: testing ? "wait" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit",
              opacity: testing ? 0.7 : 1,
            }}>
              {testing ? <span className="spin" style={{ display: "inline-block" }}>↻</span> : "🔔"}
              Send Test Alert
            </button>
          )}
          {testResult && (
            <span style={{ fontSize: 12, color: testResult.includes("❌") ? "var(--red)" : "var(--green)" }}>{testResult}</span>
          )}
        </div>

        {/* ntfy instructions */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--indigo)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            How to set up ntfy.sh (free, 1 minute)
          </div>
          {[
            "Choose any topic name, e.g. my-alerts-123 (make it unique)",
            'Enter it in the field above and click Save',
            "Visit ntfy.sh/my-alerts-123 in your browser — click Subscribe",
            "On your phone: install the ntfy app, subscribe to the same topic",
            'Click "Send Test Alert" to verify it works',
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12, color: "var(--text-dim)" }}>
              <span style={{ color: "var(--indigo)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Watched projects status */}
      {watchStatus?.projects?.length > 0 && (
        <Section title="Server Watchdog Status" icon="📡">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {watchStatus.projects.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: p.status === "up" ? "var(--green)" : p.status === "down" ? "var(--red)" : "var(--text-dimmer)", boxShadow: p.status === "up" ? "0 0 6px var(--green)" : "none" }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{p.url?.replace(/^https?:\/\//, "").slice(0, 30)}</span>
                {p.responseTime && <span className="mono" style={{ fontSize: 10, color: p.responseTime < 500 ? "var(--green)" : p.responseTime < 1500 ? "var(--amber)" : "var(--red)" }}>{p.responseTime}ms</span>}
                {p.failCount > 0 && <span className="badge" style={{ background: "var(--red-dim)", color: "var(--red)" }}>{p.failCount} fails</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Render info */}
      <Section title="Render Deployment" icon="🚀">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { k: "Repo",    v: "github.com/daviddan-241/General-TEST" },
            { k: "Build",   v: "npm install && npm run build" },
            { k: "Start",   v: "npm run start" },
            { k: "Port",    v: "10000" },
            { k: "Node",    v: "18+" },
            { k: "DB",      v: "None required" },
            { k: "Env",     v: "PORT=10000  NODE_ENV=production" },
          ].map(r => (
            <div key={r.k} style={{ display: "flex", gap: 14, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ width: 60, fontSize: 11, color: "var(--text-dimmer)", flexShrink: 0 }}>{r.k}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--indigo)" }}>{r.v}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
