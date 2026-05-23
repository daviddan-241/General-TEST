import React from "react";

export function Card({ children, style, onClick, className = "" }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }) {
  return (
    <div style={{
      padding: "16px 18px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--text-dimmer)", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatusDot({ ok, loading }) {
  if (loading) return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#666", flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: ok ? "var(--accent)" : "var(--red)",
      boxShadow: ok ? "0 0 6px var(--accent)" : "0 0 6px var(--red)",
    }} />
  );
}

export function Badge({ children, color = "var(--accent)", bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: bg || (color + "18"),
      color, border: `1px solid ${color}30`,
      fontFamily: "JetBrains Mono, monospace",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, disabled, variant = "primary", small, style, loading }) {
  const variants = {
    primary: { background: "var(--accent)", color: "#000", border: "none" },
    secondary: { background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border2)" },
    danger: { background: "transparent", color: "var(--red)", border: "1px solid rgba(255,68,85,0.3)" },
    blue: { background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid rgba(68,136,255,0.3)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variants[variant],
        padding: small ? "6px 12px" : "9px 18px",
        borderRadius: 9,
        fontWeight: 700,
        fontSize: small ? 11 : 13,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "opacity 0.15s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {loading ? <span className="spin" style={{ display: "inline-block" }}>↻</span> : null}
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", onKeyDown, style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      style={{ padding: "9px 13px", fontSize: 13, width: "100%", ...style }}
    />
  );
}

export function Empty({ icon = "📭", title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-dimmer)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dim)", marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 12 }}>{desc}</div>}
    </div>
  );
}
