import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function RecentPage() {
  return (
    <FeaturePlaceholderPage
      title="Recent Activity"
      summary="Review recent file interactions and prioritize active workstreams."
      bullets={[
        "Unified timeline of uploads, edits, shares, and restores",
        "Team-aware recent activity feeds",
        "Filters by user, team, and resource type",
      ]}
    />
  );
}
