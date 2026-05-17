"use client";

import { useLayoutEffect, useState } from "react";
import { getUploadedDatasetSessionSummary } from "@/lib/data-source";

/** True once mounted if a valid uploaded CSV dataset exists in sessionStorage for this tab. SSR/first paint stays false — avoids hydration mismatch. */
export function useSessionUploadPresence(): boolean {
  const [present, setPresent] = useState(false);
  useLayoutEffect(() => {
    setPresent(getUploadedDatasetSessionSummary() != null);
  }, []);
  return present;
}
