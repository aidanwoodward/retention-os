import { defaultSeed } from "./prng"

type SearchParams =
  | {
      [key: string]: string | string[] | undefined
    }
  | undefined

export function resolveDemoSeed(searchParams: SearchParams): string {
  if (process.env.NODE_ENV !== "development") {
    return defaultSeed
  }

  const seedParam = searchParams?.seed
  if (Array.isArray(seedParam)) {
    return seedParam[0] || defaultSeed
  }

  if (typeof seedParam === "string" && seedParam.trim()) {
    return seedParam.trim()
  }

  return defaultSeed
}

