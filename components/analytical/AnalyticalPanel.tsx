import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface AnalyticalPanelProps {
  readonly title: string;
  readonly description?: string;
  readonly headerAction?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
}

/**
 * Neutral analytical surface for tables or charts. Presentation only — callers
 * supply all titles, copy, and body content.
 */
export function AnalyticalPanel({
  title,
  description,
  headerAction,
  children,
  footer,
  className,
}: AnalyticalPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.02]",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-zinc-500">{title}</h2>
          {description ?
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-700">{description}</p>
          : null}
        </div>
        {headerAction ?
          <div className="flex flex-wrap items-center gap-2">{headerAction}</div>
        : null}
      </header>

      <div className="min-w-0 overflow-x-auto">{children}</div>

      {footer ?
        <footer className="border-t border-zinc-100 px-5 py-3 text-sm leading-relaxed text-zinc-700">{footer}</footer>
      : null}
    </section>
  );
}
