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
import { generateFinancialDemoData } from "@/lib/demo-data/financials"
import { resolveDemoSeed } from "@/lib/demo-data/seed"
import { resolveDemoState } from "@/lib/demo-data/state"

interface FinancialsClientProps {
  initialSearchParams?: SearchParamsRecord
}

export default function FinancialsClient({
  initialSearchParams,
}: FinancialsClientProps) {
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
    () => (demoModeActive ? generateFinancialDemoData(seed) : null),
    [demoModeActive, seed]
  )

  const content = getPageContent("financials")
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
          title="Connect your data to unlock financial insights"
          description="Set up integrations to see live financial data. Link your revenue source to monitor net revenue, margin, and retention-adjusted forecasts."
          action={{ label: "Connect Shopify", href: "/connect/shopify" }}
        />
      }
      error={
        <ErrorState
          message="Financial metrics failed to load. Retry the sync or check integration settings."
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
              footer={`${demoData.insight.footer} Next update ${demoData.summary.nextUpdate}.`}
            />
          </div>

          <div className="mt-6">
            <TableSection
              title="Monthly revenue and margin"
              description={`Last refreshed ${demoData.summary.refreshedAt}.`}
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

