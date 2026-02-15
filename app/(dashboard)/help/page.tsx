import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function HelpPage() {
  return (
    <FeaturePlaceholderPage
      title="Help Center"
      summary="Find guides, troubleshooting docs, and enterprise support channels."
      bullets={[
        "Role-specific onboarding and storage guides",
        "Operational runbooks for admins and developers",
        "Escalation paths for enterprise support",
      ]}
    />
  );
}
