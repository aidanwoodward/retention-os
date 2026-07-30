import type { MvpRouteId } from "../mvp/cohesion";
import type { Insight } from "../types/insight";

/**
 * Analytical surfaces that may receive Matrix placement.
 * Canonical `/insights` inbox bypasses Matrix and is intentionally excluded.
 */
export const MATRIX_SURFACES = [
  "dashboard",
  "cohorts",
  "retention",
  "ltv",
  "acquisition",
  "products",
] as const satisfies readonly MvpRouteId[];

export type MatrixSurfaceId = (typeof MATRIX_SURFACES)[number];

/**
 * Explicit ordered eligibility per analytical surface.
 * Placement policy only - does not trigger, score, cap, or filter by sufficiency.
 */
const MATRIX_PLACEMENT: Readonly<Record<MatrixSurfaceId, readonly string[]>> = {
  dashboard: ["revenue-durability-snapshot"],
  retention: [
    "portfolio-repeat-depth",
    "first-to-second-within-ninety-days",
    "retention-timing-interpretation",
  ],
  ltv: [
    "cohort-ltv-dispersion",
    "contribution-vs-net-revenue-ltv",
    "recent-cohort-aligned-ltv-check",
  ],
  acquisition: [],
  products: [],
  cohorts: [],
};

function isMatrixSurfaceId(surface: string): surface is MatrixSurfaceId {
  return (MATRIX_SURFACES as readonly string[]).includes(surface);
}

/**
 * Select finalised canonical Signals for an analytical surface.
 * Order follows Matrix policy; absent registered IDs are skipped; input is not mutated.
 */
export function selectSignalsForSurface(
  signals: readonly Insight[],
  surface: MatrixSurfaceId,
): Insight[] {
  if (!isMatrixSurfaceId(surface)) {
    throw new RangeError(`Unknown Matrix surface "${String(surface)}"`);
  }

  const byId = new Map<string, Insight>();
  for (const signal of signals) {
    if (!byId.has(signal.id)) {
      byId.set(signal.id, signal);
    }
  }

  const ordered: Insight[] = [];
  for (const id of MATRIX_PLACEMENT[surface]) {
    const match = byId.get(id);
    if (match) {
      ordered.push(match);
    }
  }
  return ordered;
}
