import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForecastsScenariosPage() {
  return (
    <ComingSoon
      title="Forecasts & Scenarios"
      description="Financial forecasting and scenario modeling tools coming soon."
      bullets={[
        "LTV +10% YoY projections",
        "Scenario modeling and what-if analysis",
        "Probability-weighted forecasts"
      ]}
      area="financials-forecasts"
    />
  );
}
