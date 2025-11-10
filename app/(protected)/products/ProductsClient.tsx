'use client'

import * as React from "react"

import { Button } from "@/components/ui/button"
import { DataState, EmptyState, ErrorState } from "@/components/ui/data-state"
import { InsightPanel } from "@/components/ui/insight-panel"
import { KpiSection } from "@/components/ui/kpi-section"
import { PageHeader } from "@/components/ui/page-header"
import { TableSection } from "@/components/ui/table-section"
import { useMergedSearchParams, type SearchParamsRecord } from "@/hooks/use-merged-search-params"
import { getPageContent } from "@/lib/content-map"
import { useDemoMode } from "@/lib/demo-mode/context"
import { generateProductDemoData } from "@/lib/demo-data/products"
import { resolveDemoSeed } from "@/lib/demo-data/seed"
import { resolveDemoState } from "@/lib/demo-data/state"

interface ProductsClientProps {
  initialSearchParams?: SearchParamsRecord
}

export default function ProductsClient({
  initialSearchParams,
}: ProductsClientProps) {
  const { demoMode, isDemoModeAvailable } = useDemoMode()
  const mergedSearchParams = useMergedSearchParams(initialSearchParams)

  const seed = React.useMemo(
    () => resolveDemoSeed(mergedSearchParams),
    [mergedSearchParams]
  )
  const baseState = React.useMemo(
    () => resolveDemoState(mergedSearchParams),
    [mergedSearchParams]
  )
  const demoModeActive = isDemoModeAvailable && demoMode
  const status = baseState !== "ready" ? baseState : demoModeActive ? "ready" : "empty"

  const demoData = React.useMemo(
    () => (demoModeActive ? generateProductDemoData(seed) : null),
    [demoModeActive, seed]
  )

  const content = getPageContent("products")
  const { title, summary, kpis, actions } = content
  const kpiItems = kpis.map((kpi) => ({
    id: kpi.key,
    label: kpi.label,
    metric: demoData?.metrics[kpi.key],
  }))

  return (
    <DataState
      status={status}
      empty={
        <EmptyState
          title="Connect Shopify to unlock product analytics"
          description="Once your store syncs, you’ll see SKU performance, replenishment signals, and retention insights here."
          action={{ label: "Connect Shopify", href: "/connect/shopify" }}
        />
      }
      error={
        <ErrorState
          message="Product analytics are temporarily unavailable. Check sync status or try again."
          action={{ label: "Open sync status", href: "/sync" }}
        />
      }
    >
      {demoData ? (
        <div className="flex flex-col">
          <PageHeader
            title={title}
            description={summary}
            actions={
              <div className="flex gap-2">
                {actions.secondary?.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? "outline"}
                  >
                    {action.label}
                  </Button>
                ))}
                {actions.primary ? (
                  <Button size="sm" variant={actions.primary.variant ?? "default"}>
                    {actions.primary.label}
                  </Button>
                ) : null}
              </div>
            }
          />

          <div className="mt-4">
            <KpiSection items={kpiItems} />
          </div>

          <div className="mt-6">
            <InsightPanel
              title={demoData.insight.title}
              description={demoData.insight.description}
              metricLabel={demoData.insight.metricLabel}
              data={demoData.insight.data}
              footer={demoData.insight.footer}
            />
          </div>

          <div className="mt-6">
            <TableSection
              title="SKU performance snapshot"
              description="Key retention KPIs for your top-performing products."
              caption={demoData.table.caption}
              columns={demoData.table.columns}
              rows={demoData.table.rows}
            />
          </div>
        </div>
      ) : null}
    </DataState>
  )
}

