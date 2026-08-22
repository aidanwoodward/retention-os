import { buildDemoRetentionOSDataset } from "@/lib/data-source";
import { DataPageClient } from "@/components/data/DataPageClient";
import { DEMO_WINDOW_END } from "@/lib/demo/demo-config";
import { buildDataPageViewModel } from "@/lib/metrics";

function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(d);
  } catch {
    return iso;
  }
}

export default function DataPage() {
  const vm = buildDataPageViewModel();
  const demoDatasetMeta = buildDemoRetentionOSDataset().meta;
  const windowEndFormatted = formatIsoDate(DEMO_WINDOW_END);

  return (
    <DataPageClient
      vm={vm}
      windowEndFormatted={windowEndFormatted}
      demoDatasetSourceLabel={demoDatasetMeta.sourceLabel}
    />
  );
}
