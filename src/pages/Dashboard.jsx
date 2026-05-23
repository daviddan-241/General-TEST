import React from "react";
import { TECH_META } from "../store";

function timeAgo(iso) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatusBar({ ok, responseTime }) {
  const color = ok === undefined ? "var(--border2)" : ok ? "var(--green)" : "var(--red)";
  const pct = responseTime ? Math.min(100, (responseTime / 3000) * 100) : 0;
  return (
    <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 12 }}>
      <div style={{
        height: "100%", borderRadius: 2, width: ok === undefined ? "0%" : ok ? `${pct}%` : "100%",
        background: color, transition: "width 0.6s ease",
        opacity: ok === undefined ? 0 : 1,
      }} />
    </div>
  );
}

function TechPill({ name }) {
  const meta = TECH_META[name] || { icon: "◆", color: "var(--text-dimmer)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30`,
    }}>
      <span style={{ fontSize: 9 }}>{meta.icon}</span>
      {name}
    </span>
  );
}

export default function Dashboard({ projects, pingStatus, onNavigate, onAddProject }) {
  const up = projects.filter(p => pingStatus[p.id]?.ok).length;
  const down = projects.filter(p => p.url && pingStatus[p.id] && !pingStatus[p.id]?.ok).length;
  const unknown = projects.filter(p => p.url && !pingStatus[p.id]).length;
  const avgTime = (() => {
    const times = projects.map(p => pingStatus[p.id]?.responseTime).filter(Boolean);
    return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>
            All Projects
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · auto-pings every 30s
          </p>
        </div>
        <button onClick={onAddProject} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 12,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
          cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          transition: "all 0.15s",
        }}>
          <span style={{ fontSize: 16, fontWeight: 400 }}>+</span>
          Add Project
        </button>
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {[
            { label: "Total", value: projects.length, color: "#fff", icon: "◈", bg: "var(--surface2)" },
            { label: "Online", value: up, color: "var(--green)", icon: "●", bg: "var(--green-dim)" },
            { label: "Offline", value: down, color: down ? "var(--red)" : "var(--text-dimmer)", icon: "●", bg: down ? "var(--red-dim)" : "var(--surface2)" },
            { label: "Avg Speed", value: avgTime ? `${avgTime}ms` : "—", color: avgTime && avgTime < 500 ? "var(--green)" : avgTime && avgTime < 1500 ? "var(--amber)" : "#fff", icon: "⚡", bg: "var(--surface2)" },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: "1px solid var(--border)", borderRadius: 14,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: 10, color: "var(--text-dimmer)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, fontFamily: "JetBrains Mono, monospace", letterSpacing: "-0.04em" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 24px",
          background: "var(--surface)", border: "1px dashed var(--border2)",
          borderRadius: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>◈</div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-dim)" }}>No projects yet</h3>
          <p style={{ margin: "8px 0 20px", color: "var(--text-dimmer)", fontSize: 13 }}>
            Add a project URL or GitHub repo to start monitoring
          </p>
          <button onClick={onAddProject} style={{
            padding: "10px 24px", borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            + Add your first project
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
          {projects.map(p => {
            const ps = pingStatus[p.id];
            const isUp = ps?.ok;
            const isDown = ps && !ps.ok;
            const statusColor = isUp ? "var(--green)" : isDown ? "var(--red)" : "var(--text-dimmer)";
            const statusLabel = isUp ? "Online" : isDown ? "Offline" : "Checking";

            return (
              <div key={p.id}
                onClick={() => onNavigate(`project:${p.id}`)}
                style={{
                  background: "var(--surface)", borderRadius: 16,
                  border: `1px solid ${isUp ? "rgba(16,185,129,0.12)" : isDown ? "rgba(239,68,68,0.12)" : "var(--border)"}`,
                  padding: "18px 20px", cursor: "pointer",
                  transition: "all 0.15s",
                  position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.color + "40"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.25)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isUp ? "rgba(16,185,129,0.12)" : isDown ? "rgba(239,68,68,0.12)" : "var(--border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Accent stripe */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.color, borderRadius: "16px 16px 0 0" }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: p.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0,
                    boxShadow: `0 0 16px ${p.color}40`,
                  }}>
                    {p.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, boxShadow: isUp ? `0 0 6px var(--green)` : isDown ? `0 0 6px var(--red)` : "none" }} />
                      <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                      {ps?.responseTime && (
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)" }}>
                          {ps.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--border2)" }}>›</div>
                </div>

                {/* URL + GitHub */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {p.url && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🌐 {p.url.replace(/^https?:\/\//, "")}
                    </div>
                  )}
                  {p.github && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ⌥ {p.github}
                    </div>
                  )}
                </div>

                {/* Tech pills */}
                {p.tech?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                    {p.tech.slice(0, 5).map(t => <TechPill key={t} name={t} />)}
                    {p.tech.length > 5 && (
                      <span style={{ fontSize: 10, color: "var(--text-dimmer)", padding: "2px 6px" }}>+{p.tech.length - 5}</span>
                    )}
                  </div>
                )}

                {/* Status bar */}
                <StatusBar ok={ps?.ok} responseTime={ps?.responseTime} />

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>
                    Added {timeAgo(p.addedAt)}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>
                    Checked {timeAgo(ps?.lastChecked)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
