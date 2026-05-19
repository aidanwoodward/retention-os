import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RevenueIntelligencePage() {
  return (
    <ComingSoon
      title="Revenue Intelligence"
      description="Detailed revenue analysis, refund tracking, and discount impact insights coming soon."
      bullets={[
        "Gross and net revenue breakdowns",
        "Refund and discount rate tracking",
        "Revenue trend analysis and forecasting"
      ]}
      area="financials-revenue"
    />
  );
}
