"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabaseClient"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [sessionUser, setSessionUser] = useState(user)

  useEffect(() => {
    let cancelled = false

    async function loadSessionUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (cancelled || !authUser) {
        return
      }

      setSessionUser({
        name: authUser.user_metadata?.full_name ?? user.name,
        email: authUser.email ?? user.email,
        avatar: user.avatar,
      })
    }

    void loadSessionUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user
      if (!authUser) {
        return
      }

      setSessionUser({
        name: authUser.user_metadata?.full_name ?? user.name,
        email: authUser.email ?? user.email,
        avatar: user.avatar,
      })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [user.avatar, user.email, user.name])

  const handleSignOut = async () => {
    try {
      await fetch("/auth/signout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Sign out error:", error)
      await supabase.auth.signOut()
      router.push("/login")
    }
  }

  const initials = sessionUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={sessionUser.avatar} alt={sessionUser.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{sessionUser.name}</span>
                <span className="truncate text-xs">{sessionUser.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={sessionUser.avatar} alt={sessionUser.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{sessionUser.name}</span>
                  <span className="truncate text-xs">{sessionUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
