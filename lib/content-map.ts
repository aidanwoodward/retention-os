export type PageKey =
  | "customers"
  | "retention"
  | "products"
  | "segments"
  | "financials"
  | "reports"

type ActionVariant = "default" | "outline" | "ghost"

export interface PageAction {
  label: string
  href?: string
  icon?: string
  variant?: ActionVariant
}

export interface PageContent {
  title: string
  summary: string
  kpis: Array<{
    key: string
    label: string
    description?: string
  }>
  actions: {
    primary?: PageAction
    secondary?: PageAction[]
  }
}

const pageContentMap: Record<PageKey, PageContent> = {
  customers: {
    title: "Customers",
    summary: "Understand growth, loyalty, and churn risk across your customer base.",
    kpis: [
      { key: "activeCustomers", label: "Active customers" },
      { key: "averageLtv", label: "Average LTV" },
      { key: "churnRisk", label: "Churn risk" },
      { key: "reactivationWins", label: "Reactivation wins" },
    ],
    actions: {
      primary: {
        label: "Export CSV",
        variant: "default",
      },
      secondary: [
        {
          label: "Share view",
          variant: "outline",
        },
      ],
    },
  },
  retention: {
    title: "Retention Command Center",
    summary: "Track active cohorts, detect risk, and coordinate reactivation plays.",
    kpis: [
      { key: "rollingRetention", label: "Rolling 90-day retention" },
      { key: "paybackPeriod", label: "Payback period" },
      { key: "highRiskCohort", label: "High-risk cohort" },
      { key: "expansionRevenue", label: "Expansion revenue" },
    ],
    actions: {
      primary: {
        label: "Launch playbook",
        variant: "default",
      },
      secondary: [
        {
          label: "Share view",
          variant: "outline",
        },
      ],
    },
  },
  products: {
    title: "Products Overview",
    summary: "Spot winning SKUs, tune bundles, and plan replenishment strategies.",
    kpis: [
      { key: "topSku", label: "Top performing SKU" },
      { key: "subscriptionMix", label: "Subscription mix" },
      { key: "atRiskOffer", label: "At-risk offer" },
      { key: "newLaunchVelocity", label: "New launch velocity" },
    ],
    actions: {
      primary: {
        label: "New launch brief",
        variant: "default",
      },
      secondary: [
        {
          label: "Manage bundles",
          variant: "outline",
        },
      ],
    },
  },
  segments: {
    title: "Segment Explorer",
    summary: "Build, monitor, and activate lifecycle segments across retention plays.",
    kpis: [
      { key: "totalSegments", label: "Total active segments" },
      { key: "dynamicAudiences", label: "Dynamic audiences" },
      { key: "segmentCoverage", label: "Segment coverage" },
      { key: "lifecycleGaps", label: "Lifecycle gaps" },
    ],
    actions: {
      primary: {
        label: "Create segment",
        variant: "default",
      },
      secondary: [
        {
          label: "Sync to Klaviyo",
          variant: "outline",
        },
      ],
    },
  },
  financials: {
    title: "Financial Intelligence",
    summary: "Track revenue health, margin performance, and retention-adjusted forecasts.",
    kpis: [
      { key: "netRevenue", label: "Net revenue" },
      { key: "grossMargin", label: "Gross margin" },
      { key: "refundRate", label: "Refund rate" },
      { key: "forecastConfidence", label: "Forecast confidence" },
    ],
    actions: {
      primary: {
        label: "Download forecast",
        variant: "default",
      },
      secondary: [
        {
          label: "Share summary",
          variant: "outline",
        },
      ],
    },
  },
  reports: {
    title: "Reports & Insights",
    summary: "Review weekly performance recaps and assemble executive-ready briefs.",
    kpis: [
      { key: "weeklyRevenue", label: "Weekly revenue" },
      { key: "retentionTrend", label: "Retention trend" },
      { key: "newCustomers", label: "New customers" },
      { key: "reportsReady", label: "Reports ready" },
    ],
    actions: {
      primary: {
        label: "Generate executive deck",
        variant: "default",
      },
      secondary: [
        {
          label: "Download latest recap",
          variant: "outline",
        },
      ],
    },
  },
}

export function getPageContent(key: PageKey): PageContent {
  return pageContentMap[key]
}

