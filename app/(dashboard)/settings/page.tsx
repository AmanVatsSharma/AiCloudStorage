import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function SettingsPage() {
  return (
    <FeaturePlaceholderPage
      title="Settings"
      summary="Configure tenant-level security, storage defaults, and integrations."
      bullets={[
        "Organization and workspace security policies",
        "Default retention and sharing controls",
        "Identity provider and webhook integration settings",
      ]}
    />
  );
}
