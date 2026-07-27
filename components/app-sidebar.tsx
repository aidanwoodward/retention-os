"use client"

import * as React from "react"
import { Home, Sparkles, User } from "lucide-react"

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
import {
  MVP_COMMAND_CENTRE_NAME,
  MVP_NAV,
  RETENTIONOS_MARK,
} from "@/lib/mvp/cohesion"

/** Analytical Core links — route/label/order truth from MVP_NAV only. */
const coreItems = MVP_NAV.map(({ label, href }) => ({
  title: label,
  url: href,
}))

const data = {
  user: {
    name: "Aidan Woodward",
    email: "aidan@retention-os.com",
    avatar: "/avatars/aidan.svg",
  },
  teams: [
    {
      name: RETENTIONOS_MARK,
      logo: Sparkles,
      tagline: MVP_COMMAND_CENTRE_NAME,
    },
  ],
  navMain: [
    {
      title: "Core",
      url: "#",
      icon: Home,
      isActive: true,
      items: coreItems,
    },
    {
      title: "Account",
      url: "#",
      icon: User,
      // Shell-level only — not part of MVP_NAV analytical spine.
      items: [{ title: "Settings", url: "/settings" }],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} singleTeamStatic />
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
