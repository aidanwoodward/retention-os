'use client'

import * as React from "react"
import { useSearchParams } from "next/navigation"

export type SearchParamsRecord = {
  [key: string]: string | string[] | undefined
}

export function useMergedSearchParams(initialSearchParams?: SearchParamsRecord) {
  const searchParams = useSearchParams()

  return React.useMemo(() => {
    if (!searchParams) {
      return initialSearchParams
    }

    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    return params
  }, [initialSearchParams, searchParams])
}

