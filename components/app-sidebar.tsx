"use client"

import * as React from "react"
import { Home, Settings2, Sparkles, Target } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Aidan Woodward",
    email: "aidan@retention-os.com",
    avatar: "/avatars/aidan.svg",
  },
  teams: [
    {
      name: "Retention OS",
      logo: Sparkles,
      plan: "MVP",
    },
  ],
  navMain: [
    {
      title: "Core",
      url: "#",
      icon: Home,
      isActive: true,
      items: [
        { title: "Dashboard", url: "/dashboard" },
        { title: "Cohorts", url: "/cohorts" },
        { title: "Retention", url: "/retention" },
        { title: "LTV", url: "/ltv" },
        { title: "Insights", url: "/insights" },
        { title: "Data", url: "/data" },
      ],
    },
    {
      title: "Coming next",
      url: "#",
      icon: Target,
      items: [
        { title: "Products", url: "/products" },
        { title: "Acquisition", url: "/acquisition" },
        { title: "Scenarios", url: "/scenarios" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
