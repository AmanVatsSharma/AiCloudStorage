import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SharedLinkPageProps {
  params: Promise<{
    shareId: string;
  }>;
}

/**
 * Public-facing shared link entry point.
 * Full access enforcement/preview pipeline is implemented in enterprise phase.
 */
export default async function SharedLinkPage({ params }: SharedLinkPageProps) {
  const { shareId } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-900 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Shared file link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Shared link ID: <span className="font-mono">{shareId}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            This public share endpoint is active. Access policy enforcement and
            rich preview are being finalized in the enterprise hardening stream.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
