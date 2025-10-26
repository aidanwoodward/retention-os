"use client"

import * as React from "react"
import {
  BarChart3,
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
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Cohorts",
      url: "#",
      icon: BarChart3,
      items: [
        {
          title: "Revenue Cohorts",
          url: "/cohorts/revenue",
        },
        {
          title: "Category Cohorts",
          url: "/cohorts/category",
        },
        {
          title: "Composition Cohorts",
          url: "/cohorts/composition",
        },
      ],
    },
    {
      title: "Customers",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Customer List",
          url: "/customers/list",
        },
        {
          title: "Customer Segments",
          url: "/customers/segments",
        },
        {
          title: "Customer Profile",
          url: "/customers/profile",
        },
      ],
    },
    {
      title: "Products",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Product Performance",
          url: "/products/performance",
        },
        {
          title: "Cross-sell Analysis",
          url: "/products/cross-sell",
        },
        {
          title: "Replenishment",
          url: "/products/replenishment",
        },
      ],
    },
    {
      title: "Retention",
      url: "#",
      icon: TrendingUp,
      items: [
        {
          title: "Churn Analysis",
          url: "/retention/churn",
        },
        {
          title: "Retention Curve",
          url: "/retention/curve",
        },
        {
          title: "Reactivation",
          url: "/retention/reactivation",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "Integrations",
          url: "/integrations",
        },
        {
          title: "User Settings",
          url: "/settings/user",
        },
        {
          title: "API Keys",
          url: "/settings/api",
        },
        {
          title: "Feedback & Support",
          url: "/feedback",
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
