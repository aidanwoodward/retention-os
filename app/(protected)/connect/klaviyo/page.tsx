import { ComingSoon } from "@/components/ui/coming-soon";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConnectKlaviyoPage() {
  return (
    <ComingSoon
      title="Klaviyo Integration"
      description="Connect your Klaviyo account to sync customer data and email campaign metrics."
      bullets={[
        "Sync customer lists and profiles from Klaviyo",
        "Track email campaign performance and engagement",
        "Integrate email metrics with retention analytics"
      ]}
      area="klaviyo"
    />
  );
}
