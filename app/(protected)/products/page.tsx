import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProductsPage() {
  return (
    <ComingSoon
      title="Product Analytics"
      description="Comprehensive product performance insights, cross-sell analysis, and replenishment metrics coming soon."
      bullets={[
        "Product performance dashboards with revenue and margin analysis",
        "Cross-sell and upsell opportunity identification",
        "Replenishment frequency and timing optimization"
      ]}
      area="products"
    />
  );
}
