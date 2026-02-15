import { Metadata } from 'next';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Help - AI Cloud Storage',
  description: 'Operational guides, API references, and support pathways.',
};

const docsLinks = [
  { label: 'Architecture', path: 'docs/ARCHITECTURE.md', tag: 'Platform' },
  { label: 'Reliability Alerts API', path: 'docs/API_RELIABILITY_ALERTS.md', tag: 'API' },
  { label: 'Health API', path: 'docs/API_HEALTH.md', tag: 'API' },
  { label: 'Operations Runbooks', path: 'docs/operations/README.md', tag: 'Ops' },
  { label: 'Security Validation Runbook', path: 'supabase/SECURITY_VALIDATION_RUNBOOK.md', tag: 'Security' },
];

const commandPresets = [
  'npm run ops:probe -- --base-url "https://staging.example.com" --scope global --reliability-token "${STAGING_RELIABILITY_ALERTS_API_TOKEN}"',
  'npm run ops:validate-json',
  'npm run security:evidence -- --environment staging --validator platform.engineer@company.com --approver security.lead@company.com --ticket REL-1234',
  'npm run ops:release-ticket -- --release-id release-2026-02-15-01 --environment staging --owner platform.engineer@company.com --approver security.lead@company.com',
];

export default function HelpPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="text-muted-foreground mt-2">
            Quick access to enterprise runbooks, API references, and operational automation commands.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Documentation Shortcuts</CardTitle>
              <CardDescription>Most-used architecture, API, and operations references.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {docsLinks.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded border p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant="outline">{item.tag}</Badge>
                  </div>
                  <code className="text-xs text-muted-foreground">{item.path}</code>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Command Presets</CardTitle>
              <CardDescription>Copy/paste friendly commands for staging and production readiness workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {commandPresets.map((command) => (
                <pre key={command} className="rounded bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                  {command}
                </pre>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
