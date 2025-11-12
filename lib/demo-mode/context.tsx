'use client'

import * as React from "react"

const WORKSPACE_ID =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "default")
    : "default"
const STORAGE_KEY_PREFIX = "retentionos:demo-mode"
const DISABLE_DEMO_MODE =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_DISABLE_DEMO_MODE === "true" ||
    process.env.DISABLE_DEMO_MODE === "true")
const IS_PROD = typeof process !== "undefined" && process.env.NODE_ENV === "production"

interface DemoModeContextValue {
  demoMode: boolean
  setDemoMode: (value: boolean) => void
  toggleDemoMode: () => void
  isHydrated: boolean
  isDemoModeAvailable: boolean
}

const DemoModeContext = React.createContext<DemoModeContextValue | undefined>(undefined)

function getStorageKey(workspaceId: string) {
  return `${STORAGE_KEY_PREFIX}:${workspaceId}`
}

function readStoredDemoMode(storageKey: string): boolean | null {
  if (typeof window === "undefined") {
    return null
  }

  const stored = window.localStorage.getItem(storageKey)
  if (stored === null) {
    return null
  }

  return stored === "true"
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = React.useState<boolean>(false)
  const [isHydrated, setIsHydrated] = React.useState(false)
  const warnedRef = React.useRef(false)
  const originalFetchRef = React.useRef<typeof fetch | null>(null)
  const storageKey = getStorageKey(WORKSPACE_ID)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window)
    }

    const stored = readStoredDemoMode(storageKey)
    // Default to ON in production, OFF in development (unless disabled)
    // In production, always default to ON unless explicitly stored as false
    const defaultValue = IS_PROD 
      ? (stored ?? true)  // Production: default ON, respect stored preference
      : (stored ?? !DISABLE_DEMO_MODE)  // Development: respect stored or default based on DISABLE_DEMO_MODE

    if (!DISABLE_DEMO_MODE) {
      setDemoModeState(defaultValue)
    } else {
      setDemoModeState(false)
    }

    setIsHydrated(true)
  }, [storageKey])

  const persistDemoMode = React.useCallback(
    (value: boolean) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, value ? "true" : "false")
      }
      if (!value) {
        warnedRef.current = false
      }
    },
    [storageKey]
  )

  const setDemoMode = React.useCallback(
    (value: boolean) => {
      if (DISABLE_DEMO_MODE) {
        return
      }
      setDemoModeState(value)
      persistDemoMode(value)
    },
    [persistDemoMode]
  )

  const toggleDemoMode = React.useCallback(() => {
    if (DISABLE_DEMO_MODE) {
      return
    }
    setDemoModeState((prev) => {
      const next = !prev
      persistDemoMode(next)
      return next
    })
  }, [persistDemoMode])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const originalFetch = originalFetchRef.current ?? window.fetch.bind(window)

    if (!demoMode || DISABLE_DEMO_MODE) {
      window.fetch = originalFetch
      warnedRef.current = false
      return () => {
        window.fetch = originalFetch
      }
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined
      const method = (init?.method ?? request?.method ?? "GET").toUpperCase()

      if (method === "GET") {
        return originalFetch(input, init)
      }

      if (!warnedRef.current && process.env.NODE_ENV !== "production") {
        console.warn(
          "[demo-mode] Network write skipped because Demo Mode is enabled.",
          method,
          input
        )
        warnedRef.current = true
      }

      const body = JSON.stringify({
        success: true,
        demo: true,
        message: "Demo mode active: network write skipped.",
      })

      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [demoMode])

  const value = React.useMemo<DemoModeContextValue>(
    () => ({
      demoMode: !DISABLE_DEMO_MODE && demoMode,
      setDemoMode,
      toggleDemoMode,
      isHydrated,
      isDemoModeAvailable: !DISABLE_DEMO_MODE,
    }),
    [demoMode, isHydrated, setDemoMode, toggleDemoMode]
  )

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
}

export function useDemoMode() {
  const context = React.useContext(DemoModeContext)
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider")
  }
  return context
}

