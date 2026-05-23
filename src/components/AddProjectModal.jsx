import React, { useState } from "react";
import { parseGitHubRepo } from "../store";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

export default function AddProjectModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [github, setGithub] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const cleanUrl = url.trim().replace(/\/$/, "");
    const cleanGh = github.trim().replace(/\/$/, "");

    if (!cleanUrl && !cleanGh) {
      setError("Add at least a live URL or a GitHub repo");
      return;
    }

    const fullUrl = cleanUrl ? (cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`) : "";
    const repoSlug = parseGitHubRepo(cleanGh) || (cleanGh.includes("/") ? cleanGh : "");
    const autoName = name.trim() || (repoSlug ? repoSlug.split("/")[1] : "") || (fullUrl ? new URL(fullUrl).hostname : "New Project");

    setLoading(true);
    setError("");

    await onAdd({
      name: autoName,
      url: fullUrl,
      github: repoSlug,
      color,
    });

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", border: "1px solid var(--border2)",
          borderRadius: 20, padding: 28, width: "100%", maxWidth: 480,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>Add Project</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dimmer)" }}>
              Enter a live URL, GitHub repo, or both
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-dimmer)",
            cursor: "pointer", fontSize: 20, padding: 4, borderRadius: 8, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Project Color
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: "50%", background: c,
                border: color === c ? "3px solid #fff" : "3px solid transparent",
                cursor: "pointer", boxShadow: color === c ? `0 0 10px ${c}80` : "none",
                transition: "all 0.15s",
              }} />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          padding: "12px 14px", background: "var(--surface2)", borderRadius: 12,
          border: "1px solid var(--border)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
            boxShadow: `0 0 14px ${color}50`,
          }}>
            {name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
              {name || "Project Name"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
              {url ? url.replace(/^https?:\/\//, "") : (github || "no url yet")}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Project Name" placeholder="My App (auto-filled from URL)" value={name} onChange={setName} />
          <Field label="Live URL" placeholder="https://myapp.com or myapp.replit.app" value={url} onChange={setUrl} mono />
          <Field label="GitHub Repo" placeholder="https://github.com/user/repo or user/repo" value={github} onChange={setGithub} mono />
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10,
            background: "none", border: "1px solid var(--border2)", color: "var(--text-dim)",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleAdd} disabled={loading} style={{
            flex: 2, padding: "10px 16px", borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading ? <><span className="spin" style={{ display: "inline-block" }}>↻</span> Analyzing…</> : "Add & Analyze →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, mono }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 13px", fontSize: 12,
          fontFamily: mono ? "JetBrains Mono, monospace" : "inherit",
          borderRadius: 10, background: "var(--surface2)",
          border: "1px solid var(--border2)", color: "var(--text)", outline: "none",
        }}
        onFocus={e => { e.target.style.borderColor = "var(--indigo)"; e.target.style.boxShadow = "0 0 0 3px var(--indigo-dim)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--border2)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}
