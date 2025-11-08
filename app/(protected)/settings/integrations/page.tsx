import { Globe, KeyRound, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"

const configItems = [
  {
    id: "supabase",
    label: "Supabase credentials",
    description: "Anon key and service role used for authentication and sync jobs.",
    status: "Verified",
    statusClass: "bg-emerald-500/15 text-emerald-600",
    lastChecked: "Today, 09:42",
  },
  {
    id: "shopify",
    label: "Shopify app settings",
    description: "API key, secret, and redirect URL for OAuth install flow.",
    status: "Needs review",
    statusClass: "bg-amber-500/15 text-amber-600",
    lastChecked: "Yesterday, 17:18",
  },
  {
    id: "klaviyo",
    label: "Klaviyo private key",
    description: "Required to sync segments and trigger automations.",
    status: "Missing",
    statusClass: "bg-rose-500/15 text-rose-600",
    lastChecked: "—",
  },
]

export default function SettingsIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integration Credentials"
        description="Manage API keys and callback domains that power Retention OS integrations."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Reset secrets
            </Button>
            <Button size="sm">Add credential</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {configItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <Badge variant="outline" className={item.statusClass}>
                {item.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="size-4" />
                <span>Last checked: {item.lastChecked}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline">
                  <KeyRound className="size-4" />
                  Reveal secret
                </Button>
                <Button size="sm" variant="ghost">
                  <Globe className="size-4" />
                  Manage domains
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
