/**
 * CTL model checker over Kripke structures.
 *
 * Given a `KripkeStructureJson` and a `CTLFormula`, computes the
 * **satisfaction set** for every subformula: the set of states where
 * that subformula holds.
 *
 * The transition relation is **totalized** before model checking:
 * deadlock states (states with no successors) receive a self-loop.
 * This is the standard treatment for CTL path semantics, ensuring
 * that every state has at least one infinite path from it.
 *
 * The algorithm follows the standard fixpoint characterization of CTL:
 *   EF φ   = μZ. φ ∨ EX Z
 *   AF φ   = μZ. φ ∨ AX Z
 *   EG φ   = νZ. φ ∧ EX Z
 *   AG φ   = νZ. φ ∧ AX Z
 *   E[φ U ψ] = μZ. ψ ∨ (φ ∧ EX Z)
 *   A[φ U ψ] = μZ. ψ ∨ (φ ∧ AX Z)
 */

import type { KripkeStructureJson } from "./kripke";
import type { CTLFormula } from "./ctl";
import { formulaChildren } from "./ctl";

// ---------------------------------------------------------------------------
// Precomputed transition structure
// ---------------------------------------------------------------------------

/**
 * Represents a totalized transition relation in both forward (successors)
 * and backward (predecessors) adjacency-list form.
 *
 * Invariant: every state has at least one successor (deadlocks are
 * totalized with a self-loop).
 */
interface TransitionIndex {
  /** successors[s] = set of states reachable from s. Non-empty for all s. */
  readonly successors: ReadonlyArray<ReadonlySet<number>>;
  /** predecessors[t] = set of states that have an edge to t. */
  readonly predecessors: ReadonlyArray<ReadonlySet<number>>;
}

/**
 * Builds adjacency lists from the Kripke structure's transition relation,
 * adding a self-loop to any deadlock state (state with no successors).
 */
function buildTransitionIndex(ks: KripkeStructureJson): TransitionIndex {
  const successors: Set<number>[] = Array.from({ length: ks.nodeCount }, () => new Set());
  const predecessors: Set<number>[] = Array.from({ length: ks.nodeCount }, () => new Set());
  for (const [s, t] of ks.transitions) {
    successors[s].add(t);
    predecessors[t].add(s);
  }
  // Totalize: deadlock states get a self-loop
  for (let s = 0; s < ks.nodeCount; s++) {
    if (successors[s].size === 0) {
      successors[s].add(s);
      predecessors[s].add(s);
    }
  }
  return { successors, predecessors };
}

// ---------------------------------------------------------------------------
// Set helpers
// ---------------------------------------------------------------------------

function allStates(n: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < n; i++) s.add(i);
  return s;
}

function union(a: ReadonlySet<number>, b: ReadonlySet<number>): Set<number> {
  const r = new Set(a);
  for (const x of b) r.add(x);
  return r;
}

function intersect(a: ReadonlySet<number>, b: ReadonlySet<number>): Set<number> {
  const r = new Set<number>();
  for (const x of a) {
    if (b.has(x)) r.add(x);
  }
  return r;
}

function complement(n: number, a: ReadonlySet<number>): Set<number> {
  const r = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (!a.has(i)) r.add(i);
  }
  return r;
}

function setsEqual(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Core operators: EX and AX
// ---------------------------------------------------------------------------

/** EX φ: states that have at least one successor in `sat`. */
function computeEX(sat: ReadonlySet<number>, idx: TransitionIndex): Set<number> {
  const result = new Set<number>();
  for (const t of sat) {
    for (const s of idx.predecessors[t]) {
      result.add(s);
    }
  }
  return result;
}

/**
 * AX φ: states where all successors are in `sat`.
 *
 * Precondition: the transition relation is total (every state has ≥1 successor),
 * so AX is never vacuously true.
 */
function computeAX(sat: ReadonlySet<number>, idx: TransitionIndex, n: number): Set<number> {
  const result = new Set<number>();
  for (let s = 0; s < n; s++) {
    let allIn = true;
    for (const t of idx.successors[s]) {
      if (!sat.has(t)) { allIn = false; break; }
    }
    if (allIn) result.add(s);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Fixpoint computation
// ---------------------------------------------------------------------------

/** Least fixpoint: iterates f starting from the empty set until stable. */
function lfp(n: number, f: (z: ReadonlySet<number>) => Set<number>): Set<number> {
  let z: Set<number> = new Set();
  for (;;) {
    const next = f(z);
    if (setsEqual(z, next)) return z;
    z = next;
  }
}

/** Greatest fixpoint: iterates f starting from the set of all states until stable. */
function gfp(n: number, f: (z: ReadonlySet<number>) => Set<number>): Set<number> {
  let z = allStates(n);
  for (;;) {
    const next = f(z);
    if (setsEqual(z, next)) return z;
    z = next;
  }
}

// ---------------------------------------------------------------------------
// Model checker
// ---------------------------------------------------------------------------

/**
 * Returns a Map from each subformula (by reference identity) of `formula`
 * to the set of states in `ks` that satisfy it.
 *
 * The map includes entries for `formula` itself and all of its subformulae.
 */
export function checkCTL(
  ks: KripkeStructureJson,
  formula: CTLFormula,
): Map<CTLFormula, ReadonlySet<number>> {
  const idx = buildTransitionIndex(ks);
  const n = ks.nodeCount;
  const result = new Map<CTLFormula, ReadonlySet<number>>();

  // Build valuation index: prop name -> set of states
  const valIndex = new Map<string, ReadonlySet<number>>();
  for (const [prop, indices] of Object.entries(ks.valuation)) {
    valIndex.set(prop, new Set(indices));
  }

  function eval_(f: CTLFormula): ReadonlySet<number> {
    if (result.has(f)) return result.get(f)!;

    // Recursively evaluate children first
    for (const child of formulaChildren(f)) {
      eval_(child);
    }

    let sat: ReadonlySet<number>;

    switch (f.tag) {
      case "true":
        sat = allStates(n);
        break;
      case "false":
        sat = new Set();
        break;
      case "atom":
        sat = valIndex.get(f.name) ?? new Set();
        break;
      case "not":
        sat = complement(n, eval_(f.sub));
        break;
      case "and":
        sat = intersect(eval_(f.left), eval_(f.right));
        break;
      case "or":
        sat = union(eval_(f.left), eval_(f.right));
        break;
      case "implies":
        sat = union(complement(n, eval_(f.left)), eval_(f.right));
        break;
      case "EX":
        sat = computeEX(eval_(f.sub), idx);
        break;
      case "AX":
        sat = computeAX(eval_(f.sub), idx, n);
        break;
      case "EF":
        { const satPhi = eval_(f.sub);
          sat = lfp(n, (z) => union(satPhi, computeEX(z, idx)));
        }
        break;
      case "AF":
        { const satPhi = eval_(f.sub);
          sat = lfp(n, (z) => union(satPhi, computeAX(z, idx, n)));
        }
        break;
      case "EG":
        { const satPhi = eval_(f.sub);
          sat = gfp(n, (z) => intersect(satPhi, computeEX(z, idx)));
        }
        break;
      case "AG":
        { const satPhi = eval_(f.sub);
          sat = gfp(n, (z) => intersect(satPhi, computeAX(z, idx, n)));
        }
        break;
      case "EU":
        { const satLeft = eval_(f.left);
          const satRight = eval_(f.right);
          sat = lfp(n, (z) => union(satRight, intersect(satLeft, computeEX(z, idx))));
        }
        break;
      case "AU":
        { const satLeft = eval_(f.left);
          const satRight = eval_(f.right);
          sat = lfp(n, (z) => union(satRight, intersect(satLeft, computeAX(z, idx, n))));
        }
        break;
    }

    result.set(f, sat);
    return sat;
  }

  eval_(formula);
  return result;
}
