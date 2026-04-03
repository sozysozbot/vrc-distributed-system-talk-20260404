import { useState, useCallback, useRef, useEffect } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import type cytoscape from "cytoscape";
import {
  type KripkeStructureJson,
  type KripkeStructureVisualizationJson,
  parseKripkeStructureVisualizationJson,
} from "../types/kripke";

// ---------------------------------------------------------------------------
// Color assignment
// ---------------------------------------------------------------------------

/** Golden-angle-based palette for auto-assigning distinguishable colors. */
function autoColor(index: number): string {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Returns an ordered list of { name, color } for all effective propositions
 * (those present in `frame.valuation`), preserving insertion order.
 */
function resolvePropositionColors(
  viz: KripkeStructureVisualizationJson,
): { name: string; color: string }[] {
  const explicitColors = viz.visualizationParams?.colors ?? {};
  let autoIndex = 0;
  return Object.keys(viz.frame.valuation).map((name) => ({
    name,
    color: explicitColors[name] ?? autoColor(autoIndex++),
  }));
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_JSON: KripkeStructureVisualizationJson = {
  frame: {
    nodeCount: 3,
    transitions: [
      [0, 1],
      [1, 2],
      [2, 0],
      [1, 1],
    ],
    valuation: {
      init: [0],
      busy: [1, 2],
    },
  },
  visualizationParams: {
    colors: { init: "#4caf50", busy: "#ff9800" },
  },
};

// ---------------------------------------------------------------------------
// Cytoscape helpers
// ---------------------------------------------------------------------------

const LAYOUT: cytoscape.LayoutOptions = {
  name: "cose",
  animate: false,
};

const INACTIVE_COLOR = "#616161";
const FALSE_SECTOR_COLOR = "#2e2e2e";

function kripkeToElements(
  frame: KripkeStructureJson,
): cytoscape.ElementDefinition[] {
  const allProps = Object.keys(frame.valuation).sort();

  // Per-node set of true propositions (for tooltip)
  const nodeTrueProps: Set<string>[] = Array.from(
    { length: frame.nodeCount },
    () => new Set(),
  );
  for (const [prop, indices] of Object.entries(frame.valuation)) {
    for (const idx of indices) {
      nodeTrueProps[idx].add(prop);
    }
  }

  const nodes: cytoscape.ElementDefinition[] = Array.from(
    { length: frame.nodeCount },
    (_, i) => ({
      data: {
        id: String(i),
        label: String(i),
        valuationJson: JSON.stringify(
          allProps.map((p) => [p, nodeTrueProps[i].has(p)] as const),
        ),
      },
    }),
  );

  const edges: cytoscape.ElementDefinition[] = frame.transitions.map(
    ([s, t], i) => ({
      data: { id: `e${i}`, source: String(s), target: String(t) },
    }),
  );

  return [...nodes, ...edges];
}

/**
 * Builds a Cytoscape stylesheet reflecting the current proposition selection.
 *
 * When `selectedProps` is empty, nodes are solid gray.
 * Otherwise, nodes become pie charts with equal-angle sectors.
 */
function buildStylesheet(
  frame: KripkeStructureJson,
  propositions: { name: string; color: string }[],
  selectedProps: Set<string>,
): (cytoscape.StylesheetStyle | cytoscape.StylesheetCSS)[] {
  const selected = propositions.filter((p) => selectedProps.has(p.name));

  const nodeStyle: Record<string, unknown> = {
    label: "data(label)",
    "text-valign": "center",
    "text-halign": "center",
    color: "#fff",
    "font-size": "12px",
    width: 40,
    height: 40,
  };

  if (selected.length === 0) {
    nodeStyle["background-color"] = INACTIVE_COLOR;
  } else {
    // Build per-node truth lookup: nodeId -> Set<prop>
    const nodeTruth = new Map<number, Set<string>>();
    for (let i = 0; i < frame.nodeCount; i++) {
      nodeTruth.set(i, new Set());
    }
    for (const { name } of selected) {
      const indices = frame.valuation[name];
      if (indices) {
        for (const idx of indices) {
          nodeTruth.get(idx)!.add(name);
        }
      }
    }

    nodeStyle["pie-size"] = "100%";
    const sectorSize = 100 / selected.length;

    for (let si = 0; si < selected.length; si++) {
      const n = si + 1; // 1-indexed
      nodeStyle[`pie-${n}-background-size`] = sectorSize;
      // Use a function mapper: for each element, check if the prop is true
      const propName = selected[si].name;
      const propColor = selected[si].color;
      nodeStyle[`pie-${n}-background-color`] = (ele: cytoscape.NodeSingular) => {
        const nodeId = parseInt(ele.data("id"), 10);
        return nodeTruth.get(nodeId)?.has(propName) ? propColor : FALSE_SECTOR_COLOR;
      };
    }
  }

  return [
    { selector: "node", style: nodeStyle as cytoscape.Css.Node },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#888",
        "target-arrow-color": "#888",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function setupTooltip(cy: cytoscape.Core) {
  const tooltipEl = document.createElement("div");
  Object.assign(tooltipEl.style, {
    position: "absolute",
    background: "#333",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    pointerEvents: "auto",
    zIndex: "1000",
    display: "none",
    maxHeight: "180px",
    overflowY: "auto",
    lineHeight: "1.6",
  });
  cy.container()?.appendChild(tooltipEl);

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const show = (node: cytoscape.NodeSingular) => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    const raw = node.data("valuationJson") as string;
    const entries: [string, boolean][] = JSON.parse(raw);
    if (entries.length === 0) {
      tooltipEl.textContent = "(no propositions)";
    } else {
      tooltipEl.innerHTML = entries
        .map(([prop, holds]) => `${holds ? "✅" : "❌"} ${prop}`)
        .join("<br>");
    }
    tooltipEl.style.display = "block";
    const pos = node.renderedPosition();
    tooltipEl.style.left = `${pos.x + 25}px`;
    tooltipEl.style.top = `${pos.y - 10}px`;
  };

  const scheduleHide = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      tooltipEl.style.display = "none";
    }, 100);
  };

  cy.on("mouseover", "node", (e) => show(e.target));
  cy.on("mouseout", "node", () => scheduleHide());

  tooltipEl.addEventListener("mouseenter", () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  tooltipEl.addEventListener("mouseleave", () => scheduleHide());
}

// ---------------------------------------------------------------------------
// Valuation selector widget
// ---------------------------------------------------------------------------

function ValuationSelector({
  propositions,
  selected,
  onToggle,
}: {
  propositions: { name: string; color: string }[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  if (propositions.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 13,
        zIndex: 500,
        maxHeight: 200,
        overflowY: "auto",
      }}
    >
      {propositions.map(({ name, color }) => (
        <label
          key={name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          <input
            type="checkbox"
            checked={selected.has(name)}
            onChange={() => onToggle(name)}
          />
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          {name}
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main tab component
// ---------------------------------------------------------------------------

export function KripkeVisualizerTab() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(SAMPLE_JSON, null, 2),
  );
  const [viz, setViz] = useState<KripkeStructureVisualizationJson>(SAMPLE_JSON);
  const [error, setError] = useState<string | null>(null);
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set());
  const cyRef = useRef<cytoscape.Core | null>(null);

  const propositions = resolvePropositionColors(viz);

  const handleCy = useCallback((cy: cytoscape.Core) => {
    if (cyRef.current === cy) return;
    cyRef.current = cy;
    setupTooltip(cy);
  }, []);

  // Apply pie-chart stylesheet whenever selection or data changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const sheet = buildStylesheet(viz.frame, propositions, selectedProps);
    cy.style(sheet as cytoscape.StylesheetCSS[]);
  }, [viz, selectedProps, propositions]);

  const handleParse = useCallback(() => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    const result = parseKripkeStructureVisualizationJson(parsed);
    if (typeof result === "string") {
      setError(result);
    } else {
      setViz(result);
      setError(null);
      setSelectedProps(new Set());
    }
  }, [jsonText]);

  const handleToggle = useCallback((name: string) => {
    setSelectedProps((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Build initial stylesheet for the CytoscapeComponent prop
  const stylesheet = buildStylesheet(viz.frame, propositions, selectedProps);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        gap: 8,
        padding: 8,
      }}
    >
      {/* Input panel */}
      <div style={{ width: 230, display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "monospace",
            fontSize: 13,
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 4,
            resize: "none",
          }}
        />
        <button
          onClick={handleParse}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderRadius: 4,
            border: "1px solid #4a90d9",
            background: "#4a90d9",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Parse &amp; Render
        </button>
        {error && (
          <div
            style={{
              padding: 8,
              background: "#fee",
              border: "1px solid #c66",
              borderRadius: 4,
              fontSize: 13,
              color: "#900",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Graph panel */}
      <div
        style={{
          flex: 1,
          border: "1px solid #ccc",
          borderRadius: 4,
          minHeight: 300,
          position: "relative",
        }}
      >
        <ValuationSelector
          propositions={propositions}
          selected={selectedProps}
          onToggle={handleToggle}
        />
        <CytoscapeComponent
          elements={kripkeToElements(viz.frame)}
          style={{ width: "100%", height: "100%" }}
          layout={LAYOUT}
          stylesheet={stylesheet as cytoscape.StylesheetCSS[]}
          cy={handleCy}
        />
      </div>
    </div>
  );
}
