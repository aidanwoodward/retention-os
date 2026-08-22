import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { buildDemoRetentionOSDataset } from "../data-source/demo-source";
import { buildImportedRetentionOSDataset } from "../data-source/imported-source";
import { getDatasetSummary } from "../data-source/dataset-helpers";
import { resolveMarketingSpendForUploadedDataset } from "../data-source/marketing-spend-session";
import { importOrdersCsvFromText } from "../import/detect-orders-csv-format";
import { buildDashboardDataCompletenessView } from "../metrics/dashboard-executive-spine";
import { buildProductsPageViewModelFromDataset } from "../metrics/product-quality-view-model";
import {
  canRenderDataReadinessCompleteness,
  mapCompletenessRowToPresentationLabel,
  mapImportMetricStatusToPresentationLabel,
  type DataReadinessPresentationContext,
} from "./data-readiness-presentation";

const RETENTIONOS_FIXTURE = path.resolve(process.cwd(), "docs/sample-retentionos-orders.csv");

function readFixture(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function presentationLabelsForDataset(dataset: Parameters<typeof buildDashboardDataCompletenessView>[0]) {
  const productsVm = buildProductsPageViewModelFromDataset(dataset);
  const completeness = buildDashboardDataCompletenessView(dataset, productsVm);
  const summary = getDatasetSummary(dataset);
  const context: DataReadinessPresentationContext = {
    isDemo: dataset.meta.isDemo,
    marketingSpendSource: summary.marketingSpendSource,
    hasImportedContributionMargin: summary.hasFullOrderContributionMargin,
    hasMarginAssumptions: summary.hasMarginAssumptions,
  };
  const labels: Record<string, string> = {};
  for (const row of completeness.rows) {
    labels[row.id] = mapCompletenessRowToPresentationLabel(row, context);
  }
  return labels;
}

function importedRetentionOsDataset() {
  const { format, result } = importOrdersCsvFromText(readFixture(RETENTIONOS_FIXTURE));
  assert.equal(format, "retentionos_template");
  const built = buildImportedRetentionOSDataset(result, { uploadFormat: "retentionos_template" });
  assert.equal(built.ok, true);
  if (!built.ok) {
    throw new Error("expected imported dataset build to succeed");
  }
  return built.dataset;
}

describe("mapCompletenessRowToPresentationLabel — demo fixture", () => {
  it("never labels readiness rows Observed on demo", () => {
    const labels = presentationLabelsForDataset(buildDemoRetentionOSDataset());
    assert.ok(Object.values(labels).every((label) => label !== "Observed"));
    assert.equal(labels.orders, "Available");
    assert.equal(labels.line_items, "Available");
    assert.equal(labels.marketing_spend, "Available");
  });
});

describe("mapCompletenessRowToPresentationLabel — uploaded CSV", () => {
  it("labels structured imported rows Observed where unlocked", () => {
    const labels = presentationLabelsForDataset(importedRetentionOsDataset());
    assert.equal(labels.line_items, "Observed");
    assert.equal(labels.orders, "Available");
    assert.ok(labels.marketing_spend === "Missing" || labels.marketing_spend === "Partial");
  });

  it("labels actual spend CSV Observed on uploaded dataset", () => {
    const base = importedRetentionOsDataset();
    const withSpend = resolveMarketingSpendForUploadedDataset(
      base,
      [{ month: "2024-01", channel: "meta", spend: 500 }],
      null,
    );
    const labels = presentationLabelsForDataset(withSpend);
    assert.equal(labels.marketing_spend, "Observed");
  });
});

describe("mapCompletenessRowToPresentationLabel — assumption spend", () => {
  it("labels assumption-backed marketing spend Estimated", () => {
    const base = importedRetentionOsDataset();
    const withAssumption = resolveMarketingSpendForUploadedDataset(base, null, {
      marketingSpendPctOfNetRevenue: 0.2,
    });
    const labels = presentationLabelsForDataset(withAssumption);
    assert.equal(labels.marketing_spend, "Estimated");
  });
});

describe("canRenderDataReadinessCompleteness", () => {
  it("does not surface readiness rows for lost_upload", () => {
    const selection = {
      status: "lost_upload" as const,
      metricsAllowed: false,
      dataset: null,
    };
    assert.equal(canRenderDataReadinessCompleteness(selection), false);
  });

  it("does not surface readiness rows for pending", () => {
    const selection = {
      status: "pending" as const,
      metricsAllowed: false,
      dataset: null,
    };
    assert.equal(canRenderDataReadinessCompleteness(selection), false);
  });
});

describe("mapImportMetricStatusToPresentationLabel", () => {
  it("maps locked to Missing", () => {
    assert.equal(mapImportMetricStatusToPresentationLabel({ id: "acquisition", status: "locked" }), "Missing");
  });

  it("maps acquisition partial to Estimated", () => {
    assert.equal(mapImportMetricStatusToPresentationLabel({ id: "acquisition", status: "partial" }), "Estimated");
  });

  it("maps contribution_ltv partial with margin assumption to Estimated", () => {
    assert.equal(
      mapImportMetricStatusToPresentationLabel(
        { id: "contribution_ltv", status: "partial" },
        { hasSavedMarginAssumptions: true },
      ),
      "Estimated",
    );
  });

  it("maps unlocked import metrics to Available (pre-save, not Observed)", () => {
    assert.equal(mapImportMetricStatusToPresentationLabel({ id: "cohorts", status: "unlocked" }), "Available");
  });
});
