import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function SegmentsPage() {
  return (
    <ComingSoon
      title="Segments"
      description="Build, monitor, and activate lifecycle segments across retention plays."
      bullets={[
        "Define lifecycle segments (e.g. VIPs, churn risk, cross-sell ready)",
        "Track segment retention + revenue contribution over time",
        "Push segments into activation tools (e.g. Klaviyo)"
      ]}
      area="segments"
    />
  );
}
