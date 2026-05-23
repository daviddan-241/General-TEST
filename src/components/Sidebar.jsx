import React, { useState } from "react";

const NAV = [
  { id: "dashboard", label: "Dashboard",  icon: "⚡", desc: "All projects" },
  { id: "inspector", label: "Inspector",  icon: "🔍", desc: "Site analysis" },
  { id: "github",    label: "GitHub",     icon: "🐙", desc: "Repo browser" },
  { id: "settings",  label: "Settings",   icon: "⚙️",  desc: "Token & prefs" },
];

export default function Sidebar({ page, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 64 : 220,
        minWidth: collapsed ? 64 : 220,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s, min-width 0.2s",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? "20px 16px" : "20px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: 10,
      }}>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "-0.02em" }}>
              ⚡ Master<span style={{ color: "var(--accent)" }}>Admin</span>
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)", marginTop: 2 }}>
              UNIVERSAL CONTROL
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: "none", border: "none", color: "var(--text-dimmer)",
            cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6,
            flexShrink: 0,
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((n) => {
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                borderRadius: 10,
                background: active ? "var(--accent-dim)" : "transparent",
                border: active ? "1px solid rgba(0,255,136,0.2)" : "1px solid transparent",
                color: active ? "var(--accent)" : "var(--text-dim)",
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                justifyContent: collapsed ? "center" : "flex-start",
                transition: "all 0.15s",
                textAlign: "left",
                width: "100%",
              }}
              title={collapsed ? n.label : ""}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && (
                <div>
                  <div>{n.label}</div>
                  <div style={{ fontSize: 10, color: active ? "rgba(0,255,136,0.5)" : "var(--text-dimmer)", fontWeight: 400 }}>
                    {n.desc}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: 10,
          color: "var(--text-dimmer)",
        }}>
          <div className="mono">v1.0.0 · Master Admin</div>
          <div style={{ marginTop: 4 }}>
            <a href="https://github.com/daviddan-241/General-TEST" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none" }}>
              General-TEST repo ↗
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
