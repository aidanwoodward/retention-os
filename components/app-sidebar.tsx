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
  BarChart3,
  Sparkles,
  Rocket,
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
    avatar: "/avatars/aidan.svg",
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
          title: "Data Health",
          url: "/executive/reconciliation",
        },
      ],
    },
    {
      title: "Revenue Formation",
      url: "#",
      icon: BarChart3,
      items: [
        {
          title: "Revenue Cohorts",
          url: "/retention-ltv/revenue-cohorts",
        },
      ],
    },
    {
      title: "Customer Retention",
      url: "#",
      icon: TrendingUp,
      items: [
        {
          title: "Retention Curves",
          url: "/retention-ltv/curves",
        },
        {
          title: "Repeat Purchase Rates",
          url: "/retention-ltv/repeat-rates",
        },
      ],
    },
    {
      title: "Value Growth",
      url: "#",
      icon: Sparkles,
      items: [
        {
          title: "LTV Curves",
          url: "/retention-ltv/ltv-cohorts",
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
          comingSoon: true,
        },
        {
          title: "Segments",
          url: "/customer-intelligence/segments",
          comingSoon: true,
        },
        {
          title: "Customer Profiles",
          url: "/customer-intelligence/profiles",
          comingSoon: true,
        },
      ],
    },
    {
      title: "Product Insights",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Product Performance",
          url: "/product-economics/performance",
          comingSoon: true,
        },
        {
          title: "Product Concentration",
          url: "/product-economics/concentration",
          comingSoon: true,
        },
        {
          title: "Discount Impact",
          url: "/product-economics/discounts",
          comingSoon: true,
        },
      ],
    },
    {
      title: "Activation",
      url: "#",
      icon: Rocket,
      items: [
        {
          title: "Lifecycle Opportunities",
          url: "#",
          disabled: true,
          comingSoon: true,
        },
        {
          title: "Campaign Sync",
          url: "#",
          disabled: true,
          comingSoon: true,
        },
      ],
    },
    {
      title: "Platform",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Integrations",
          url: "/settings/integrations",
        },
        {
          title: "Exports",
          url: "/executive/exports",
        },
        {
          title: "User Settings",
          url: "/settings",
        },
        {
          title: "Support & Feedback",
          url: "/settings/feedback",
        },
        {
          title: "Roadmap (internal)",
          url: "/roadmap",
        },
      ],
    },
  ],
  projects: [
    {
      name: "UK Market",
      url: "/segments",
      icon: Target,
    },
    {
      name: "European Expansion",
      url: "/segments",
      icon: Zap,
    },
    {
      name: "Premium Customers",
      url: "/segments",
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
