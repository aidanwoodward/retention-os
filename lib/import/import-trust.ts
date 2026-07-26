/**
 * Source-agnostic import trust classification (Sprint 5V-A).
 * Pure helpers — no React, no I/O.
 */

import type { CsvImportIssue, CsvImportSeverity } from "./import-types";

export type ImportTrustSeverity = "fatal" | "limitation" | "notice";

export type ImportReadiness = "blocked" | "accepted_with_limitations" | "ready";

export interface ImportTrustFinding {
  readonly severity: ImportTrustSeverity;
  readonly code?: string;
  readonly message: string;
  readonly row?: number;
}

export const NEGATIVE_CONTRIBUTION_MARGIN_LIMITATION_CODE = "NEGATIVE_CONTRIBUTION_MARGIN";
export const NEGATIVE_CALCULATED_NET_LIMITATION_CODE = "NEGATIVE_CALCULATED_NET";

export const NEGATIVE_CONTRIBUTION_MARGIN_MESSAGE =
  "One or more orders have negative contribution_margin (loss-making). The dataset is accepted, but the metric engine floors negative order contribution to 0, which can overstate contribution LTV, contribution LTV:CAC, and payback.";

export const NEGATIVE_CALCULATED_NET_MESSAGE =
  "One or more orders have calculated net merchandise revenue below zero (gross < discounts + refunds). The dataset is accepted; the metric engine floors net revenue to 0 for those orders, which limits revenue and LTV for affected orders.";

/** Map importer issue severity into trust tiers (errors are fatal). */
export function trustSeverityFromIssue(severity: CsvImportSeverity): ImportTrustSeverity {
  if (severity === "error") return "fatal";
  if (severity === "limitation") return "limitation";
  return "notice";
}

export function findingFromIssue(issue: CsvImportIssue): ImportTrustFinding {
  return {
    severity: trustSeverityFromIssue(issue.severity),
    code: issue.code,
    message: issue.message,
    ...(issue.row !== undefined ? { row: issue.row } : {}),
  };
}

export function partitionTrustFindings(
  issues: readonly CsvImportIssue[],
): {
  readonly limitations: ImportTrustFinding[];
  readonly notices: ImportTrustFinding[];
} {
  const limitations: ImportTrustFinding[] = [];
  const notices: ImportTrustFinding[] = [];
  for (const issue of issues) {
    const finding = findingFromIssue(issue);
    if (finding.severity === "limitation") limitations.push(finding);
    else if (finding.severity === "notice" || finding.severity === "fatal") {
      // Fatals are handled via blocked; if present among warnings, treat as notice bucket skip.
      if (finding.severity === "notice") notices.push(finding);
    } else {
      notices.push(finding);
    }
  }
  return { limitations, notices };
}

/**
 * Dataset readiness: no universal sample-size gate.
 * Notices alone do not prevent ready; any limitation (source or metric) → accepted_with_limitations.
 */
export function deriveImportReadiness(input: {
  readonly blocked: boolean;
  readonly hasLimitations: boolean;
}): ImportReadiness {
  if (input.blocked) return "blocked";
  if (input.hasLimitations) return "accepted_with_limitations";
  return "ready";
}
