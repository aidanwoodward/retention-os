import { Cloud, ShieldCheck } from "lucide-react"

import type { IntegrationRecord } from "@/lib/demo-data/integrations"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const statusStyles: Record<
  IntegrationRecord["status"],
  { badge: string; label: string }
> = {
  connected: {
    badge: "bg-emerald-500/15 text-emerald-600",
    label: "Connected",
  },
  pending: {
    badge: "bg-amber-500/15 text-amber-600",
    label: "Pending",
  },
  error: {
    badge: "bg-rose-500/15 text-rose-600",
    label: "Error",
  },
}

interface IntegrationCardProps {
  integration: IntegrationRecord
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const statusStyle = statusStyles[integration.status]

  return (
    <Card className="h-full rounded-2xl border border-border/70 bg-card/95 shadow-sm transition duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 hover:shadow-md focus-within:-translate-y-0.5 focus-within:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-foreground text-lg font-semibold leading-tight">
            {integration.name}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm leading-relaxed">
            {integration.description}
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={statusStyle.badge}
          data-status={integration.status}
        >
          {statusStyle.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground text-sm">
            <ShieldCheck className="size-4" />
            <span>{integration.statusDetail}</span>
          </div>
          {integration.lastSynced ? (
            <span className="text-xs">
              Synced via secure channel <Cloud className="inline size-3" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        {integration.highlights ? (
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-3">
            {integration.highlights.map((highlight) => (
              <div key={highlight.label} className="space-y-1">
                <dt className="text-muted-foreground text-[0.75rem] font-medium leading-snug">
                  {highlight.label}
                </dt>
                <dd className="text-base font-semibold text-foreground">
                  {highlight.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {integration.actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? "outline"}
              asChild
            >
              <a href={action.href ?? "#"}>{action.label}</a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

