import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function AnalyticsPage() {
  return (
    <FeaturePlaceholderPage
      title="Storage Analytics"
      summary="Track storage growth, usage patterns, and policy compliance metrics."
      bullets={[
        "Usage dashboards by team and user",
        "Share and retention policy insights",
        "Cost and growth forecasting for enterprise planning",
      ]}
    />
  );
}
