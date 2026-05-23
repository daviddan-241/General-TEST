import React, { useState } from "react";

const NAV = [
  { id: "dashboard", label: "Dashboard",  icon: "▦" },
  { id: "inspector", label: "Inspector",  icon: "◎" },
  { id: "github",    label: "GitHub",     icon: "⌥" },
  { id: "settings",  label: "Settings",   icon: "⚙" },
];

function StatusDot({ ok, loading }) {
  if (loading || ok === undefined) return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2a2a50", flexShrink: 0 }} />;
  return <div className={ok ? "dot dot-green" : "dot dot-red"} style={{ width: 6, height: 6 }} />;
}

export default function Sidebar({ page, projects, pingStatus, onNavigate, onAddProject }) {
  const [collapsed, setCollapsed] = useState(false);

  const activeProject = page.startsWith("project:") ? page.split(":")[1] : null;

  return (
    <aside style={{
      width: collapsed ? 60 : 230,
      minWidth: collapsed ? 60 : 230,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s, min-width 0.2s",
      overflow: "hidden",
      position: "relative",
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "18px 0" : "18px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: 8, flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 900, color: "#fff", flexShrink: 0,
            }}>M</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                MasterAdmin
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--text-dimmer)", letterSpacing: "0.06em" }}>
                v2.0 · UNIVERSAL
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#fff",
          }}>M</div>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{
          background: "none", border: "none", color: "var(--text-dimmer)",
          cursor: "pointer", fontSize: 14, padding: "4px 6px", borderRadius: 6,
          flexShrink: 0, lineHeight: 1,
        }}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{ padding: "10px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {NAV.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => onNavigate(n.id)} title={collapsed ? n.label : ""} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: collapsed ? "9px 0" : "9px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              background: active ? "var(--indigo-dim)" : "transparent",
              border: "1px solid transparent",
              borderColor: active ? "var(--indigo-glow)" : "transparent",
              borderRadius: 10, color: active ? "#a5b4fc" : "var(--text-dim)",
              fontWeight: active ? 700 : 400, fontSize: 13, cursor: "pointer",
              marginBottom: 2,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, fontStyle: "normal" }}>{n.icon}</span>
              {!collapsed && n.label}
            </button>
          );
        })}
      </nav>

      {/* Projects list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 10px", flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--text-dimmer)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Projects
            </span>
            <button onClick={onAddProject} style={{
              background: "var(--indigo-dim)", border: "1px solid var(--indigo-glow)",
              borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontSize: 14,
              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, lineHeight: 1, padding: 0,
            }} title="Add project">+</button>
          </div>
        )}

        {collapsed && (
          <button onClick={onAddProject} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", padding: "8px 0", background: "none", border: "none",
            color: "var(--text-dimmer)", cursor: "pointer", fontSize: 16, marginBottom: 4,
          }} title="Add project">+</button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {projects.map(p => {
            const active = activeProject === p.id;
            const ps = pingStatus[p.id];
            return (
              <button key={p.id} onClick={() => onNavigate(`project:${p.id}`)} title={collapsed ? p.name : ""} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: collapsed ? "8px 0" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(255,255,255,0.05)" : "transparent",
                border: "1px solid transparent",
                borderColor: active ? "var(--border2)" : "transparent",
                borderRadius: 10, cursor: "pointer", textAlign: "left",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: p.color || "#6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "#fff",
                  boxShadow: active ? `0 0 10px ${p.color || "#6366f1"}60` : "none",
                }}>
                  {p.name?.[0]?.toUpperCase() || "?"}
                </div>
                {!collapsed && (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: active ? 700 : 500,
                        color: active ? "#fff" : "var(--text-dim)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {p.name}
                      </div>
                      {p.url && (
                        <div style={{ fontSize: 10, color: "var(--text-dimmer)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.url.replace(/^https?:\/\//, "")}
                        </div>
                      )}
                    </div>
                    {p.url && <StatusDot ok={ps?.ok} loading={!ps} />}
                  </>
                )}
              </button>
            );
          })}

          {projects.length === 0 && !collapsed && (
            <div style={{ padding: "16px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📡</div>
              <div style={{ fontSize: 11, color: "var(--text-dimmer)", lineHeight: 1.5 }}>
                No projects yet.<br />Click + to add one.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      {!collapsed && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <a href="https://github.com/daviddan-241/General-TEST" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-dimmer)", fontSize: 11 }}>
            <span>⌥</span>
            <span className="mono">General-TEST</span>
            <span style={{ marginLeft: "auto" }}>↗</span>
          </a>
        </div>
      )}
    </aside>
  );
}
