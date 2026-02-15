import { FeaturePlaceholderPage } from "@/app/components/common/FeaturePlaceholderPage";

export default function FavoritesPage() {
  return (
    <FeaturePlaceholderPage
      title="Favorites"
      summary="Quickly access the files and folders your team uses most often."
      bullets={[
        "Pin important files and folders per user/team",
        "Track favorite trends for teams",
        "Sync favorites across devices and sessions",
      ]}
    />
  );
}
