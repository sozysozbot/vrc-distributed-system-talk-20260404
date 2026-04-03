import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  parseKripkeStructureJson,
  parseKripkeStructureVisualizationJson,
} from "./kripke";

describe("parseKripkeStructureJson", () => {
  it("accepts a valid minimal Kripke structure", () => {
    const result = parseKripkeStructureJson({
      nodeCount: 1,
      transitions: [],
      valuation: {},
    });
    expect(typeof result).not.toBe("string");
  });

  it("rejects non-object input", () => {
    expect(typeof parseKripkeStructureJson(42)).toBe("string");
    expect(typeof parseKripkeStructureJson(null)).toBe("string");
    expect(typeof parseKripkeStructureJson([1])).toBe("string");
  });

  it("rejects nodeCount < 1", () => {
    expect(
      typeof parseKripkeStructureJson({
        nodeCount: 0,
        transitions: [],
        valuation: {},
      }),
    ).toBe("string");
  });

  it("rejects out-of-range transition indices", () => {
    const result = parseKripkeStructureJson({
      nodeCount: 2,
      transitions: [[0, 2]],
      valuation: {},
    });
    expect(typeof result).toBe("string");
  });

  it("rejects out-of-range valuation indices", () => {
    const result = parseKripkeStructureJson({
      nodeCount: 2,
      transitions: [],
      valuation: { p: [0, 3] },
    });
    expect(typeof result).toBe("string");
  });

  // PBT: any well-formed generated structure should parse successfully
  it("accepts any well-formed Kripke structure (PBT)", () => {
    const arbKripke = fc
      .integer({ min: 1, max: 20 })
      .chain((nodeCount) => {
        const arbIndex = fc.integer({ min: 0, max: nodeCount - 1 });
        return fc.record({
          nodeCount: fc.constant(nodeCount),
          transitions: fc.array(fc.tuple(arbIndex, arbIndex)),
          valuation: fc.dictionary(
            fc.stringMatching(/^[a-z]{1,5}$/),
            fc.array(arbIndex),
          ),
        });
      });

    fc.assert(
      fc.property(arbKripke, (ks) => {
        const result = parseKripkeStructureJson(ks);
        return typeof result !== "string";
      }),
    );
  });

  // PBT: corrupting a valid structure should be caught
  it("rejects structures with negative transition indices (PBT)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ max: -1 }),
        (nodeCount, badIdx) => {
          const result = parseKripkeStructureJson({
            nodeCount,
            transitions: [[0, badIdx]],
            valuation: {},
          });
          return typeof result === "string";
        },
      ),
    );
  });
});

describe("parseKripkeStructureVisualizationJson", () => {
  it("accepts a valid structure with visualization params", () => {
    const result = parseKripkeStructureVisualizationJson({
      frame: { nodeCount: 2, transitions: [[0, 1]], valuation: { p: [0] } },
      visualizationParams: { colors: { p: "#ff0000" } },
    });
    expect(typeof result).not.toBe("string");
  });

  it("accepts without visualizationParams", () => {
    const result = parseKripkeStructureVisualizationJson({
      frame: { nodeCount: 1, transitions: [], valuation: {} },
    });
    expect(typeof result).not.toBe("string");
  });

  it("rejects invalid frame", () => {
    const result = parseKripkeStructureVisualizationJson({
      frame: { nodeCount: 0, transitions: [], valuation: {} },
    });
    expect(typeof result).toBe("string");
  });

  it("rejects non-string color values", () => {
    const result = parseKripkeStructureVisualizationJson({
      frame: { nodeCount: 1, transitions: [], valuation: { p: [0] } },
      visualizationParams: { colors: { p: 123 } },
    });
    expect(typeof result).toBe("string");
  });

  // PBT: well-formed visualization JSON always parses
  it("accepts any well-formed visualization JSON (PBT)", () => {
    const arbColor = fc.stringMatching(/^#[0-9a-f]{6}$/);
    const arbViz = fc
      .integer({ min: 1, max: 20 })
      .chain((nodeCount) => {
        const arbIndex = fc.integer({ min: 0, max: nodeCount - 1 });
        const arbPropName = fc.stringMatching(/^[a-z]{1,5}$/);
        return fc.record({
          frame: fc.record({
            nodeCount: fc.constant(nodeCount),
            transitions: fc.array(fc.tuple(arbIndex, arbIndex)),
            valuation: fc.dictionary(arbPropName, fc.array(arbIndex)),
          }),
          visualizationParams: fc.option(
            fc.record({ colors: fc.dictionary(arbPropName, arbColor) }),
            { nil: undefined },
          ),
        });
      });

    fc.assert(
      fc.property(arbViz, (v) => {
        const result = parseKripkeStructureVisualizationJson(v);
        return typeof result !== "string";
      }),
    );
  });
});
