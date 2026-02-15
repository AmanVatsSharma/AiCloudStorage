import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function SharedPage() {
  return (
    <FeaturePlaceholderPage
      title="Shared Files"
      summary="Manage external sharing links and internal collaboration access in one place."
      bullets={[
        "Centralized visibility into active share links",
        "Domain-restricted sharing and approval workflows",
        "Revocation, expiration, and download controls",
      ]}
    />
  );
}
