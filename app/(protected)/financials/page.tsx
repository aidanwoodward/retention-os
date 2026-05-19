import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function FinancialsPage() {
  return (
    <ComingSoon
      title="Financial Intelligence"
      description="Revenue intelligence, LTV summaries, and financial forecasting tools coming soon."
      bullets={[
        "Revenue breakdown and trend analysis",
        "Customer lifetime value (LTV) summaries and projections",
        "Financial forecasting and scenario modeling"
      ]}
      area="financials"
    />
  );
}
