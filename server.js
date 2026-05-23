import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), version: "1.0.0" });
});

// ── Site Check ───────────────────────────────────────────────────────────────
// POST /api/site/check  { url }
app.post("/api/site/check", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MasterAdmin/1.0 SiteChecker" },
    });
    clearTimeout(timer);
    const elapsed = Date.now() - start;

    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    let html = "";
    try { html = await response.text(); } catch {}

    return res.json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime: elapsed,
      finalUrl: response.url,
      headers,
      htmlLength: html.length,
      html: html.slice(0, 8000),
    });
  } catch (e) {
    return res.json({
      ok: false,
      error: e.name === "AbortError" ? "Request timed out (12s)" : e.message,
      responseTime: Date.now() - start,
    });
  }
});

// ── Site Analyze ─────────────────────────────────────────────────────────────
// POST /api/site/analyze  { url }
app.post("/api/site/analyze", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "MasterAdmin/1.0 Analyzer" },
    });
    const html = await response.text();

    // Title
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;

    // Meta tags
    const metas = {};
    const metaRe = /<meta\s+(?:[^>]*?(?:name|property)="([^"]*)"[^>]*?content="([^"]*)"[^>]*?|[^>]*?content="([^"]*)"[^>]*?(?:name|property)="([^"]*)"[^>]*?)>/gi;
    let m;
    while ((m = metaRe.exec(html)) !== null) {
      const key = m[1] || m[4];
      const val = m[2] || m[3];
      if (key && val) metas[key] = val;
    }

    // Tech stack detection (heuristic)
    const lower = html.toLowerCase();
    const tech = [];
    if (lower.includes("__next_data") || lower.includes("_next/")) tech.push("Next.js");
    if (lower.includes("__nuxt") || lower.includes("_nuxt/")) tech.push("Nuxt.js");
    if (lower.includes("react") && !tech.length) tech.push("React");
    if (lower.includes("vue") && !lower.includes("nuxt")) tech.push("Vue.js");
    if (lower.includes("angular")) tech.push("Angular");
    if (lower.includes("svelte")) tech.push("Svelte");
    if (lower.includes("_astro")) tech.push("Astro");
    if (lower.includes("gatsby")) tech.push("Gatsby");
    if (lower.includes("wp-content") || lower.includes("wordpress")) tech.push("WordPress");
    if (lower.includes("shopify")) tech.push("Shopify");
    if (lower.includes("wix")) tech.push("Wix");
    if (lower.includes("squarespace")) tech.push("Squarespace");
    if (lower.includes("remix")) tech.push("Remix");
    if (lower.includes("vite")) tech.push("Vite");

    // Favicon
    const faviconMatch = html.match(/rel="(?:icon|shortcut icon)"[^>]*href="([^"]+)"/i)
      || html.match(/href="([^"]+)"[^>]*rel="(?:icon|shortcut icon)"/i);
    let favicon = faviconMatch?.[1] ?? null;
    if (favicon && !favicon.startsWith("http")) {
      try { favicon = new URL(favicon, url).href; } catch {}
    }

    // Links
    const links = [];
    const linkRe = /href="(https?:\/\/[^"#?]{5,})"/gi;
    while ((m = linkRe.exec(html)) !== null && links.length < 30) links.push(m[1]);

    // Images
    const images = [];
    const imgRe = /(?:src|content)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp|svg))[^"]*"/gi;
    while ((m = imgRe.exec(html)) !== null && images.length < 15) images.push(m[1]);

    // Scripts
    const scripts = [];
    const scriptRe = /src="(https?:\/\/[^"]+\.js[^"]*?)"/gi;
    while ((m = scriptRe.exec(html)) !== null && scripts.length < 20) scripts.push(m[1]);

    return res.json({ title, metas, tech, favicon, links, images, scripts, htmlSize: html.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GitHub ───────────────────────────────────────────────────────────────────
function ghHeaders(token) {
  const h = { Accept: "application/vnd.github.v3+json", "User-Agent": "MasterAdmin/1.0" };
  if (token) h.Authorization = `token ${token}`;
  return h;
}

// GET /api/github/repo?repo=owner/name&token=...
app.get("/api/github/repo", async (req, res) => {
  const { repo, token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/github/commits?repo=owner/name&branch=main&token=...
app.get("/api/github/commits", async (req, res) => {
  const { repo, branch = "main", token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=25`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/github/files?repo=owner/name&path=&token=...
app.get("/api/github/files", async (req, res) => {
  const { repo, path: fp = "", token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/github/branches?repo=owner/name&token=...
app.get("/api/github/branches", async (req, res) => {
  const { repo, token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/branches`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/github/actions?repo=owner/name&token=...
app.get("/api/github/actions", async (req, res) => {
  const { repo, token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=10`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/github/workflows?repo=owner/name&token=...
app.get("/api/github/workflows", async (req, res) => {
  const { repo, token } = req.query;
  if (!repo) return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, { headers: ghHeaders(token) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/github/deploy  { repo, workflow, branch, token }
app.post("/api/github/deploy", async (req, res) => {
  const { repo, workflow = "deploy.yml", branch = "main", token } = req.body;
  if (!token) return res.status(401).json({ error: "GitHub token required for deploys" });
  if (!repo)  return res.status(400).json({ error: "repo required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch }),
    });
    if (r.status === 204) return res.json({ ok: true, message: "Workflow triggered successfully" });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/github/push  { repo, path, content, message, sha, branch, token }
// Push / update a single file to a GitHub repo
app.post("/api/github/push", async (req, res) => {
  const { repo, path: fp, content, message = "Update via Master Admin", sha, branch = "main", token } = req.body;
  if (!token || !repo || !fp || !content) return res.status(400).json({ error: "repo, path, content, token required" });
  const body = { message, content: Buffer.from(content).toString("base64"), branch };
  if (sha) body.sha = sha;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Serve Frontend ────────────────────────────────────────────────────────────
const dist = path.join(__dirname, "dist", "public");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: "index.html" }));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  app.get("/", (_req, res) =>
    res.json({ status: "ok", message: "Master Admin API — run `npm run build` to serve the frontend." })
  );
}

app.listen(PORT, () => console.log(`⚡ Master Admin running → http://localhost:${PORT}`));
