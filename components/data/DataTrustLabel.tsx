import type { DataReadinessPresentationLabel } from "@/lib/mvp/data-readiness-presentation";

const LABEL_CLASS: Record<DataReadinessPresentationLabel, string> = {
  Available: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  Observed: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  Partial: "bg-amber-100 text-amber-950 ring-amber-200",
  Estimated: "bg-amber-100 text-amber-950 ring-amber-200",
  Missing: "bg-zinc-200/90 text-zinc-800 ring-zinc-300",
  Locked: "bg-zinc-200/90 text-zinc-800 ring-zinc-300",
};

export function DataTrustLabel({
  label,
  className = "",
}: {
  readonly label: DataReadinessPresentationLabel;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${LABEL_CLASS[label]} ${className}`}
    >
      {label}
    </span>
  );
}
