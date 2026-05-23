import React, { useState, useEffect, useCallback } from "react";
import { detectTech, parseGitHubRepo, TECH_META } from "../store";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function Section({ title, icon, children, action, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", borderBottom: open ? "1px solid var(--border)" : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {action}
          <span style={{ color: "var(--text-dimmer)", fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

function TechBadge({ name }) {
  const meta = TECH_META[name] || { icon: "◆", color: "#888" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 10,
      background: `${meta.color}10`, border: `1px solid ${meta.color}25`,
      minWidth: 100,
    }}>
      <span style={{ fontSize: 18 }}>{meta.icon}</span>
      <span style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>{name}</span>
    </div>
  );
}

function FileIcon({ type, name }) {
  if (type === "dir") return "📁";
  const ext = name?.split(".").pop()?.toLowerCase();
  const m = { js: "🟡", jsx: "⚛️", ts: "🔷", tsx: "⚛️", json: "📋", md: "📝", css: "🎨", html: "🌐", py: "🐍", go: "🐹", rs: "🦀", yml: "⚙️", yaml: "⚙️", sh: "💻", env: "🔑", toml: "📦", lock: "🔒", svg: "🖼️", png: "🖼️" };
  return m[ext] || "📄";
}

function StatBox({ label, value, color = "#fff", sub }) {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", minWidth: 100 }}>
      <div style={{ fontSize: 10, color: "var(--text-dimmer)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: "-0.03em" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-dimmer)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SmallBtn({ children, onClick, loading, color = "var(--text-dim)", border = "var(--border2)" }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "6px 12px", borderRadius: 8, background: "transparent",
      border: `1px solid ${border}`, color, fontWeight: 600, fontSize: 11,
      cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
      display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit",
    }}>
      {loading ? <span className="spin" style={{ display: "inline-block" }}>↻</span> : null}
      {children}
    </button>
  );
}

export default function ProjectPage({ project, pingStatus, onUpdate, onDelete, onNavigate }) {
  const [siteData, setSiteData] = useState(null);
  const [repoInfo, setRepoInfo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [actions, setActions] = useState([]);
  const [packageJson, setPackageJson] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState({ site: false, repo: false, files: false, deploy: false, analyze: false });
  const [deployMsg, setDeployMsg] = useState("");
  const [pinging, setPinging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const token = localStorage.getItem("ma_gh_token") || "";

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  // Auto-load on mount
  useEffect(() => {
    if (project.url && !siteData) loadSite();
    if (project.github && !repoInfo) loadRepo();
  }, [project.id]); // eslint-disable-line

  const loadSite = useCallback(async () => {
    if (!project.url) return;
    setLoad("site", true);
    try {
      const [check, analyze] = await Promise.all([
        fetch("/api/site/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: project.url }) }).then(r => r.json()),
        fetch("/api/site/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: project.url }) }).then(r => r.json()),
      ]);
      const data = { ...check, ...analyze };
      setSiteData(data);
      if (analyze.tech?.length) {
        onUpdate({ tech: [...new Set([...(project.tech || []), ...analyze.tech])] });
      }
    } catch {}
    setLoad("site", false);
  }, [project.url]); // eslint-disable-line

  const loadRepo = useCallback(async () => {
    if (!project.github) return;
    setLoad("repo", true);
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const [info, cms, files] = await Promise.all([
        fetch(`/api/github/repo?repo=${project.github}${q}`).then(r => r.json()),
        fetch(`/api/github/commits?repo=${project.github}&branch=main${q}`).then(r => r.json()),
        fetch(`/api/github/files?repo=${project.github}${q}`).then(r => r.json()),
      ]);
      if (!info.message) {
        setRepoInfo(info);
        setCommits(Array.isArray(cms) ? cms : []);
        const tree = Array.isArray(files) ? files.sort((a, b) => a.type === "dir" ? -1 : 1) : [];
        setFileTree(tree);

        // Detect tech from file names
        const detectedTech = detectTech(tree);

        // Fetch package.json for deeper analysis
        const pkgFile = tree.find(f => f.name === "package.json");
        if (pkgFile) {
          const pkgRes = await fetch(`/api/github/files?repo=${project.github}&path=package.json${q}`).then(r => r.json());
          if (pkgRes.content) {
            try {
              const parsed = JSON.parse(atob(pkgRes.content.replace(/\s/g, "")));
              setPackageJson(parsed);
              const moreTech = detectTech(tree, parsed);
              onUpdate({ tech: [...new Set([...(project.tech || []), ...moreTech])] });
            } catch {}
          }
        } else {
          onUpdate({ tech: [...new Set([...(project.tech || []), ...detectedTech])] });
        }

        // Load actions if token
        if (token) {
          fetch(`/api/github/actions?repo=${project.github}${q}`).then(r => r.json()).then(d => setActions(d.workflow_runs || [])).catch(() => {});
        }
      }
    } catch {}
    setLoad("repo", false);
  }, [project.github, token]); // eslint-disable-line

  const browseDir = async (path) => {
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const res = await fetch(`/api/github/files?repo=${project.github}&path=${encodeURIComponent(path)}${q}`).then(r => r.json());
      if (Array.isArray(res)) { setFileTree(res.sort((a, b) => a.type === "dir" ? -1 : 1)); setCurrentPath(path); setSelectedFile(null); }
    } catch {}
  };

  const viewFile = async (file) => {
    if (file.size > 500000) return;
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    try {
      const res = await fetch(`/api/github/files?repo=${project.github}&path=${encodeURIComponent(file.path)}${q}`).then(r => r.json());
      if (res.content) { setSelectedFile(file); setFileContent(atob(res.content.replace(/\s/g, ""))); }
    } catch {}
  };

  const pingNow = async () => {
    if (!project.url) return;
    setPinging(true);
    try {
      const r = await fetch("/api/watch/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: project.url }) }).then(r => r.json());
      onUpdate({ lastPing: r });
    } catch {}
    setPinging(false);
  };

  const triggerDeploy = async () => {
    if (!token) { setDeployMsg("Add a GitHub token in Settings first"); return; }
    setLoad("deploy", true); setDeployMsg("");
    const res = await fetch("/api/github/deploy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: project.github, branch: repoInfo?.default_branch || "main", token }),
    }).then(r => r.json());
    setDeployMsg(res.ok ? "✅ Deploy triggered!" : "❌ " + (res.message || res.error || "Failed"));
    setLoad("deploy", false);
  };

  const ps = pingStatus;
  const statusOk = ps?.ok;
  const statusColor = statusOk ? "var(--green)" : ps ? "var(--red)" : "var(--text-dimmer)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">
      {/* Hero header */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "24px 26px", position: "relative", overflow: "hidden",
      }}>
        {/* Color stripe */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${project.color}, ${project.color}80)` }} />
        {/* Glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${project.color}18, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: project.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0,
            boxShadow: `0 0 24px ${project.color}50`,
          }}>
            {project.name?.[0]?.toUpperCase() || "?"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
              {project.name}
            </h1>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
              {project.url && (
                <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--text-dimmer)", display: "flex", alignItems: "center", gap: 4 }}>
                  🌐 <span className="mono">{project.url.replace(/^https?:\/\//, "")}</span> ↗
                </a>
              )}
              {project.github && (
                <a href={`https://github.com/${project.github}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--text-dimmer)", display: "flex", alignItems: "center", gap: 4 }}>
                  ⌥ <span className="mono">{project.github}</span> ↗
                </a>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {project.url && (
              <SmallBtn onClick={pingNow} loading={pinging} color="var(--green)" border="rgba(16,185,129,0.3)">
                ↻ Ping
              </SmallBtn>
            )}
            {project.github && (
              <SmallBtn onClick={triggerDeploy} loading={loading.deploy} color="#a5b4fc" border="var(--indigo-glow)">
                🚀 Deploy
              </SmallBtn>
            )}
            {project.github && (
              <a href={`https://github.com/${project.github}`} target="_blank" rel="noopener noreferrer">
                <SmallBtn>↗ GitHub</SmallBtn>
              </a>
            )}
            <SmallBtn onClick={() => setConfirmDelete(true)} color="var(--red)" border="rgba(239,68,68,0.25)">
              🗑
            </SmallBtn>
          </div>
        </div>

        {deployMsg && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontSize: 12, color: deployMsg.startsWith("✅") ? "var(--green)" : "var(--red)", display: "inline-block" }}>
            {deployMsg}
          </div>
        )}

        {confirmDelete && (
          <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--red)" }}>Remove this project?</span>
            <SmallBtn onClick={onDelete} color="var(--red)" border="rgba(239,68,68,0.4)">Yes, remove</SmallBtn>
            <SmallBtn onClick={() => setConfirmDelete(false)}>Cancel</SmallBtn>
          </div>
        )}
      </div>

      {/* Tech stack — shown if we have it */}
      {project.tech?.length > 0 && (
        <Section title="Tech Stack Detected" icon="🛠️" defaultOpen>
          <div style={{ padding: "16px 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {project.tech.map(t => <TechBadge key={t} name={t} />)}
          </div>
        </Section>
      )}

      {/* Live site health */}
      {project.url && (
        <Section
          title="Live Site Status"
          icon="🌐"
          defaultOpen
          action={
            <SmallBtn onClick={loadSite} loading={loading.site}>
              ↻ Refresh
            </SmallBtn>
          }
        >
          {loading.site && !siteData ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-dimmer)", fontSize: 13 }}>
              <span className="spin" style={{ display: "inline-block", marginRight: 8 }}>↻</span> Analyzing site…
            </div>
          ) : siteData ? (
            <div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, padding: "16px 18px" }}>
                <StatBox label="Status"
                  value={siteData.ok ? "Online" : "Offline"}
                  color={siteData.ok ? "var(--green)" : "var(--red)"}
                  sub={siteData.status ? `HTTP ${siteData.status}` : undefined}
                />
                <StatBox label="Response"
                  value={siteData.responseTime ? `${siteData.responseTime}ms` : "—"}
                  color={siteData.responseTime < 500 ? "var(--green)" : siteData.responseTime < 1500 ? "var(--amber)" : "var(--red)"}
                />
                <StatBox label="Page Size"
                  value={siteData.htmlLength ? `${(siteData.htmlLength / 1024).toFixed(1)}kb` : "—"}
                />
                {siteData.title && (
                  <StatBox label="Title" value={siteData.title.slice(0, 20) + (siteData.title.length > 20 ? "…" : "")} />
                )}
              </div>

              {/* Meta */}
              {siteData.metas && Object.keys(siteData.metas).length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px" }}>
                  <div className="section-title">Page Meta</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 4 }}>
                    {Object.entries(siteData.metas).slice(0, 12).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 8, fontSize: 11 }}>
                        <span className="mono" style={{ color: "var(--indigo)", flexShrink: 0, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
                        <span style={{ color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key headers */}
              {siteData.headers && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px" }}>
                  <div className="section-title">Key Headers</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {["server", "x-powered-by", "content-type", "cache-control", "x-frame-options", "strict-transport-security", "content-security-policy"].map(h =>
                      siteData.headers[h] ? (
                        <div key={h} style={{ display: "flex", gap: 10, fontSize: 11 }}>
                          <span className="mono" style={{ color: "var(--green)", width: 200, flexShrink: 0 }}>{h}</span>
                          <span style={{ color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siteData.headers[h]}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Images preview */}
              {siteData.images?.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px" }}>
                  <div className="section-title">Images ({siteData.images.length})</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {siteData.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                        <img src={img} alt="" style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)", display: "block" }}
                          onError={e => { e.target.style.display = "none"; }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Live preview */}
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <div style={{ padding: "10px 18px" }}>
                  <div className="section-title">Live Preview (iframe)</div>
                </div>
                <iframe src={project.url} style={{ width: "100%", height: 400, border: "none", display: "block" }}
                  sandbox="allow-scripts allow-same-origin allow-forms" title="Preview" />
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 18px", textAlign: "center" }}>
              <SmallBtn onClick={loadSite}>Load site data</SmallBtn>
            </div>
          )}
        </Section>
      )}

      {/* GitHub repo */}
      {project.github && (
        <Section
          title="Repository"
          icon="⌥"
          defaultOpen
          action={
            <SmallBtn onClick={loadRepo} loading={loading.repo}>↻ Refresh</SmallBtn>
          }
        >
          {loading.repo && !repoInfo ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--text-dimmer)", fontSize: 13 }}>
              <span className="spin" style={{ display: "inline-block", marginRight: 8 }}>↻</span> Loading repository…
            </div>
          ) : repoInfo ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, padding: "16px 18px" }}>
                <StatBox label="Stars" value={repoInfo.stargazers_count?.toLocaleString()} color="var(--amber)" />
                <StatBox label="Forks" value={repoInfo.forks_count?.toLocaleString()} color="var(--blue)" />
                <StatBox label="Issues" value={repoInfo.open_issues_count?.toLocaleString()} color="var(--red)" />
                <StatBox label="Language" value={repoInfo.language || "—"} color="var(--indigo)" />
                <StatBox label="Branch" value={repoInfo.default_branch} color="var(--green)" />
                <StatBox label="Updated" value={timeAgo(repoInfo.updated_at)} />
              </div>
              {repoInfo.description && (
                <div style={{ padding: "0 18px 14px", fontSize: 13, color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  {repoInfo.description}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "24px 18px", textAlign: "center" }}>
              <SmallBtn onClick={loadRepo}>Load repo data</SmallBtn>
            </div>
          )}
        </Section>
      )}

      {/* Package.json scripts */}
      {packageJson && (
        <Section title="npm Scripts" icon="⚡" defaultOpen={false}>
          <div style={{ padding: "4px 0 4px" }}>
            {Object.entries(packageJson.scripts || {}).map(([k, v]) => (
              <div key={k} className="table-row">
                <span className="mono table-key" style={{ color: "var(--green)", width: 120 }}>{k}</span>
                <span className="mono table-val" style={{ fontSize: 11, color: "var(--text-dim)" }}>{v}</span>
              </div>
            ))}
            {Object.keys(packageJson.scripts || {}).length === 0 && (
              <div style={{ padding: "16px 18px", color: "var(--text-dimmer)", fontSize: 13 }}>No scripts defined</div>
            )}
          </div>
        </Section>
      )}

      {/* Dependencies */}
      {packageJson && (
        <Section title="Dependencies" icon="📦" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                <div className="section-title">Production ({Object.keys(packageJson.dependencies || {}).length})</div>
              </div>
              {Object.entries(packageJson.dependencies || {}).map(([k, v]) => (
                <div key={k} className="table-row" style={{ padding: "6px 18px" }}>
                  <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, flex: 1 }}>{k}</span>
                  <span className="mono" style={{ color: "var(--text-dimmer)", fontSize: 10 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ borderLeft: "1px solid var(--border)" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                <div className="section-title">Dev ({Object.keys(packageJson.devDependencies || {}).length})</div>
              </div>
              {Object.entries(packageJson.devDependencies || {}).map(([k, v]) => (
                <div key={k} className="table-row" style={{ padding: "6px 18px" }}>
                  <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, flex: 1 }}>{k}</span>
                  <span className="mono" style={{ color: "var(--text-dimmer)", fontSize: 10 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Commits */}
      {commits.length > 0 && (
        <Section title={`Recent Commits (${commits.length})`} icon="📝" defaultOpen>
          <div>
            {commits.slice(0, 10).map(c => (
              <div key={c.sha} style={{ display: "flex", gap: 12, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
                {c.author?.avatar_url && (
                  <img src={c.author.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }} />
                )}
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
                <a href={c.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", fontSize: 12, flexShrink: 0, padding: "0 4px" }}>↗</a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* File browser */}
      {(fileTree.length > 0 || project.github) && (
        <Section title="File Browser" icon="📁" defaultOpen={fileTree.length > 0}>
          {selectedFile ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--green)", fontWeight: 600, fontSize: 13 }}>{selectedFile.name}</span>
                <SmallBtn onClick={() => { setSelectedFile(null); setFileContent(""); }}>← Back</SmallBtn>
              </div>
              <pre className="mono" style={{
                margin: 0, padding: 18, fontSize: 11, color: "var(--text-dim)",
                overflowX: "auto", maxHeight: 500, overflowY: "auto",
                background: "var(--surface2)", whiteSpace: "pre-wrap", wordBreak: "break-word",
                lineHeight: 1.7,
              }}>{fileContent || "(empty)"}</pre>
            </div>
          ) : (
            <div>
              {currentPath && (
                <div style={{ padding: "8px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <SmallBtn onClick={() => { const parts = currentPath.split("/").filter(Boolean); parts.pop(); browseDir(parts.join("/")); }}>↑ Up</SmallBtn>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dimmer)" }}>/{currentPath}</span>
                </div>
              )}
              {fileTree.map(f => (
                <div key={f.name}
                  onClick={() => f.type === "dir" ? browseDir(f.path) : viewFile(f)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                    cursor: f.type === "file" && f.size > 500000 ? "default" : "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}><FileIcon type={f.type} name={f.name} /></span>
                  <span style={{ flex: 1, fontSize: 13, color: f.type === "dir" ? "#a5b4fc" : "var(--text)", fontFamily: f.type === "file" ? "JetBrains Mono, monospace" : "inherit" }}>
                    {f.name}
                    {f.type === "dir" && "/"}
                  </span>
                  {f.size > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}kb` : `${f.size}b`}</span>}
                </div>
              ))}
              {fileTree.length === 0 && !loading.repo && project.github && (
                <div style={{ padding: "24px 18px", textAlign: "center" }}>
                  <SmallBtn onClick={loadRepo}>Load file tree</SmallBtn>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* GitHub Actions */}
      {actions.length > 0 && (
        <Section title="GitHub Actions" icon="⚙️" defaultOpen={false}>
          <div>
            {actions.slice(0, 8).map(run => (
              <div key={run.id} style={{ display: "flex", gap: 10, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 16 }}>
                  {run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : run.status === "in_progress" ? "⏳" : "⏸"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#fff", fontSize: 12 }}>{run.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-dimmer)" }}>{run.head_branch} · {timeAgo(run.created_at)}</div>
                </div>
                <span className="mono" style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                  background: run.conclusion === "success" ? "var(--green-dim)" : run.conclusion === "failure" ? "var(--red-dim)" : "var(--amber-dim)",
                  color: run.conclusion === "success" ? "var(--green)" : run.conclusion === "failure" ? "var(--red)" : "var(--amber)",
                }}>
                  {run.conclusion || run.status}
                </span>
                <a href={run.html_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dimmer)", fontSize: 12 }}>↗</a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Push to repo section */}
      {project.github && token && (
        <Section title="Push to Repo" icon="⬆️" defaultOpen={false}>
          <PushSection repo={project.github} token={token} branch={repoInfo?.default_branch || "main"} />
        </Section>
      )}
    </div>
  );
}

function PushSection({ repo, token, branch }) {
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState("");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState("");

  const push = async () => {
    if (!path || !content) return;
    setPushing(true); setResult("");
    // Get SHA if file exists
    const q = token ? `&token=${encodeURIComponent(token)}` : "";
    let sha;
    try {
      const info = await fetch(`/api/github/files?repo=${repo}&path=${encodeURIComponent(path)}${q}`).then(r => r.json());
      sha = info.sha;
    } catch {}
    const res = await fetch("/api/github/push", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo, path, content, message: msg || `Update ${path} via Master Admin`, sha, branch, token }),
    }).then(r => r.json());
    setResult(res.content ? "✅ Pushed to " + path : "❌ " + (res.message || "Failed"));
    setPushing(false);
  };

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>File Path</label>
          <input value={path} onChange={e => setPath(e.target.value)} placeholder="src/file.js" style={{ width: "100%", padding: "8px 12px", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Commit Message</label>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Update file" style={{ width: "100%", padding: "8px 12px", fontSize: 12 }} />
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dimmer)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>File Content</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste file content here…" rows={6} style={{ width: "100%", padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SmallBtn onClick={push} loading={pushing} color="var(--green)" border="rgba(16,185,129,0.3)">⬆️ Push to {branch}</SmallBtn>
        {result && <span style={{ fontSize: 12, color: result.startsWith("✅") ? "var(--green)" : "var(--red)" }}>{result}</span>}
      </div>
    </div>
  );
}
