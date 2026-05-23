import React, { useState } from "react";
import { detectTech, TECH_META } from "../store";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function FileIcon({ type, name }) {
  if (type === "dir") return "📁";
  const ext = name?.split(".").pop()?.toLowerCase();
  const m = { js: "🟡", jsx: "⚛️", ts: "🔷", tsx: "⚛️", json: "📋", md: "📝", css: "🎨", html: "🌐", py: "🐍", go: "🐹", rs: "🦀", yml: "⚙️", yaml: "⚙️", sh: "💻", lock: "🔒", svg: "🖼️" };
  return m[ext] || "📄";
}

function Btn({ children, onClick, loading, variant = "primary", small }) {
  const styles = {
    primary:   { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff" },
    secondary: { background: "transparent", border: "1px solid var(--border2)", color: "var(--text-dim)" },
    green:     { background: "var(--green-dim)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" },
    red:       { background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--red)" },
  };
  return (
    <button onClick={onClick} disabled={loading} style={{
      ...styles[variant], padding: small ? "5px 12px" : "9px 18px", borderRadius: 10,
      fontWeight: 700, fontSize: small ? 11 : 13, cursor: loading ? "wait" : "pointer",
      opacity: loading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "inherit", transition: "all 0.15s",
    }}>
      {loading && <span className="spin" style={{ display: "inline-block" }}>↻</span>}
      {children}
    </button>
  );
}

export default function GitHub() {
  const [input, setInput] = useState(localStorage.getItem("ma_last_ghrepo") || "");
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [actions, setActions] = useState([]);
  const [tech, setTech] = useState([]);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState("");

  const token = localStorage.getItem("ma_gh_token") || "";

  const parseRepo = (s) => {
    const clean = s.trim().replace(/\/$/, "");
    const m = clean.match(/github\.com\/([^/\s]+\/[^/\s]+)/);
    return m ? m[1].replace(/\.git$/, "") : (clean.includes("/") ? clean : null);
  };

  const load = async () => {
    const r = parseRepo(input);
    if (!r) { setError("Enter a valid GitHub repo URL or owner/name"); return; }
    setLoading(true); setError(""); setRepo(null); setCommits([]); setFiles([]); setCurrentPath(""); setSelectedFile(null); setTech([]);
    localStorage.setItem("ma_last_ghrepo", input);
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const [ri, ci, fi] = await Promise.all([
        fetch(`/api/github/repo?repo=${r}${q}`).then(x => x.json()),
        fetch(`/api/github/commits?repo=${r}&branch=main${q}`).then(x => x.json()),
        fetch(`/api/github/files?repo=${r}${q}`).then(x => x.json()),
      ]);
      if (ri.message === "Not Found") { setError("Repo not found. Make sure it's public, or add your GitHub token in Settings."); setLoading(false); return; }
      setRepo(ri);
      setCommits(Array.isArray(ci) ? ci : []);
      const tree = Array.isArray(fi) ? fi.sort((a, b) => a.type === "dir" ? -1 : 1) : [];
      setFiles(tree);
      const detected = detectTech(tree);
      setTech(detected);

      // Enrich with package.json if present
      const pkg = tree.find(f => f.name === "package.json");
      if (pkg) {
        fetch(`/api/github/files?repo=${r}&path=package.json${q}`).then(x => x.json()).then(d => {
          if (d.content) { try { const p = JSON.parse(atob(d.content.replace(/\s/g, ""))); setTech(detectTech(tree, p)); } catch {} }
        }).catch(() => {});
      }
      if (token) {
        fetch(`/api/github/actions?repo=${r}${q}`).then(x => x.json()).then(d => setActions(d.workflow_runs || [])).catch(() => {});
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const browse = async (path) => {
    const r = parseRepo(input);
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const res = await fetch(`/api/github/files?repo=${r}&path=${encodeURIComponent(path)}${q}`).then(x => x.json());
      if (Array.isArray(res)) { setFiles(res.sort((a, b) => a.type === "dir" ? -1 : 1)); setCurrentPath(path); setSelectedFile(null); }
      else if (res.content) { setSelectedFile({ name: path.split("/").pop(), path }); setFileContent(atob(res.content.replace(/\s/g, ""))); }
    } catch {}
  };

  const triggerDeploy = async () => {
    if (!token) { setDeployMsg("Add a GitHub token in Settings first"); return; }
    setDeploying(true); setDeployMsg("");
    const res = await fetch("/api/github/deploy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: parseRepo(input), branch: repo?.default_branch || "main", token }),
    }).then(r => r.json());
    setDeployMsg(res.ok ? "✅ Deploy triggered!" : "❌ " + (res.message || "Failed"));
    setDeploying(false);
  };

  const TABS = ["overview", "commits", "files", ...(actions.length ? ["actions"] : [])];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>GitHub Browser</h1>
        <p style={{ margin: "5px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
          Browse any repo — commits, files, actions, and deploy triggers
        </p>
      </div>

      {/* Input */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="https://github.com/owner/repo or owner/repo"
            style={{
              flex: 1, minWidth: 260, padding: "11px 14px", fontSize: 13,
              fontFamily: "JetBrains Mono, monospace", background: "var(--surface2)",
              border: "1px solid var(--border2)", borderRadius: 10, color: "var(--text)",
            }}
          />
          <Btn onClick={load} loading={loading}>⌥ Load Repo</Btn>
        </div>
        {!token && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--amber)", display: "flex", alignItems: "center", gap: 6 }}>
            ⚠ No GitHub token — only public repos work. Add a token in Settings for private repos + Actions.
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {repo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
          {/* Repo hero */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>⌥ {repo.full_name}</span>
                  <span style={{ color: "var(--text-dimmer)", fontSize: 14 }}>↗</span>
                </a>
                {repo.description && <p style={{ margin: "0 0 10px", color: "var(--text-dim)", fontSize: 13 }}>{repo.description}</p>}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {[
                    { icon: "⭐", v: repo.stargazers_count?.toLocaleString() },
                    { icon: "🍴", v: repo.forks_count },
                    { icon: "👁", v: repo.watchers_count },
                    { icon: "🐛", v: `${repo.open_issues_count} issues` },
                    repo.language && { icon: "💻", v: repo.language },
                    { icon: "🕐", v: timeAgo(repo.updated_at) },
                  ].filter(Boolean).map((s, i) => (
                    <span key={i} className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>{s.icon} {s.v}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn variant="green" onClick={triggerDeploy} loading={deploying} small>🚀 Trigger Deploy</Btn>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer"><Btn variant="secondary" small>↗ Open</Btn></a>
              </div>
            </div>
            {deployMsg && (
              <div style={{ marginTop: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontSize: 12, display: "inline-block", color: deployMsg.startsWith("✅") ? "var(--green)" : "var(--red)" }}>
                {deployMsg}
              </div>
            )}
          </div>

          {/* Tech stack */}
          {tech.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Tech Stack</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tech.map(t => {
                  const meta = TECH_META[t] || { icon: "◆", color: "#888" };
                  return (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: `${meta.color}12`, border: `1px solid ${meta.color}25`, fontSize: 13, fontWeight: 700, color: meta.color }}>
                      {meta.icon} {t}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div>
            <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "9px 16px", background: "none", border: "none",
                  borderBottom: tab === t ? "2px solid var(--indigo)" : "2px solid transparent",
                  color: tab === t ? "#a5b4fc" : "var(--text-dimmer)",
                  fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 13,
                  marginBottom: -1, textTransform: "capitalize", fontFamily: "inherit",
                }}>
                  {t === "commits" ? `Commits (${commits.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                {[
                  { label: "Stars",    value: repo.stargazers_count?.toLocaleString(), color: "var(--amber)", icon: "⭐" },
                  { label: "Forks",    value: repo.forks_count?.toLocaleString(), color: "var(--blue)", icon: "🍴" },
                  { label: "Issues",   value: repo.open_issues_count?.toLocaleString(), color: repo.open_issues_count > 0 ? "var(--red)" : "var(--green)", icon: "🐛" },
                  { label: "Watchers", value: repo.watchers_count?.toLocaleString(), color: "var(--text)", icon: "👁" },
                  { label: "Language", value: repo.language || "—", color: "var(--indigo)", icon: "💻" },
                  { label: "Branch",   value: repo.default_branch, color: "var(--green)", icon: "🌿" },
                  { label: "Size",     value: repo.size ? `${(repo.size / 1024).toFixed(1)}MB` : "—", color: "var(--text)", icon: "💾" },
                  { label: "Updated",  value: timeAgo(repo.updated_at), color: "var(--text-dim)", icon: "🕐" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dimmer)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "commits" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {commits.map(c => (
                  <div key={c.sha} style={{ display: "flex", gap: 12, padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
                    {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e4f0", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.commit.message.split("\n")[0]}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <span className="mono" style={{ fontSize: 10, color: "var(--indigo)" }}>{c.sha.slice(0, 7)}</span>
                        <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{c.commit.author?.name}</span>
                        <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{timeAgo(c.commit.author?.date)}</span>
                      </div>
                    </div>
                    <a href={c.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", fontSize: 12, flexShrink: 0 }}>↗</a>
                  </div>
                ))}
                {commits.length === 0 && <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dimmer)" }}>No commits found</div>}
              </div>
            )}

            {tab === "files" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {selectedFile ? (
                  <div>
                    <div style={{ display: "flex", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                      <span style={{ color: "var(--green)", fontWeight: 600 }}>{selectedFile.name}</span>
                      <Btn variant="secondary" small onClick={() => { setSelectedFile(null); setFileContent(""); }}>← Back</Btn>
                    </div>
                    <pre className="mono" style={{ margin: 0, padding: 18, fontSize: 11, color: "var(--text-dim)", overflowX: "auto", maxHeight: 560, overflowY: "auto", background: "var(--surface2)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}>
                      {fileContent || "(empty)"}
                    </pre>
                  </div>
                ) : (
                  <div>
                    {currentPath && (
                      <div style={{ padding: "8px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                        <Btn variant="secondary" small onClick={() => { const p = currentPath.split("/").filter(Boolean); p.pop(); browse(p.join("/")); }}>↑ Up</Btn>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>/{currentPath}</span>
                      </div>
                    )}
                    {files.map(f => (
                      <div key={f.name} onClick={() => f.type === "dir" ? browse(f.path) : browse(f.path)}
                        style={{ display: "flex", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 14 }}><FileIcon type={f.type} name={f.name} /></span>
                        <span style={{ flex: 1, fontSize: 13, color: f.type === "dir" ? "#a5b4fc" : "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>{f.name}{f.type === "dir" ? "/" : ""}</span>
                        {f.size > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}kb` : `${f.size}b`}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "actions" && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {actions.slice(0, 10).map(run => (
                  <div key={run.id} style={{ display: "flex", gap: 12, padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : run.status === "in_progress" ? "⏳" : "⏸"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{run.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{run.head_branch} · {timeAgo(run.created_at)}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: run.conclusion === "success" ? "var(--green-dim)" : run.conclusion === "failure" ? "var(--red-dim)" : "var(--amber-dim)", color: run.conclusion === "success" ? "var(--green)" : run.conclusion === "failure" ? "var(--red)" : "var(--amber)" }}>
                      {run.conclusion || run.status}
                    </span>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", fontSize: 12 }}>↗</a>
                  </div>
                ))}
                {actions.length === 0 && (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dimmer)", fontSize: 13 }}>
                    No workflow runs. Actions require a GitHub token with workflow scope.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!repo && !loading && (
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--surface)", border: "1px dashed var(--border2)", borderRadius: 20, color: "var(--text-dimmer)" }}>
          <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.3 }}>⌥</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>Enter a GitHub repo</div>
          <div style={{ fontSize: 13 }}>Public repos work without a token. Add your token in Settings for private repos, Actions, and deploy triggers.</div>
        </div>
      )}
    </div>
  );
}
