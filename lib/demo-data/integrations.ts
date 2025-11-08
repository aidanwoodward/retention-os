import { formatLondonDateTime, formatRelativeTime } from "./format"
import { createSeededRandom } from "./prng"

export type IntegrationStatus = "connected" | "pending" | "error"

export interface IntegrationRecord {
  id: string
  name: string
  description: string
  status: IntegrationStatus
  lastSynced: Date | null
  statusDetail: string
  actions: Array<{
    label: string
    href?: string
    variant?: "default" | "outline" | "ghost"
  }>
  highlights?: Array<{
    label: string
    value: string
  }>
}

interface GenerateIntegrationOptions {
  forceConnected?: boolean
}

interface IntegrationDemoData {
  integrations: IntegrationRecord[]
  generatedAt: Date
}

const definitions = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync orders, customers, and product catalogue nightly.",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    description: "Push lifecycle segments and AI audiences to email flows.",
  },
  {
    id: "analytics",
    name: "Analytics Warehouse",
    description: "Optional: connect Snowflake or BigQuery for enrichment.",
  },
]

export function generateIntegrationDemoData(
  seed: string,
  options: GenerateIntegrationOptions = {}
): IntegrationDemoData {
  const random = createSeededRandom(`${seed}-integrations`)
  const generatedAt = new Date()

  const integrations: IntegrationRecord[] = definitions.map((definition, index) => {
    const statusRoll = random()
    let status: IntegrationStatus = "connected"
    if (!options.forceConnected) {
      if (index === 1 && statusRoll > 0.5) {
        status = "pending"
      } else if (index === 2 && statusRoll > 0.4) {
        status = "error"
      }
    }

    let lastSynced: Date | null = new Date(generatedAt)
    let statusDetail = ""
    const actions: IntegrationRecord["actions"] = []

    if (status === "connected") {
      const minutesAgo = options.forceConnected ? 17 + index * 3 : Math.floor(random() * 90) + 5
      lastSynced = new Date(generatedAt.getTime() - minutesAgo * 60 * 1000)
      statusDetail = `Last synced ${formatRelativeTime(lastSynced, generatedAt)}`
      actions.push(
        { label: "Manage sync", href: "/sync", variant: "outline" },
        { label: "Connection health", href: "/integrations", variant: "ghost" }
      )
    } else if (status === "pending") {
      lastSynced = null
      statusDetail = "Awaiting authentication"
      actions.push(
        { label: "Complete setup", href: "/connect/klaviyo", variant: "default" },
        { label: "Docs", href: "/integrations", variant: "ghost" }
      )
    } else {
      const hoursAgo = Math.floor(random() * 12) + 1
      lastSynced = new Date(generatedAt.getTime() - hoursAgo * 60 * 60 * 1000)
      statusDetail = "Sync failed — retry required"
      actions.push(
        { label: "Retry", href: "/sync", variant: "default" },
        { label: "View logs", href: "/sync", variant: "outline" }
      )
    }

    const record: IntegrationRecord = {
      ...definition,
      status,
      lastSynced,
      statusDetail,
      actions,
      highlights:
        status === "connected"
          ? [
              {
                label: "Orders synced",
                value: `${Math.floor(450 + random() * 120)}`,
              },
              {
                label: "Customers updated",
                value: `${Math.floor(1200 + random() * 240)}`,
              },
            ]
          : undefined,
    }

    return record
  })

  return {
    integrations: integrations.map((integration) => ({
      ...integration,
      statusDetail:
        integration.lastSynced && integration.status === "connected"
          ? `${integration.statusDetail} (${formatLondonDateTime(
              integration.lastSynced
            )})`
          : integration.lastSynced
            ? `${integration.statusDetail}. Last attempt ${formatLondonDateTime(
                integration.lastSynced
              )}`
            : integration.statusDetail,
    })),
    generatedAt,
  }
}

