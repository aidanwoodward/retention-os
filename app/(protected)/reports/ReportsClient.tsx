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
import { generateReportsDemoData } from "@/lib/demo-data/reports"
import { resolveDemoSeed } from "@/lib/demo-data/seed"
import { resolveDemoState } from "@/lib/demo-data/state"

interface ReportsClientProps {
  initialSearchParams?: SearchParamsRecord
}

export default function ReportsClient({
  initialSearchParams,
}: ReportsClientProps) {
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
    () => (demoModeActive ? generateReportsDemoData(seed) : null),
    [demoModeActive, seed]
  )

  const content = getPageContent("reports")
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
          title="Connect your data to enable reporting"
          description="Set up integrations to see live reports. Weekly recaps and executive decks will appear here once your store data flows in."
          action={{ label: "Connect Shopify", href: "/connect/shopify" }}
        />
      }
      error={
        <ErrorState
          message="Reports are temporarily unavailable. Check sync status or try again."
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
              title="Latest reports"
              description={`Weekly summary generated ${demoData.weeklySummary.generatedAt}.`}
              caption={demoData.table.caption}
              columns={demoData.table.columns}
              rows={demoData.table.rows}
            />
          </div>

          <section className="mt-6 rounded-2xl border border-dashed border-muted/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <h3 className="text-base font-semibold text-foreground">Key insights this week</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              {demoData.weeklySummary.keyInsights.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </DataState>
  )
}

