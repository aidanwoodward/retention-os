"use client";

import { useLayoutEffect, useState } from "react";
import {
  buildPendingCommandCentreSelection,
  resolveCommandCentreDatasetSource,
  type CommandCentreDatasetSelection,
} from "./client-selected-source";

/**
 * Sole hydrate path for command-centre dataset selection (Sprint 5V-B).
 * Starts as `pending` so demo metrics cannot flash as commercial truth.
 * Optional `syncEpoch` forces re-resolve after upload/clear on /data.
 */
export function useCommandCentreDatasetSelection(
  seed?: number,
  syncEpoch?: number,
): CommandCentreDatasetSelection {
  const [selection, setSelection] = useState<CommandCentreDatasetSelection>(() =>
    buildPendingCommandCentreSelection(),
  );

  useLayoutEffect(() => {
    setSelection(resolveCommandCentreDatasetSource(seed));
  }, [seed, syncEpoch]);

  return selection;
}
