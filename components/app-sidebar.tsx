"use client"

import * as React from "react"
import {
  Users,
  Package,
  TrendingUp,
  Settings2,
  Home,
  Target,
  Zap,
  Shield,
  Crown,
  MessageSquare,
  DollarSign,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Retention Analytics navigation data
const data = {
  user: {
    name: "Aidan Woodward",
    email: "aidan@retention-os.com",
    avatar: "/avatars/aidan.jpg",
  },
  teams: [
    {
      name: "Retention OS",
      logo: Crown,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Executive",
      url: "/executive",
      icon: Home,
      isActive: true,
      items: [
        {
          title: "Home Overview",
          url: "/executive",
        },
        {
          title: "Data Reconciliation",
          url: "/executive/reconciliation",
        },
        {
          title: "Exports",
          url: "/executive/exports",
        },
      ],
    },
    {
      title: "Retention & LTV",
      url: "#",
      icon: TrendingUp,
      items: [
        {
          title: "Revenue Cohorts",
          url: "/retention-ltv/revenue-cohorts",
        },
        {
          title: "Retention Curves",
          url: "/retention-ltv/curves",
        },
        {
          title: "CLR & LTV Cohorts",
          url: "/retention-ltv/ltv-cohorts",
        },
        {
          title: "Repeat Purchase Rates",
          url: "/retention-ltv/repeat-rates",
        },
      ],
    },
    {
      title: "Customer Intelligence",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Customer Composition",
          url: "/customer-intelligence/composition",
        },
        {
          title: "Segments",
          url: "/customer-intelligence/segments",
        },
        {
          title: "Customer Profiles",
          url: "/customer-intelligence/profiles",
        },
      ],
    },
    {
      title: "Product Economics",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Product Performance",
          url: "/product-economics/performance",
        },
        {
          title: "Concentration Curve",
          url: "/product-economics/concentration",
        },
        {
          title: "Discount Usage",
          url: "/product-economics/discounts",
        },
        {
          title: "Replenishment Frequency",
          url: "/product-economics/replenishment",
        },
      ],
    },
    {
      title: "Financials",
      url: "#",
      icon: DollarSign,
      items: [
        {
          title: "Revenue Intelligence",
          url: "/financials/revenue",
        },
        {
          title: "LTV Summary",
          url: "/financials/ltv-summary",
        },
        {
          title: "Forecasts & Scenarios",
          url: "/financials/forecasts",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Integrations",
          url: "/settings/integrations",
        },
        {
          title: "User Settings",
          url: "/settings",
        },
        {
          title: "Support & Feedback",
          url: "/settings/feedback",
          icon: MessageSquare,
        },
      ],
    },
  ],
  projects: [
    {
      name: "UK Market",
      url: "/segments/uk",
      icon: Target,
    },
    {
      name: "European Expansion",
      url: "/segments/europe",
      icon: Zap,
    },
    {
      name: "Premium Customers",
      url: "/segments/premium",
      icon: Shield,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
