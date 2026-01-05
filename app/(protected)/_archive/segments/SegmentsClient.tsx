/**
 * ARCHIVED: SegmentsClient.tsx
 * 
 * Original Intent: Segment Explorer component for building, monitoring, and activating lifecycle segments
 * Date Archived: 2024-12-19
 * 
 * This component was built to provide:
 * - KPI dashboard (total segments, dynamic audiences, coverage, lifecycle gaps)
 * - Insight panel with segment health metrics
 * - Table view of lifecycle segment health
 * - Actions to create segments and sync to Klaviyo
 * 
 * Why Archived: /segments route converted to "Coming Soon" placeholder for product prioritization
 * 
 * Reintroduce When:
 * - Segment creation/management APIs are ready
 * - Klaviyo integration supports segment syncing
 * - Lifecycle segment tracking is prioritized
 * - Customer data supports dynamic segment definitions
 * 
 * See: docs/unused-product-ideas.md for full documentation
 */

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
import { generateSegmentDemoData } from "@/lib/demo-data/segments"
import { resolveDemoSeed } from "@/lib/demo-data/seed"
import { resolveDemoState } from "@/lib/demo-data/state"

interface SegmentsClientProps {
  initialSearchParams?: SearchParamsRecord
}

export default function SegmentsClient({
  initialSearchParams,
}: SegmentsClientProps) {
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
    () => (demoModeActive ? generateSegmentDemoData(seed) : null),
    [demoModeActive, seed]
  )

  const content = getPageContent("segments")
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
          title="Connect your data to build segments"
          description="Set up integrations to see live segment data. Once customer sync completes, segments will populate with retention insights."
          action={{ label: "Connect Shopify", href: "/connect/shopify" }}
        />
      }
      error={
        <ErrorState
          message="Segments failed to load. Retry the sync or contact support."
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
              title="Lifecycle segment health"
              description="Monitor coverage and value across priority lifecycle cohorts."
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

