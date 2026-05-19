"use client";

import type { ReactNode } from "react";
import type { RetentionOSDatasetSummary } from "@/lib/data-source";

export function formatIsoDateUtcMedium(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function UploadedSessionDatasetDl({
  summary,
  footer,
  className,
}: {
  summary: RetentionOSDatasetSummary;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className ?? "mt-4"}`}>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kv label="Source label" value={summary.sourceLabel} monospace={false} />
        <Kv label="Customers" value={summary.customerCount.toLocaleString()} />
        <Kv label="Orders" value={summary.orderCount.toLocaleString()} />
        <Kv label="Products" value={summary.productCount.toLocaleString()} />
        <Kv label="Line items" value={summary.lineItemCount.toLocaleString()} />
        <Kv label="Warnings (import)" value={String(summary.warningCount ?? 0)} />
        <Kv label="First order (UTC)" value={formatIsoDateUtcMedium(summary.firstOrderAt)} />
        <Kv label="Last order (UTC)" value={formatIsoDateUtcMedium(summary.lastOrderAt)} />
        <Kv label="Saved at (UTC)" value={formatIsoDateUtcMedium(summary.importedAt)} />
      </dl>
      {footer}
    </div>
  );
}

function Kv({ label, value, monospace = true }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white/80 p-3.5 shadow-sm ring-1 ring-black/[0.02]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className={`mt-1.5 ${monospace ? "font-mono text-sm tabular-nums" : "text-sm font-medium"} leading-snug text-zinc-900`}>
        {value}
      </dd>
    </div>
  );
}
