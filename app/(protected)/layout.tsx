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
    const segments = pathname.split('/').filter(Boolean);
    
    // Special case: dashboard routes to executive
    if (pathname === '/dashboard') {
      return [
        { label: 'Retention OS', path: '/executive' },
        { label: 'Overview', path: '/executive' }
      ];
    }

    const breadcrumbs = [{ label: 'Retention OS', path: '/executive' }];
    
    if (segments.length === 0) {
      return breadcrumbs;
    }

    // Map paths to display names
    const moduleLabels: Record<string, string> = {
      'executive': 'Executive',
      'cohorts': 'Cohorts',
      'retention': 'Retention',
      'retention-ltv': 'Retention & LTV',
      'customers': 'Customers',
      'customer-intelligence': 'Customer Intelligence',
      'products': 'Products',
      'product-economics': 'Product Economics',
      'financials': 'Financials',
      'segments': 'Segments',
      'integrations': 'Integrations',
      'settings': 'Settings',
      'feedback': 'Feedback',
      'connect': 'Connect'
    };

    const pageLabels: Record<string, string> = {
      'reconciliation': 'Data Reconciliation',
      'exports': 'Exports',
      'revenue-cohorts': 'Revenue Cohorts',
      'curves': 'Retention Curves',
      'ltv-cohorts': 'CLR & LTV Cohorts',
      'repeat-rates': 'Repeat Purchase Rates',
      'composition': 'Customer Composition',
      'segments': 'Segments',
      'profiles': 'Customer Profiles',
      'performance': 'Product Performance',
      'concentration': 'Concentration Curve',
      'discounts': 'Discount Usage',
      'replenishment': 'Replenishment Frequency',
      'revenue': 'Revenue Intelligence',
      'ltv-summary': 'LTV Summary',
      'forecasts': 'Forecasts & Scenarios',
      'integrations': 'Integrations',
      'feedback': 'Support & Feedback',
      'category': 'Category Breakdown',
      'list': 'Customer List',
      'profile': 'Customer Profile',
      'cross-sell': 'Cross-sell',
      'sync': 'Sync Status',
      'shopify': 'Shopify',
      'klaviyo': 'Klaviyo'
    };

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Module level
      if (moduleLabels[segment] && index === 0) {
        breadcrumbs.push({ label: moduleLabels[segment], path: currentPath });
      } 
      // Page level
      else if (pageLabels[segment]) {
        breadcrumbs.push({ label: pageLabels[segment], path: currentPath });
      }
      // Fallback for unknown segments
      else if (index > 0 || !moduleLabels[segment]) {
        const label = segment.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        breadcrumbs.push({ label, path: currentPath });
      }
    });

    return breadcrumbs;
  };

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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
        </SidebarInset>
        <FloatingFeedbackButton />
      </SidebarProvider>
    </DemoModeProvider>
  )
}