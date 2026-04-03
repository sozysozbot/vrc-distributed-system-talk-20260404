/**
 * Represents a Kripke structure (S, R, V) as JSON-serializable data.
 *
 * - S = {0, 1, ..., nodeCount - 1}
 * - R ⊆ S × S is given by `transitions`
 * - V : AP → P(S) is given by `valuation`
 *
 * Initial states are not modeled as a separate field; instead, they can be
 * encoded via an atomic proposition (e.g. "init") in the valuation.
 *
 * Invariants:
 * - `nodeCount` is a positive integer.
 * - Every index in `transitions` and `valuation` entries is in [0, nodeCount).
 */
export interface KripkeStructureJson {
  /** The number of states. States are identified by indices 0, ..., nodeCount - 1. */
  readonly nodeCount: number;

  /** Transition relation: each entry [s, t] means state s can transition to state t. */
  readonly transitions: readonly (readonly [number, number])[];

  /**
   * Valuation (labeling) function V : AP → P(S).
   *
   * Maps each atomic proposition name to the set of state indices where it holds.
   */
  readonly valuation: Readonly<Record<string, readonly number[]>>;
}

/**
 * Validates a parsed JSON value as a `KripkeStructureJson`.
 *
 * Returns the validated structure on success, or a human-readable error string.
 */
export function parseKripkeStructureJson(
  data: unknown,
): KripkeStructureJson | string {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return "Expected a JSON object at the top level.";
  }

  const obj = data as Record<string, unknown>;

  // --- nodeCount ---
  if (typeof obj.nodeCount !== "number" || !Number.isInteger(obj.nodeCount) || obj.nodeCount < 1) {
    return "`nodeCount` must be a positive integer.";
  }
  const nodeCount: number = obj.nodeCount;

  const inRange = (i: unknown): i is number =>
    typeof i === "number" && Number.isInteger(i) && i >= 0 && i < nodeCount;

  // --- transitions ---
  if (!Array.isArray(obj.transitions)) {
    return "`transitions` must be an array.";
  }
  for (let idx = 0; idx < obj.transitions.length; idx++) {
    const entry = obj.transitions[idx];
    if (!Array.isArray(entry) || entry.length !== 2 || !inRange(entry[0]) || !inRange(entry[1])) {
      return `transitions[${idx}]: expected a pair [source, target] of state indices in [0, ${nodeCount}).`;
    }
  }
  const transitions = obj.transitions as [number, number][];

  // --- valuation ---
  if (typeof obj.valuation !== "object" || obj.valuation === null || Array.isArray(obj.valuation)) {
    return "`valuation` must be an object mapping proposition names to arrays of state indices.";
  }
  const valEntries = Object.entries(obj.valuation as Record<string, unknown>);
  for (const [prop, indices] of valEntries) {
    if (!Array.isArray(indices)) {
      return `valuation["${prop}"]: expected an array of state indices.`;
    }
    for (let j = 0; j < indices.length; j++) {
      if (!inRange(indices[j])) {
        return `valuation["${prop}"][${j}]: expected a state index in [0, ${nodeCount}).`;
      }
    }
  }
  const valuation = obj.valuation as Record<string, number[]>;

  return { nodeCount, transitions, valuation };
}

/**
 * Visualization parameters for a Kripke structure.
 *
 * - `colors`: optional mapping from proposition names to CSS color strings.
 */
export interface KripkeFrameVisualizationParamsJson {
  readonly colors?: Readonly<Record<string, string>>;
}

/**
 * A Kripke structure together with visualization parameters.
 */
export interface KripkeStructureVisualizationJson {
  readonly frame: KripkeStructureJson;
  readonly visualizationParams?: KripkeFrameVisualizationParamsJson;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validates a parsed JSON value as a `KripkeStructureVisualizationJson`.
 *
 * Returns the validated structure on success, or a human-readable error string.
 */
export function parseKripkeStructureVisualizationJson(
  data: unknown,
): KripkeStructureVisualizationJson | string {
  if (!isObject(data)) {
    return "Expected a JSON object at the top level.";
  }

  // --- frame ---
  if (!("frame" in data)) {
    return "Missing `frame` field.";
  }
  const frameResult = parseKripkeStructureJson(data.frame);
  if (typeof frameResult === "string") {
    return `frame: ${frameResult}`;
  }

  // --- visualizationParams (optional) ---
  let visualizationParams: KripkeFrameVisualizationParamsJson | undefined;
  if ("visualizationParams" in data && data.visualizationParams !== undefined) {
    if (!isObject(data.visualizationParams)) {
      return "`visualizationParams` must be an object.";
    }
    const vp = data.visualizationParams;
    if ("colors" in vp && vp.colors !== undefined) {
      if (!isObject(vp.colors)) {
        return "`visualizationParams.colors` must be an object.";
      }
      for (const [key, val] of Object.entries(vp.colors)) {
        if (typeof val !== "string") {
          return `visualizationParams.colors["${key}"]: expected a CSS color string.`;
        }
      }
      visualizationParams = { colors: vp.colors as Record<string, string> };
    } else {
      visualizationParams = {};
    }
  }

  return { frame: frameResult, visualizationParams };
}
