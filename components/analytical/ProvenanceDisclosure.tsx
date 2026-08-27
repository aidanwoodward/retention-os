"use client";

import type { SignalProvenance } from "@/lib/provenance";

export function ProvenanceDisclosure({ provenance }: { provenance: SignalProvenance }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Source</p>
        <p className="mt-1 text-sm text-zinc-800">{provenance.source.sourceLabel}</p>
        <p className="mt-0.5 text-xs text-zinc-600">
          {provenance.source.isDemo ? "Demo dataset" : "Uploaded CSV"} · As of{" "}
          {new Date(provenance.reportingScope.asOfDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {provenance.metrics.map((metricProv) => (
        <div key={metricProv.metricId} className="rounded-md border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
          <p className="text-xs font-semibold text-zinc-900">{metricProv.methodology.meaning}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-700">{metricProv.methodology.retentionOsBasis}</p>
          {metricProv.caveats.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {metricProv.caveats.map((caveat) => (
                <li key={caveat} className="text-[11px] leading-snug text-zinc-600">
                  · {caveat}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
