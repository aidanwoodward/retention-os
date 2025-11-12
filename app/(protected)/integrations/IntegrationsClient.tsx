'use client'

import * as React from "react"

import { Button } from "@/components/ui/button"
import { DataState, EmptyState, ErrorState } from "@/components/ui/data-state"
import { ConnectIntegrationDialog } from "@/components/integrations/ConnectIntegrationDialog"
import { IntegrationCard } from "@/components/integrations/IntegrationCard"
import { PageHeader } from "@/components/ui/page-header"
import { useDemoMode } from "@/lib/demo-mode/context"
import { generateIntegrationDemoData } from "@/lib/demo-data/integrations"
import { resolveDemoSeed } from "@/lib/demo-data/seed"
import { resolveDemoState } from "@/lib/demo-data/state"
import { useMergedSearchParams, type SearchParamsRecord } from "@/hooks/use-merged-search-params"

interface IntegrationsClientProps {
  initialSearchParams?: SearchParamsRecord
}

export default function IntegrationsClient({
  initialSearchParams,
}: IntegrationsClientProps) {
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

  const demoData = React.useMemo(() => {
    if (!demoModeActive) {
      return null
    }
    return generateIntegrationDemoData(seed, {
      forceConnected: true,
    })
  }, [demoModeActive, seed])

  return (
    <DataState
      status={status}
      empty={
        <EmptyState
          title="No integrations connected yet"
          description="Set up integrations to see live data. Connect Shopify or Klaviyo to start syncing data into Retention OS."
          action={{ label: "Add integration", href: "/connect/shopify" }}
        />
      }
      error={
        <ErrorState
          message="Integration status is temporarily unavailable. Check back shortly or view sync logs."
          action={{ label: "Open sync logs", href: "/sync" }}
        />
      }
    >
      {demoData ? (
        <div className="flex flex-col">
          <PageHeader
            title="Integrations"
            description="Connect the stack powering retention insights, sync cadence, and automation."
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  View webhooks
                </Button>
                <ConnectIntegrationDialog
                  integrationName="Shopify"
                  triggerLabel="Add integration"
                  steps={[
                    "Select the store you want to connect",
                    "Approve requested scopes for orders and customers",
                    "Return to Retention OS to confirm sync cadence",
                  ]}
                />
              </div>
            }
          />

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {demoData.integrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      ) : null}
    </DataState>
  )
}

