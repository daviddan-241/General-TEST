import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, StatusDot, Badge, Btn, Input, Empty } from "../components/Card";

const STORAGE_KEY = "master_admin_projects";

function loadProjects() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveProjects(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

export default function Dashboard() {
  const [projects, setProjects] = useState(loadProjects);
  const [addUrl, setAddUrl] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState({});

  const checkProject = useCallback(async (project) => {
    setChecking(c => ({ ...c, [project.id]: true }));
    try {
      const res = await fetch("/api/site/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: project.url }),
      });
      const data = await res.json();
      setProjects(prev => {
        const updated = prev.map(p => p.id === project.id
          ? { ...p, status: data.ok ? "up" : "down", statusCode: data.status, responseTime: data.responseTime, error: data.error, lastChecked: new Date().toISOString() }
          : p
        );
        saveProjects(updated);
        return updated;
      });
    } catch {
      setProjects(prev => {
        const updated = prev.map(p => p.id === project.id
          ? { ...p, status: "down", error: "Network error", lastChecked: new Date().toISOString() }
          : p
        );
        saveProjects(updated);
        return updated;
      });
    }
    setChecking(c => ({ ...c, [project.id]: false }));
  }, []);

  // Auto-ping all projects on mount + every 60s
  useEffect(() => {
    const ps = loadProjects();
    if (!ps.length) return;
    ps.forEach(p => checkProject(p));
    const t = setInterval(() => loadProjects().forEach(p => checkProject(p)), 60000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  const addProject = async () => {
    const url = addUrl.trim().replace(/\/$/, "");
    if (!url) return;
    setAdding(true);
    const id = Date.now().toString();
    const name = addName.trim() || new URL(url.startsWith("http") ? url : "https://" + url).hostname;
    const project = { id, name, url: url.startsWith("http") ? url : "https://" + url, status: "checking", addedAt: new Date().toISOString() };
    const updated = [...loadProjects(), project];
    saveProjects(updated);
    setProjects(updated);
    setAddUrl(""); setAddName("");
    await checkProject(project);
    setAdding(false);
  };

  const removeProject = (id) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    setProjects(updated);
  };

  const totalUp = projects.filter(p => p.status === "up").length;
  const totalDown = projects.filter(p => p.status === "down").length;
  const avgTime = projects.filter(p => p.responseTime).reduce((s, p) => s + p.responseTime, 0) / (projects.filter(p => p.responseTime).length || 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>Project Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
            Add any URL — live status checks every 60 seconds
          </p>
        </div>
        {projects.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color="var(--accent)">{totalUp} UP</Badge>
            {totalDown > 0 && <Badge color="var(--red)">{totalDown} DOWN</Badge>}
            <Badge color="var(--text-dim)">{Math.round(avgTime)}ms avg</Badge>
          </div>
        )}
      </div>

      {/* Add Project */}
      <Card>
        <CardHeader title="Add Project" icon="➕" subtitle="Paste any URL to start monitoring" />
        <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input
            value={addUrl}
            onChange={setAddUrl}
            placeholder="https://your-app.com or github.com/user/repo"
            onKeyDown={e => e.key === "Enter" && addProject()}
            style={{ flex: 2, minWidth: 220 }}
          />
          <Input
            value={addName}
            onChange={setAddName}
            placeholder="Name (optional)"
            style={{ flex: 1, minWidth: 140 }}
          />
          <Btn onClick={addProject} loading={adding}>
            Add & Ping
          </Btn>
        </div>
      </Card>

      {/* Stats row */}
      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { label: "Total Projects", value: projects.length, color: "var(--text)", icon: "🌐" },
            { label: "Online", value: totalUp, color: "var(--accent)", icon: "✅" },
            { label: "Offline", value: totalDown, color: totalDown ? "var(--red)" : "var(--text-dimmer)", icon: "❌" },
            { label: "Avg Response", value: `${Math.round(avgTime)}ms`, color: avgTime < 500 ? "var(--accent)" : avgTime < 1500 ? "var(--yellow)" : "var(--red)", icon: "⚡" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "16px 18px",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-dimmer)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <Empty icon="🌐" title="No projects yet" desc="Add a URL above to start monitoring it in real time" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map(p => {
            const isChecking = checking[p.id];
            const statusColor = p.status === "up" ? "var(--accent)" : p.status === "down" ? "var(--red)" : "#666";
            return (
              <Card key={p.id} style={{ transition: "border-color 0.2s", borderColor: p.status === "up" ? "rgba(0,255,136,0.1)" : p.status === "down" ? "rgba(255,68,85,0.15)" : "var(--border)" }}>
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  {/* Status dot */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {isChecking ? (
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#444", animation: "pulse 1s infinite" }} />
                    ) : (
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: statusColor,
                        boxShadow: p.status === "up" ? "0 0 8px var(--accent)" : p.status === "down" ? "0 0 8px var(--red)" : "none",
                      }} />
                    )}
                  </div>

                  {/* Name + URL */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{p.name}</div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--text-dimmer)", textDecoration: "none", fontFamily: "monospace" }}
                      onClick={e => e.stopPropagation()}>
                      {p.url}
                    </a>
                  </div>

                  {/* Status info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
                    {p.statusCode && (
                      <span className="mono" style={{
                        fontSize: 12, fontWeight: 700,
                        color: p.statusCode < 300 ? "var(--accent)" : p.statusCode < 400 ? "var(--yellow)" : "var(--red)",
                      }}>
                        {p.statusCode}
                      </span>
                    )}
                    {p.responseTime && (
                      <span className="mono" style={{
                        fontSize: 11, color: p.responseTime < 500 ? "var(--accent)" : p.responseTime < 1500 ? "var(--yellow)" : "var(--red)",
                      }}>
                        {p.responseTime}ms
                      </span>
                    )}
                    {p.error && (
                      <span style={{ fontSize: 11, color: "var(--red)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.error}
                      </span>
                    )}
                    {p.lastChecked && (
                      <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>
                        {new Date(p.lastChecked).toLocaleTimeString()}
                      </span>
                    )}
                    <Btn small variant="secondary" onClick={() => checkProject(p)} loading={isChecking}>
                      {isChecking ? "" : "↻"}
                    </Btn>
                    <Btn small variant="danger" onClick={() => removeProject(p.id)}>✕</Btn>
                  </div>
                </div>

                {/* Progress bar for response time */}
                {p.responseTime && (
                  <div style={{ height: 2, background: "var(--border)" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (p.responseTime / 3000) * 100)}%`,
                      background: p.responseTime < 500 ? "var(--accent)" : p.responseTime < 1500 ? "var(--yellow)" : "var(--red)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
