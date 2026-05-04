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
import { usePathname } from "next/navigation"
import { DemoModeProvider } from "@/lib/demo-mode/context"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)

    if (pathname === '/dashboard') {
      return [{ label: 'Retention OS', path: '/dashboard' }, { label: 'Dashboard', path: '/dashboard' }]
    }

    const breadcrumbs = [{ label: 'Retention OS', path: '/dashboard' }]

    if (segments.length === 0) {
      return breadcrumbs
    }

    const moduleLabels: Record<string, string> = {
      dashboard: 'Dashboard',
      cohorts: 'Cohorts',
      retention: 'Retention',
      ltv: 'LTV',
      insights: 'Insights',
      data: 'Data',
      products: 'Products',
      acquisition: 'Acquisition',
      scenarios: 'Scenarios',
      settings: 'Settings',
    }

    const pageLabels: Record<string, string> = {
      integrations: 'Integrations',
      feedback: 'Support & Feedback',
    }

    let currentPath = ''
    segments.forEach((segment) => {
      currentPath += `/${segment}`

      if (moduleLabels[segment]) {
        breadcrumbs.push({ label: moduleLabels[segment], path: currentPath })
      } else if (pageLabels[segment]) {
        breadcrumbs.push({ label: pageLabels[segment], path: currentPath })
      } else {
        const label = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
        breadcrumbs.push({ label, path: currentPath })
      }
    })

    return breadcrumbs
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
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-2">
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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-x-hidden min-w-0">
          {children}
        </div>
        </SidebarInset>
        <FloatingFeedbackButton />
      </SidebarProvider>
    </DemoModeProvider>
  )
}