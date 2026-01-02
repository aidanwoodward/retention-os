import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Internal Next.js query params that should be ignored when comparing/syncing URLs
 */
const INTERNAL_NEXTJS_PARAMS = ['_rsc', '__nextjs_data', '__nextjs_router_state'];

/**
 * Strips internal Next.js params from a URLSearchParams object
 * @param params - The URLSearchParams to clean
 * @returns A new URLSearchParams without internal params
 */
export function stripInternalParams(params: URLSearchParams): URLSearchParams {
  const cleaned = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (!INTERNAL_NEXTJS_PARAMS.includes(key)) {
      cleaned.set(key, value);
    }
  }
  return cleaned;
}

/**
 * Strips internal Next.js params from a query string
 * @param queryString - The query string to clean (e.g., "a=1&_rsc=abc&b=2")
 * @returns A cleaned query string without internal params
 */
export function stripInternalParamsFromQueryString(queryString: string): string {
  const params = new URLSearchParams(queryString);
  return stripInternalParams(params).toString();
}

/**
 * Compares two query strings ignoring internal Next.js params
 * @param query1 - First query string
 * @param query2 - Second query string
 * @returns true if the normalized query strings are equal
 */
export function compareQueryStrings(query1: string, query2: string): boolean {
  const normalized1 = stripInternalParamsFromQueryString(query1);
  const normalized2 = stripInternalParamsFromQueryString(query2);
  return normalized1 === normalized2;
}
