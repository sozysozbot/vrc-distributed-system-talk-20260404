import { useState } from "react";
import { KripkeVisualizerTab } from "./tabs/KripkeVisualizerTab";
import "./App.css";

const TABS = ["Kripke Structure Visualizer"] as const;
type TabId = (typeof TABS)[number];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("Kripke Structure Visualizer");

  return (
    <div className="app">
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-button ${tab === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <main className="tab-content">
        {activeTab === "Kripke Structure Visualizer" && <KripkeVisualizerTab />}
      </main>
    </div>
  );
}
