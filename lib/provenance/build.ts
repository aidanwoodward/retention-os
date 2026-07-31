/**
 * Pure Provenance builders — compose existing metadata; never recalculate metrics.
 */

import { getMetricDefinition } from "../metrics/metric-definitions";
import {
  CONTRACTED_METRIC_IDS,
  getMetricContractIndexEntry,
  type ContractedMetricId,
} from "../metrics/metric-contract-index";
import type {
  MetricProvenance,
  MetricProvenanceInput,
  ProvenanceAssumptions,
  ProvenanceMaturity,
  ProvenanceMethodology,
  ProvenancePopulation,
  ProvenanceReportingScope,
  ProvenanceSourceIdentity,
  SignalProvenance,
  SignalProvenanceInput,
} from "./types";

function requireContractedMetricId(metricId: string): ContractedMetricId {
  if (!(CONTRACTED_METRIC_IDS as readonly string[]).includes(metricId)) {
    throw new RangeError(`Unknown contracted metric id: ${metricId}`);
  }
  return metricId as ContractedMetricId;
}

function copySource(source: ProvenanceSourceIdentity): ProvenanceSourceIdentity {
  return {
    sourceType: source.sourceType,
    ...(source.uploadFormat !== undefined ? { uploadFormat: source.uploadFormat } : {}),
    sourceLabel: source.sourceLabel,
    isDemo: source.isDemo,
    isUploaded: source.isUploaded,
  };
}

function copyReportingScope(scope: ProvenanceReportingScope): ProvenanceReportingScope {
  if (scope.reportingPeriod === undefined) {
    return { asOfDate: scope.asOfDate };
  }
  return {
    reportingPeriod: {
      startDate: scope.reportingPeriod.startDate,
      endDateExclusive: scope.reportingPeriod.endDateExclusive,
    },
    asOfDate: scope.asOfDate,
  };
}

function pickPopulation(population?: ProvenancePopulation): ProvenancePopulation | undefined {
  if (!population) return undefined;
  const out: {
    eligibleCustomerCount?: number;
    reportingOrderCount?: number;
    identifiableReportingOrderCount?: number;
    guestReportingOrderCount?: number;
    metricEligibleCount?: number;
  } = {};
  if (population.eligibleCustomerCount !== undefined) {
    out.eligibleCustomerCount = population.eligibleCustomerCount;
  }
  if (population.reportingOrderCount !== undefined) {
    out.reportingOrderCount = population.reportingOrderCount;
  }
  if (population.identifiableReportingOrderCount !== undefined) {
    out.identifiableReportingOrderCount = population.identifiableReportingOrderCount;
  }
  if (population.guestReportingOrderCount !== undefined) {
    out.guestReportingOrderCount = population.guestReportingOrderCount;
  }
  if (population.metricEligibleCount !== undefined) {
    out.metricEligibleCount = population.metricEligibleCount;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function pickAssumptions(assumptions?: ProvenanceAssumptions): ProvenanceAssumptions | undefined {
  if (!assumptions) return undefined;
  const out: {
    contributionMarginPct?: number;
    netRevenueMultiplier?: number;
    marketingSpendPctOfNetRevenue?: number;
    marketingSpendSource?: ProvenanceAssumptions["marketingSpendSource"];
  } = {};
  if (assumptions.contributionMarginPct !== undefined) {
    out.contributionMarginPct = assumptions.contributionMarginPct;
  }
  if (assumptions.netRevenueMultiplier !== undefined) {
    out.netRevenueMultiplier = assumptions.netRevenueMultiplier;
  }
  if (assumptions.marketingSpendPctOfNetRevenue !== undefined) {
    out.marketingSpendPctOfNetRevenue = assumptions.marketingSpendPctOfNetRevenue;
  }
  if (assumptions.marketingSpendSource !== undefined) {
    out.marketingSpendSource = assumptions.marketingSpendSource;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function pickMaturity(maturity?: ProvenanceMaturity): ProvenanceMaturity | undefined {
  if (!maturity) return undefined;
  const out: { status?: ProvenanceMaturity["status"]; completedOffsetsOnly?: boolean } = {};
  if (maturity.status !== undefined) out.status = maturity.status;
  if (maturity.completedOffsetsOnly !== undefined) {
    out.completedOffsetsOnly = maturity.completedOffsetsOnly;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildMethodology(metricId: MetricProvenance["metricId"]): ProvenanceMethodology {
  const indexEntry = getMetricContractIndexEntry(metricId);
  const definition = getMetricDefinition(metricId);
  return {
    metricId,
    docAnchor: indexEntry.docAnchor,
    meaning: definition.meaning,
    retentionOsBasis: definition.retentionOsBasis,
    ...(definition.caveat !== undefined ? { caveat: definition.caveat } : {}),
  };
}

/**
 * Build deterministic metric provenance from trusted inputs + canonical registries.
 * Fails closed when `metricId` is not a contracted MetricId.
 */
export function buildMetricProvenance(input: MetricProvenanceInput): MetricProvenance {
  const metricId = requireContractedMetricId(input.metricId);
  const methodology = buildMethodology(metricId);
  const caveats: string[] = [];
  if (methodology.caveat !== undefined) {
    caveats.push(methodology.caveat);
  }
  if (input.caveats) {
    for (const c of input.caveats) {
      caveats.push(c);
    }
  }

  const population = pickPopulation(input.population);
  const assumptions = pickAssumptions(input.assumptions);
  const maturity = pickMaturity(input.maturity);

  return {
    metricId,
    methodology,
    source: copySource(input.source),
    reportingScope: copyReportingScope(input.reportingScope),
    ...(population !== undefined ? { population } : {}),
    ...(assumptions !== undefined ? { assumptions } : {}),
    ...(maturity !== undefined ? { maturity } : {}),
    caveats,
  };
}

/**
 * Compose Signal provenance from Signal identity + metricRefs.
 * Does not copy observations, sufficiency, Signal caveats, evidence, destination, or severity.
 * Does not mutate the input signal object.
 */
export function buildSignalProvenance(input: SignalProvenanceInput): SignalProvenance {
  const metrics = input.signal.metricRefs.map((metricId) =>
    buildMetricProvenance({
      metricId,
      source: input.source,
      reportingScope: input.reportingScope,
      population: input.population,
      assumptions: input.assumptions,
      maturity: input.maturity,
    }),
  );

  return {
    signalId: input.signal.id,
    metrics,
    source: copySource(input.source),
    reportingScope: copyReportingScope(input.reportingScope),
  };
}
