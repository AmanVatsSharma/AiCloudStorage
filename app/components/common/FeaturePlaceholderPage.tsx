"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeaturePlaceholderPageProps {
  title: string;
  summary: string;
  bullets: string[];
  ctaHref?: string;
  ctaLabel?: string;
}

/**
 * Shared placeholder used for enterprise features that are queued for
 * implementation. This prevents broken navigation and gives users a clear
 * explanation of expected capabilities.
 */
export function FeaturePlaceholderPage({
  title,
  summary,
  bullets,
  ctaHref = "/dashboard",
  ctaLabel = "Back to Dashboard",
}: FeaturePlaceholderPageProps) {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{summary}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planned in enterprise hardening roadmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
