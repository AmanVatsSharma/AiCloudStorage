import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function TrashPage() {
  return (
    <FeaturePlaceholderPage
      title="Trash"
      summary="Recover recently deleted files before permanent retention windows expire."
      bullets={[
        "Soft-delete lifecycle with configurable retention window",
        "Bulk restore and permanent deletion controls",
        "Audit visibility for deleted and restored resources",
      ]}
    />
  );
}
