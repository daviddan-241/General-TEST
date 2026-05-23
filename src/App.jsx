import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inspector from "./pages/Inspector";
import GitHub from "./pages/GitHub";
import Settings from "./pages/Settings";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "inspector": return <Inspector />;
      case "github":    return <GitHub />;
      case "settings":  return <Settings />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
