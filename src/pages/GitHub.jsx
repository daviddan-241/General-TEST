import React, { useState, useEffect } from "react";
import { Card, CardHeader, Badge, Btn, Input, Empty } from "../components/Card";

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function FileIcon({ type, name }) {
  if (type === "dir") return "📁";
  const ext = name.split(".").pop()?.toLowerCase();
  const icons = { js: "🟡", jsx: "⚛️", ts: "🔷", tsx: "⚛️", json: "📋", md: "📝", css: "🎨", html: "🌐", py: "🐍", go: "🐹", rs: "🦀", yml: "⚙️", yaml: "⚙️", sh: "💻", env: "🔑", txt: "📄" };
  return icons[ext] || "📄";
}

export default function GitHub() {
  const [repoInput, setRepoInput] = useState(localStorage.getItem("ma_last_repo") || "");
  const [token, setToken] = useState(localStorage.getItem("ma_gh_token") || "");
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState("");
  const [actions, setActions] = useState([]);

  const parseRepo = (input) => {
    const clean = input.trim().replace(/\/$/, "");
    const match = clean.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : (clean.includes("/") ? clean : null);
  };

  const fetchRepo = async () => {
    const r = parseRepo(repoInput);
    if (!r) { setError("Enter a valid GitHub repo URL or owner/name"); return; }
    setLoading(true); setError(""); setRepo(null); setCommits([]); setFiles([]); setCurrentPath(""); setSelectedFile(null);
    localStorage.setItem("ma_last_repo", repoInput);
    const q = token ? `?token=${encodeURIComponent(token)}` : "";

    try {
      const [repoRes, commitsRes, filesRes] = await Promise.all([
        fetch(`/api/github/repo?repo=${r}${token ? "&token=" + encodeURIComponent(token) : ""}`).then(r => r.json()),
        fetch(`/api/github/commits?repo=${r}&branch=${token ? "main&token=" + encodeURIComponent(token) : "main"}`).then(r => r.json()),
        fetch(`/api/github/files?repo=${r}${q}`).then(r => r.json()),
      ]);

      if (repoRes.message === "Not Found") { setError("Repo not found or is private. Add a GitHub token in Settings."); setLoading(false); return; }
      setRepo(repoRes);
      setCommits(Array.isArray(commitsRes) ? commitsRes : []);
      setFiles(Array.isArray(filesRes) ? filesRes.sort((a, b) => a.type === "dir" ? -1 : 1) : []);

      // Load actions if token provided
      if (token) {
        fetch(`/api/github/actions?repo=${r}&token=${encodeURIComponent(token)}`)
          .then(r => r.json())
          .then(d => setActions(d.workflow_runs || []))
          .catch(() => {});
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const browsePath = async (path, name) => {
    if (!repo) return;
    const r = parseRepo(repoInput);
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const res = await fetch(`/api/github/files?repo=${r}&path=${encodeURIComponent(path)}${q}`).then(r => r.json());
      if (Array.isArray(res)) {
        setFiles(res.sort((a, b) => a.type === "dir" ? -1 : 1));
        setCurrentPath(path);
        setSelectedFile(null);
        setFileContent("");
      } else if (res.content) {
        // It's a file
        const content = atob(res.content.replace(/\s/g, ""));
        setSelectedFile({ name, path });
        setFileContent(content);
      }
    } catch {}
  };

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    browsePath(parts.join("/"), "");
  };

  const triggerDeploy = async () => {
    if (!token) { setDeployMsg("Add a GitHub token in Settings first"); return; }
    const r = parseRepo(repoInput);
    setDeploying(true); setDeployMsg("");
    const res = await fetch("/api/github/deploy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: r, workflow: "deploy.yml", branch: repo?.default_branch || "main", token }),
    }).then(r => r.json());
    setDeployMsg(res.ok ? "✅ Deploy triggered!" : ("❌ " + (res.message || res.error || "Unknown error")));
    setDeploying(false);
  };

  const TABS = ["overview", "commits", "files", actions.length ? "actions" : null].filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>GitHub Browser</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-dimmer)", fontSize: 13 }}>
          Browse any public repo. Add your token (Settings) for private repos + Actions
        </p>
      </div>

      {/* Repo input */}
      <Card>
        <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input
            value={repoInput}
            onChange={setRepoInput}
            placeholder="https://github.com/owner/repo  or  owner/repo"
            onKeyDown={e => e.key === "Enter" && fetchRepo()}
            style={{ flex: 1, minWidth: 220, fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}
          />
          <Btn onClick={fetchRepo} loading={loading}>Load Repo</Btn>
        </div>
      </Card>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--red-dim)", border: "1px solid rgba(255,68,85,0.25)", color: "var(--red)", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {repo && (
        <>
          {/* Repo header */}
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 18, fontWeight: 800, color: "#fff", textDecoration: "none" }}>
                      🐙 {repo.full_name}
                    </a>
                    {repo.private && <Badge color="var(--yellow)">PRIVATE</Badge>}
                    {repo.archived && <Badge color="var(--red)">ARCHIVED</Badge>}
                    <Badge color="var(--blue)">{repo.default_branch}</Badge>
                  </div>
                  {repo.description && (
                    <p style={{ margin: "0 0 10px", color: "var(--text-dim)", fontSize: 13 }}>{repo.description}</p>
                  )}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                      { icon: "⭐", v: repo.stargazers_count?.toLocaleString() },
                      { icon: "🍴", v: repo.forks_count?.toLocaleString() },
                      { icon: "👁", v: repo.watchers_count?.toLocaleString() },
                      { icon: "📋", v: repo.open_issues_count + " issues" },
                      repo.language && { icon: "💻", v: repo.language },
                      { icon: "🕐", v: timeAgo(repo.updated_at) },
                    ].filter(Boolean).map((s, i) => (
                      <span key={i} className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                        {s.icon} {s.v}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="blue" small onClick={triggerDeploy} loading={deploying}>
                    🚀 Trigger Deploy
                  </Btn>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                    <Btn variant="secondary" small>↗ Open on GitHub</Btn>
                  </a>
                </div>
              </div>
              {deployMsg && (
                <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontSize: 12, color: deployMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>
                  {deployMsg}
                </div>
              )}
            </div>
          </Card>

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
                  {t === "commits" ? `Commits (${commits.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                {[
                  { label: "Stars", value: repo.stargazers_count?.toLocaleString(), icon: "⭐", color: "var(--yellow)" },
                  { label: "Forks", value: repo.forks_count?.toLocaleString(), icon: "🍴", color: "var(--blue)" },
                  { label: "Open Issues", value: repo.open_issues_count?.toLocaleString(), icon: "🐛", color: "var(--red)" },
                  { label: "Watchers", value: repo.watchers_count?.toLocaleString(), icon: "👁", color: "var(--text)" },
                  { label: "Language", value: repo.language || "—", icon: "💻", color: "var(--accent)" },
                  { label: "Default Branch", value: repo.default_branch, icon: "🌿", color: "var(--accent)" },
                  { label: "Size", value: repo.size ? `${(repo.size / 1024).toFixed(1)}MB` : "—", icon: "💾", color: "var(--text)" },
                  { label: "Last Updated", value: timeAgo(repo.updated_at), icon: "🕐", color: "var(--text-dim)" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dimmer)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "commits" && (
              <Card>
                <CardHeader title="Recent Commits" icon="📝" subtitle={`Last ${commits.length} commits`} />
                <div>
                  {commits.map(c => (
                    <div key={c.sha} style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {c.author?.avatar_url && (
                        <img src={c.author.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: 13, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.commit.message.split("\n")[0]}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--accent)" }}>
                            {c.sha.slice(0, 7)}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                            {c.commit.author?.name}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                            {timeAgo(c.commit.author?.date)}
                          </span>
                        </div>
                      </div>
                      <a href={c.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", fontSize: 12, textDecoration: "none", flexShrink: 0 }}>↗</a>
                    </div>
                  ))}
                  {commits.length === 0 && <Empty icon="📭" title="No commits found" />}
                </div>
              </Card>
            )}

            {tab === "files" && (
              <Card>
                <CardHeader
                  title={currentPath ? `/${currentPath}` : "/ (root)"}
                  icon="📁"
                  action={currentPath && <Btn small variant="secondary" onClick={goUp}>↑ Up</Btn>}
                />
                {selectedFile ? (
                  <div>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 600, color: "var(--accent)" }}>{selectedFile.name}</span>
                      <Btn small variant="secondary" onClick={() => { setSelectedFile(null); setFileContent(""); }}>← Back</Btn>
                    </div>
                    <pre className="mono" style={{
                      margin: 0, padding: 18, fontSize: 11, color: "var(--text-dim)",
                      overflowX: "auto", maxHeight: 600, overflowY: "auto",
                      background: "var(--surface2)", whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {fileContent || "(empty)"}
                    </pre>
                  </div>
                ) : (
                  <div>
                    {files.map(f => (
                      <div key={f.name}
                        onClick={() => f.type === "file" && f.size < 500000 ? browsePath(f.path, f.name) : f.type === "dir" ? browsePath(f.path, f.name) : null}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                          cursor: f.type === "file" && f.size >= 500000 ? "default" : "pointer",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>
                          <FileIcon type={f.type} name={f.name} />
                        </span>
                        <span style={{ flex: 1, color: f.type === "dir" ? "var(--blue)" : "var(--text)", fontSize: 13 }}>
                          {f.name}
                        </span>
                        {f.size > 0 && (
                          <span className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)" }}>
                            {f.size > 1024 ? `${(f.size / 1024).toFixed(1)}kb` : `${f.size}b`}
                          </span>
                        )}
                        {f.type === "file" && f.size < 500000 && (
                          <span style={{ fontSize: 10, color: "var(--text-dimmer)" }}>view</span>
                        )}
                      </div>
                    ))}
                    {files.length === 0 && <Empty icon="📭" title="No files" />}
                  </div>
                )}
              </Card>
            )}

            {tab === "actions" && (
              <Card>
                <CardHeader title="GitHub Actions" icon="⚙️" subtitle="Recent workflow runs" />
                <div>
                  {actions.slice(0, 10).map(run => (
                    <div key={run.id} style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18 }}>
                        {run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : run.status === "in_progress" ? "⏳" : "⏸"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>{run.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dimmer)" }}>
                          {run.head_branch} · {timeAgo(run.created_at)}
                        </div>
                      </div>
                      <Badge color={run.conclusion === "success" ? "var(--accent)" : run.conclusion === "failure" ? "var(--red)" : "var(--yellow)"}>
                        {run.conclusion || run.status}
                      </Badge>
                      <a href={run.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", textDecoration: "none" }}>↗</a>
                    </div>
                  ))}
                  {actions.length === 0 && <Empty icon="⚙️" title="No workflow runs found" desc="Actions require a GitHub token" />}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {!repo && !loading && (
        <Empty icon="🐙" title="Enter a GitHub repo" desc="Public repos work without a token. Add your token in Settings for private repos + Actions" />
      )}
    </div>
  );
}
