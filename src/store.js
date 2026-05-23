const KEY = "ma_v2_projects";
const SETTINGS_KEY = "ma_v2_settings";

export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveProjects(projects) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function createProject(data) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: data.name || "Unnamed Project",
    url: data.url || "",
    github: data.github || "",
    type: "unknown",
    tech: [],
    color: data.color || randomColor(),
    status: null,
    meta: null,
    repoInfo: null,
    lastChecked: null,
    addedAt: new Date().toISOString(),
    ...data,
  };
}

function randomColor() {
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function parseGitHubRepo(input) {
  if (!input) return null;
  const clean = input.trim().replace(/\/$/, "");
  const match = clean.match(/github\.com\/([^/\s]+\/[^/\s]+)/);
  return match ? match[1].replace(/\.git$/, "") : (clean.includes("/") && !clean.includes(" ") ? clean : null);
}

export function detectTech(fileTree = [], packageJson = null) {
  const names = fileTree.map(f => f.name?.toLowerCase());
  const tech = [];

  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    if (deps["next"]) tech.push("Next.js");
    else if (deps["react"]) tech.push("React");
    if (deps["vue"]) tech.push("Vue.js");
    if (deps["nuxt"] || deps["nuxt3"]) tech.push("Nuxt.js");
    if (deps["svelte"]) tech.push("Svelte");
    if (deps["@astrojs/core"] || deps["astro"]) tech.push("Astro");
    if (deps["gatsby"]) tech.push("Gatsby");
    if (deps["remix"] || deps["@remix-run/react"]) tech.push("Remix");
    if (deps["vite"]) tech.push("Vite");
    if (deps["express"]) tech.push("Express");
    if (deps["fastify"]) tech.push("Fastify");
    if (deps["@nestjs/core"]) tech.push("NestJS");
    if (deps["prisma"] || deps["@prisma/client"]) tech.push("Prisma");
    if (deps["drizzle-orm"]) tech.push("Drizzle");
    if (deps["mongoose"]) tech.push("MongoDB");
    if (deps["pg"] || deps["postgres"]) tech.push("PostgreSQL");
    if (deps["tailwindcss"]) tech.push("Tailwind CSS");
    if (deps["typescript"]) tech.push("TypeScript");
    if (deps["socket.io"]) tech.push("Socket.IO");
    if (deps["stripe"]) tech.push("Stripe");
  }

  if (names.includes("requirements.txt") || names.includes("setup.py")) {
    tech.push("Python");
    if (names.includes("manage.py")) tech.push("Django");
  }
  if (names.includes("cargo.toml")) tech.push("Rust");
  if (names.includes("go.mod")) tech.push("Go");
  if (names.includes("composer.json")) tech.push("PHP");
  if (names.includes("gemfile")) tech.push("Ruby");
  if (names.includes("dockerfile") || names.includes("docker-compose.yml")) tech.push("Docker");
  if (names.includes("render.yaml")) tech.push("Render");
  if (names.includes("vercel.json") || names.includes(".vercel")) tech.push("Vercel");
  if (names.includes("netlify.toml")) tech.push("Netlify");
  if (names.includes(".github")) tech.push("GitHub Actions");
  if (names.includes("supabase")) tech.push("Supabase");

  return [...new Set(tech)];
}

export const TECH_META = {
  "Next.js":       { icon: "▲", color: "#fff" },
  "React":         { icon: "⚛", color: "#61dafb" },
  "Vue.js":        { icon: "▲", color: "#42b883" },
  "Nuxt.js":       { icon: "▲", color: "#00DC82" },
  "Svelte":        { icon: "🔥", color: "#ff3e00" },
  "Astro":         { icon: "🚀", color: "#ff5d01" },
  "Gatsby":        { icon: "G", color: "#663399" },
  "Remix":         { icon: "🎵", color: "#a78bfa" },
  "Vite":          { icon: "⚡", color: "#646cff" },
  "Express":       { icon: "🟩", color: "#68d391" },
  "Fastify":       { icon: "⚡", color: "#fff" },
  "NestJS":        { icon: "🐱", color: "#e0234e" },
  "Prisma":        { icon: "△", color: "#a78bfa" },
  "Drizzle":       { icon: "💧", color: "#c084fc" },
  "MongoDB":       { icon: "🍃", color: "#4db33d" },
  "PostgreSQL":    { icon: "🐘", color: "#336791" },
  "Tailwind CSS":  { icon: "🌊", color: "#38bdf8" },
  "TypeScript":    { icon: "TS", color: "#3178c6" },
  "Socket.IO":     { icon: "🔌", color: "#fff" },
  "Python":        { icon: "🐍", color: "#3776ab" },
  "Django":        { icon: "🟢", color: "#092e20" },
  "Rust":          { icon: "⚙", color: "#ce422b" },
  "Go":            { icon: "🐹", color: "#00add8" },
  "PHP":           { icon: "🐘", color: "#777bb4" },
  "Ruby":          { icon: "💎", color: "#cc342d" },
  "Docker":        { icon: "🐳", color: "#2496ed" },
  "Render":        { icon: "☁", color: "#7c3aed" },
  "Vercel":        { icon: "▲", color: "#fff" },
  "Netlify":       { icon: "🌐", color: "#00c7b7" },
  "GitHub Actions":{ icon: "⚙", color: "#6366f1" },
  "Supabase":      { icon: "⚡", color: "#3ecf8e" },
  "Stripe":        { icon: "💳", color: "#7c3aed" },
};
