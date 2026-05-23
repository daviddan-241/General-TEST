import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import AddProjectModal from "./components/AddProjectModal";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";
import Inspector from "./pages/Inspector";
import GitHub from "./pages/GitHub";
import Settings from "./pages/Settings";
import { loadProjects, saveProjects, createProject, parseGitHubRepo } from "./store";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [projects, setProjects] = useState(loadProjects);
  const [addOpen, setAddOpen] = useState(false);
  const [pingStatus, setPingStatus] = useState({}); // id → { ok, responseTime, status, lastChecked }

  // Sync projects to localStorage whenever they change
  useEffect(() => { saveProjects(projects); }, [projects]);

  // Register projects with server watchdog on mount
  useEffect(() => {
    projects.forEach(p => {
      if (p.url) {
        fetch("/api/watch/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id, name: p.name, url: p.url }),
        }).catch(() => {});
      }
    });
  }, []); // eslint-disable-line

  // Client-side ping loop (updates UI every 30s)
  const pingAll = useCallback(async (ps) => {
    const targets = ps.filter(p => p.url);
    const results = await Promise.allSettled(
      targets.map(async p => {
        const r = await fetch("/api/watch/ping", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: p.url }),
        }).then(r => r.json()).catch(() => ({ ok: false, error: "network error" }));
        return { id: p.id, ...r };
      })
    );
    const newStatus = {};
    results.forEach(r => {
      if (r.status === "fulfilled" && r.value.id) {
        newStatus[r.value.id] = { ok: r.value.ok, responseTime: r.value.responseTime, status: r.value.status, lastChecked: new Date().toISOString(), error: r.value.error };
      }
    });
    setPingStatus(prev => ({ ...prev, ...newStatus }));
  }, []);

  useEffect(() => {
    if (projects.length) pingAll(projects);
    const t = setInterval(() => pingAll(loadProjects()), 30000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  const addProject = async (formData) => {
    const project = createProject(formData);
    const updated = [...projects, project];
    setProjects(updated);

    if (project.url) {
      fetch("/api/watch/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, name: project.name, url: project.url }),
      }).catch(() => {});
      pingAll([project]);
    }

    setAddOpen(false);
    setPage(`project:${project.id}`);
  };

  const updateProject = (id, patch) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const removeProject = (id) => {
    fetch("/api/watch/unregister", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setProjects(prev => prev.filter(p => p.id !== id));
    setPage("dashboard");
  };

  const selectedProjectId = page.startsWith("project:") ? page.split(":")[1] : null;
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  const renderPage = () => {
    if (selectedProject) {
      return (
        <ProjectPage
          project={selectedProject}
          pingStatus={pingStatus[selectedProject.id]}
          onUpdate={(patch) => updateProject(selectedProject.id, patch)}
          onDelete={() => removeProject(selectedProject.id)}
          onNavigate={setPage}
        />
      );
    }
    switch (page) {
      case "dashboard": return <Dashboard projects={projects} pingStatus={pingStatus} onNavigate={setPage} onAddProject={() => setAddOpen(true)} />;
      case "inspector": return <Inspector />;
      case "github":    return <GitHub />;
      case "settings":  return <Settings projects={projects} />;
      default:          return <Dashboard projects={projects} pingStatus={pingStatus} onNavigate={setPage} onAddProject={() => setAddOpen(true)} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        page={page}
        projects={projects}
        pingStatus={pingStatus}
        onNavigate={setPage}
        onAddProject={() => setAddOpen(true)}
      />
      <main className="bg-mesh" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 60px" }} className="fade-in">
          {renderPage()}
        </div>
      </main>

      {addOpen && (
        <AddProjectModal
          onAdd={addProject}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
