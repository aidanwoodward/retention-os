import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function LTVSummaryPage() {
  return (
    <ComingSoon
      title="LTV Summary"
      description="Customer lifetime value summaries and cohort-based LTV analysis coming soon."
      bullets={[
        "Cohort-based LTV calculations (12mo, 24mo, 36mo)",
        "LTV trend analysis and comparisons",
        "LTV forecasting and projections"
      ]}
      area="financials-ltv"
    />
  );
}
