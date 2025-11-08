import type { DataStateStatus } from "@/components/ui/data-state"

type SearchParams =
  | {
      [key: string]: string | string[] | undefined
    }
  | undefined

export function resolveDemoState(
  searchParams: SearchParams
): Exclude<DataStateStatus, "loading"> | "loading" {
  if (process.env.NODE_ENV !== "development") {
    return "ready"
  }

  const read = (key: string): string | undefined => {
    const value = searchParams?.[key]
    if (Array.isArray(value)) {
      return value[0]
    }
    return value
  }

  // Dev query flags always take precedence over demo mode so we can QA states quickly.
  if (read("error") === "1") {
    return "error"
  }

  if (read("empty") === "1") {
    return "empty"
  }

  if (read("loading") === "1") {
    return "loading"
  }

  return "ready"
}

