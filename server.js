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

// ─── In-memory watchdog store ────────────────────────────────────────────────
const watchedProjects = new Map(); // id → { id, name, url, status, history, failCount, settings }
let watchSettings = { ntfyTopic: "", webhookUrl: "", alertAfterFails: 2 };

async function pingUrl(url) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: "follow",
      headers: { "User-Agent": "MasterAdmin-Watchdog/1.0" },
    });
    clearTimeout(t);
    return { ok: r.ok, status: r.status, responseTime: Date.now() - start, ts: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : e.message, responseTime: Date.now() - start, ts: new Date().toISOString() };
  }
}

async function sendAlert(project, event) {
  const msg = event === "down"
    ? `🔴 DOWN: ${project.name} (${project.url}) is unreachable`
    : `🟢 UP: ${project.name} (${project.url}) is back online`;

  const promises = [];
  if (watchSettings.ntfyTopic) {
    promises.push(
      fetch(`https://ntfy.sh/${watchSettings.ntfyTopic}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", "Title": "Master Admin Alert", "Priority": event === "down" ? "high" : "default", "Tags": event === "down" ? "red_circle,rotating_light" : "green_circle,white_check_mark" },
        body: msg,
      }).catch(() => {})
    );
  }
  if (watchSettings.webhookUrl) {
    promises.push(
      fetch(watchSettings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, project: project.name, url: project.url, message: msg, time: new Date().toISOString() }),
      }).catch(() => {})
    );
  }
  await Promise.allSettled(promises);
  console.log(`[watchdog] Alert sent: ${msg}`);
}

// Watchdog loop — ping every 60 seconds
setInterval(async () => {
  for (const [id, proj] of watchedProjects.entries()) {
    if (!proj.url) continue;
    const result = await pingUrl(proj.url);
    const wasUp = proj.status === "up" || proj.status === null;
    const isUp = result.ok;

    proj.history = [result, ...(proj.history || [])].slice(0, 50);
    proj.lastChecked = result.ts;
    proj.responseTime = result.responseTime;

    if (isUp) {
      if (!wasUp && proj.failCount >= (watchSettings.alertAfterFails || 2)) {
        proj.status = "up";
        await sendAlert(proj, "up");
      } else {
        proj.status = "up";
      }
      proj.failCount = 0;
    } else {
      proj.failCount = (proj.failCount || 0) + 1;
      if (proj.failCount >= (watchSettings.alertAfterFails || 2) && wasUp) {
        proj.status = "down";
        await sendAlert(proj, "down");
      } else if (proj.failCount >= (watchSettings.alertAfterFails || 2)) {
        proj.status = "down";
      }
    }
    watchedProjects.set(id, proj);
  }
}, 60000);

// ─── API: Health ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString(), version: "2.0.0", watched: watchedProjects.size })
);

// ─── API: Site check ─────────────────────────────────────────────────────────
app.post("/api/site/check", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  const result = await pingUrl(url);
  if (!result.ok && result.status === undefined) return res.json(result);

  try {
    const r2 = await fetch(url, { headers: { "User-Agent": "MasterAdmin/2.0" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
    const headers = {};
    r2.headers.forEach((v, k) => { headers[k] = v; });
    let html = ""; try { html = await r2.text(); } catch {}
    return res.json({ ...result, ok: r2.ok, status: r2.status, statusText: r2.statusText, finalUrl: r2.url, headers, htmlLength: html.length, html: html.slice(0, 10000) });
  } catch {
    return res.json(result);
  }
});

// ─── API: Site analyze ───────────────────────────────────────────────────────
app.post("/api/site/analyze", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "MasterAdmin/2.0" } });
    const html = await r.text();

    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;

    const metas = {};
    const metaRe = /<meta\s+(?:[^>]*?(?:name|property)="([^"]*)"[^>]*?content="([^"]*)"[^>]*?|[^>]*?content="([^"]*)"[^>]*?(?:name|property)="([^"]*)"[^>]*?)>/gi;
    let m;
    while ((m = metaRe.exec(html)) !== null) {
      const k = m[1] || m[4]; const v = m[2] || m[3];
      if (k && v) metas[k] = v;
    }

    const lower = html.toLowerCase();
    const tech = [];
    if (lower.includes("__next_data") || lower.includes("_next/")) tech.push("Next.js");
    if (lower.includes("__nuxt")) tech.push("Nuxt.js");
    if (tech.length === 0 && lower.includes("react")) tech.push("React");
    if (lower.includes("vue") && !lower.includes("nuxt")) tech.push("Vue.js");
    if (lower.includes("angular")) tech.push("Angular");
    if (lower.includes("svelte")) tech.push("Svelte");
    if (lower.includes("_astro")) tech.push("Astro");
    if (lower.includes("gatsby")) tech.push("Gatsby");
    if (lower.includes("wp-content")) tech.push("WordPress");
    if (lower.includes("shopify")) tech.push("Shopify");

    const faviconM = html.match(/rel="(?:icon|shortcut icon)"[^>]*href="([^"]+)"/i) || html.match(/href="([^"]+)"[^>]*rel="(?:icon|shortcut icon)"/i);
    let favicon = faviconM?.[1] ?? null;
    if (favicon && !favicon.startsWith("http")) { try { favicon = new URL(favicon, url).href; } catch {} }

    const links = []; const linkRe = /href="(https?:\/\/[^"#?]{5,})"/gi;
    while ((m = linkRe.exec(html)) !== null && links.length < 30) links.push(m[1]);
    const images = []; const imgRe = /(?:src|content)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp|svg))[^"]*"/gi;
    while ((m = imgRe.exec(html)) !== null && images.length < 15) images.push(m[1]);
    const scripts = []; const scriptRe = /src="(https?:\/\/[^"]+\.js[^"]*?)"/gi;
    while ((m = scriptRe.exec(html)) !== null && scripts.length < 20) scripts.push(m[1]);

    return res.json({ title, metas, tech, favicon, links, images, scripts, htmlSize: html.length });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

// ─── API: GitHub ──────────────────────────────────────────────────────────────
function ghHeaders(token) {
  const h = { Accept: "application/vnd.github.v3+json", "User-Agent": "MasterAdmin/2.0" };
  if (token) h.Authorization = `token ${token}`;
  return h;
}

app.get("/api/github/repo",      async (req, res) => { const { repo, token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get("/api/github/commits",   async (req, res) => { const { repo, branch = "main", token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=25`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get("/api/github/files",     async (req, res) => { const { repo, path: fp = "", token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get("/api/github/branches",  async (req, res) => { const { repo, token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}/branches`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get("/api/github/actions",   async (req, res) => { const { repo, token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=10`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get("/api/github/workflows", async (req, res) => { const { repo, token } = req.query; try { const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, { headers: ghHeaders(token) }); res.status(r.status).json(await r.json()); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post("/api/github/deploy", async (req, res) => {
  const { repo, workflow = "deploy.yml", branch = "main", token } = req.body;
  if (!token) return res.status(401).json({ error: "GitHub token required" });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, { method: "POST", headers: { ...ghHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify({ ref: branch }) });
    if (r.status === 204) return res.json({ ok: true, message: "Workflow triggered" });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/github/push", async (req, res) => {
  const { repo, path: fp, content, message = "Update via Master Admin", sha, branch = "main", token } = req.body;
  if (!token || !repo || !fp || content === undefined) return res.status(400).json({ error: "repo, path, content, token required" });
  const body = { message, content: Buffer.from(content).toString("base64"), branch };
  if (sha) body.sha = sha;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, { method: "PUT", headers: { ...ghHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    res.status(r.status).json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: Watchdog ────────────────────────────────────────────────────────────
app.post("/api/watch/register", (req, res) => {
  const { id, name, url } = req.body;
  if (!id || !url) return res.status(400).json({ error: "id and url required" });
  watchedProjects.set(id, { id, name: name || url, url, status: null, history: [], failCount: 0 });
  res.json({ ok: true, watched: watchedProjects.size });
});

app.post("/api/watch/unregister", (req, res) => {
  const { id } = req.body;
  watchedProjects.delete(id);
  res.json({ ok: true, watched: watchedProjects.size });
});

app.get("/api/watch/status", (_req, res) => {
  const projects = [];
  watchedProjects.forEach(p => projects.push(p));
  res.json({ projects, settings: watchSettings });
});

app.post("/api/watch/settings", (req, res) => {
  watchSettings = { ...watchSettings, ...req.body };
  res.json({ ok: true, settings: watchSettings });
});

app.post("/api/watch/ping", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  const result = await pingUrl(url);
  res.json(result);
});

app.post("/api/notify/test", async (req, res) => {
  const { ntfyTopic, webhookUrl } = req.body;
  const promises = [];
  if (ntfyTopic) {
    promises.push(fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Title": "Master Admin Test", "Tags": "white_check_mark" },
      body: "✅ Master Admin watchdog is connected and working!",
    }).then(r => ({ ntfy: r.ok ? "sent" : `failed (${r.status})` })).catch(e => ({ ntfy: "error: " + e.message })));
  }
  if (webhookUrl) {
    promises.push(fetch(webhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "test", message: "Master Admin watchdog test notification", time: new Date().toISOString() }),
    }).then(r => ({ webhook: r.ok ? "sent" : `failed (${r.status})` })).catch(e => ({ webhook: "error: " + e.message })));
  }
  const results = await Promise.allSettled(promises);
  res.json({ ok: true, results: results.map(r => r.value || r.reason) });
});

// ─── Serve frontend ───────────────────────────────────────────────────────────
const dist = path.join(__dirname, "dist", "public");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: "index.html" }));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  app.get("/", (_req, res) => res.json({ status: "ok", message: "Master Admin v2 API — build the frontend first." }));
}

app.listen(PORT, () => console.log(`⚡ Master Admin v2 → http://localhost:${PORT}`));
