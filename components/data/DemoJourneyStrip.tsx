"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DEMO_BRAND_NAME } from "@/lib/demo";

type Step = Readonly<{
  label: string;
  done: boolean;
  optional?: boolean;
  href?: `/${string}`;
  detail?: string;
}>;

function stepCircle(done: boolean, isCurrent: boolean): string {
  if (done) {
    return "border-emerald-600 bg-emerald-600 text-white";
  }
  if (isCurrent) {
    return "border-emerald-600 bg-emerald-50 text-emerald-900";
  }
  return "border-zinc-300 bg-white text-zinc-500";
}

function JourneySteps({ steps, footer }: { steps: readonly Step[]; footer?: ReactNode }) {
  const firstIncomplete = steps.findIndex((s) => !s.done);

  return (
    <>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = firstIncomplete === index;
          const stepNum = index + 1;
          const content = (
            <>
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${stepCircle(step.done, isCurrent)}`}
              >
                {step.done ? "✓" : stepNum}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900">
                  {step.label}
                  {step.optional ? <span className="ml-1 font-normal text-zinc-500">(optional)</span> : null}
                </span>
                {step.detail ?
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-600">{step.detail}</span>
                : null}
                {isCurrent && !step.done ?
                  <span className="mt-0.5 block text-xs text-emerald-800">Suggested next</span>
                : step.done ?
                  <span className="mt-0.5 block text-xs text-emerald-700">Ready</span>
                : null}
              </span>
            </>
          );

          return (
            <li
              key={step.label}
              className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 ${
                isCurrent ? "border-emerald-300/90 bg-white/90 ring-1 ring-emerald-900/[0.06]" : "border-zinc-200/80 bg-white/70"
              }`}
            >
              {step.href ?
                <Link href={step.href} className="flex items-start gap-3 hover:opacity-90">
                  {content}
                </Link>
              : (
                content
              )}
            </li>
          );
        })}
      </ol>
      {footer}
    </>
  );
}

function DemoExploreJourney() {
  const steps: readonly Step[] = [
    {
      label: `Explore ${DEMO_BRAND_NAME} demo`,
      done: true,
      detail: "Fixture marketing spend and margin assumptions are included — CAC, payback, and contribution LTV are unlocked on KPI routes.",
    },
    {
      label: "Review Dashboard & Insights",
      done: false,
      href: "/dashboard",
      detail: "Posture, spine panels, and diagnostic cards from the same demo source.",
    },
    {
      label: "Investigate Acquisition & Products",
      done: false,
      href: "/acquisition",
      detail: "Partial payback and entry-product quality — then compare Products for strongest vs weakest SKUs.",
    },
  ];

  return (
    <JourneySteps
      steps={steps}
      footer={
        <p className="mt-4 text-sm text-zinc-700">
          Upload your own Shopify Orders CSV below when you are ready to analyse your shop in this tab.
        </p>
      }
    />
  );
}

function UploadJourney({
  hasUpload,
  hasSpend,
  hasMargin,
}: {
  readonly hasUpload: boolean;
  readonly hasSpend: boolean;
  readonly hasMargin: boolean;
}) {
  const steps: readonly Step[] = [
    { label: "Upload and save orders", done: hasUpload },
    { label: "Add marketing spend %", done: hasSpend },
    { label: "Optional margin assumption", done: hasMargin, optional: true },
    { label: "Open Dashboard", done: hasUpload && hasSpend, href: "/dashboard" },
  ];

  return (
    <JourneySteps
      steps={steps}
      footer={
        hasUpload && hasSpend ?
          <p className="mt-4 text-sm text-zinc-700">
            Ready to diagnose?{" "}
            <Link href="/dashboard" className="font-semibold text-emerald-900 underline decoration-emerald-400 underline-offset-2 hover:decoration-emerald-700">
              Open Dashboard
            </Link>{" "}
            — then drill into Insights, Acquisition, Retention, LTV, and Products.
          </p>
        : null
      }
    />
  );
}

export function DemoJourneyStrip({
  hasUpload,
  hasSpend,
  hasMargin,
}: {
  readonly hasUpload: boolean;
  readonly hasSpend: boolean;
  readonly hasMargin: boolean;
}) {
  return (
    <section className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm ring-1 ring-emerald-900/[0.04] sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
        {hasUpload ? "Founder demo journey" : "Explore the demo"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        {hasUpload ?
          "Follow these steps to move from upload to customer economics diagnosis on your shop."
        : "The canonical demo is ready to explore — no upload required for CAC, payback, or product quality on KPI routes."
        }
      </p>
      {hasUpload ?
        <UploadJourney hasUpload={hasUpload} hasSpend={hasSpend} hasMargin={hasMargin} />
      : <DemoExploreJourney />}
    </section>
  );
}
