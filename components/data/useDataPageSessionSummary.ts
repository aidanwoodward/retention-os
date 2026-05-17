"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  getUploadedDatasetSessionSummary,
  type RetentionOSDatasetSummary,
} from "@/lib/data-source";

/**
 * Session upload summary for `/data`: stable after hydrate, synced when CSV save/clear fires `refresh`.
 */
export function useDataPageSessionSummary(): readonly [
  RetentionOSDatasetSummary | null,
  () => void,
] {
  const [summary, setSummary] = useState<RetentionOSDatasetSummary | null>(null);
  const refresh = useCallback(() => {
    setSummary(getUploadedDatasetSessionSummary());
  }, []);
  useLayoutEffect(() => {
    refresh();
  }, [refresh]);
  return [summary, refresh] as const;
}
