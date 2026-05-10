"use client";

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { FloatingFeedbackButton } from "@/components/ui/floating-feedback-button"
import { MVP_COMMAND_CENTRE_NAME, RETENTIONOS_MARK } from "@/lib/mvp/cohesion"
import { usePathname } from "next/navigation"
import { DemoModeProvider } from "@/lib/demo-mode/context"

const PRODUCT_CRUMB = { label: RETENTIONOS_MARK, path: "/dashboard" } as const
const COMMAND_CENTRE_CRUMB = { label: MVP_COMMAND_CENTRE_NAME, path: "/dashboard" } as const

const MVP_ROUTE_SEGMENTS = new Set(["dashboard", "cohorts", "retention", "ltv", "insights", "data"])

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)

    const moduleLabels: Record<string, string> = {
      dashboard: "Dashboard",
      cohorts: "Cohorts",
      retention: "Retention",
      ltv: "LTV",
      insights: "Insights",
      data: "Data",
      products: "Products",
      acquisition: "Acquisition",
      scenarios: "Scenarios",
      settings: "Settings",
    }

    const pageLabels: Record<string, string> = {
      integrations: "Integrations",
      feedback: "Support & Feedback",
    }

    const inCommandCentreSpine = segments.length > 0 && MVP_ROUTE_SEGMENTS.has(segments[0] ?? "")

    const tail: { label: string; path: string }[] = []
    let currentPath = ""

    segments.forEach((segment) => {
      currentPath += `/${segment}`

      if (moduleLabels[segment]) {
        tail.push({ label: moduleLabels[segment], path: currentPath })
      } else if (pageLabels[segment]) {
        tail.push({ label: pageLabels[segment], path: currentPath })
      } else {
        const label = segment.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")
        tail.push({ label, path: currentPath })
      }
    })

    if (pathname === "/dashboard") {
      return [
        PRODUCT_CRUMB,
        COMMAND_CENTRE_CRUMB,
        { label: "Dashboard", path: "/dashboard" },
      ]
    }

    if (inCommandCentreSpine) {
      return [PRODUCT_CRUMB, COMMAND_CENTRE_CRUMB, ...tail]
    }

    return [PRODUCT_CRUMB, ...tail]
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <DemoModeProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList className="flex-wrap">
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb.path}-${crumb.label}`} className="flex items-center gap-2">
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.path}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator />
                    )}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-x-hidden min-w-0 bg-zinc-50/80 p-4 pt-0">
          {children}
        </div>
        </SidebarInset>
        <FloatingFeedbackButton />
      </SidebarProvider>
    </DemoModeProvider>
  )
}
