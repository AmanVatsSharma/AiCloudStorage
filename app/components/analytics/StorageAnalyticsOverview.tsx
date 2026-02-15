import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileTypeMetric,
  formatBytesCompact,
  StorageAnalyticsReport,
  UploadDayMetric,
} from '@/lib/analytics/storage-metrics';

interface StorageAnalyticsOverviewProps {
  report: StorageAnalyticsReport;
  generatedAt: string;
}

function toTitleLabel(value: string): string {
  if (!value) return 'Unknown';
  return value
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function normalizeUploadSeries(series: UploadDayMetric[]): UploadDayMetric[] {
  return [...series].slice(-10);
}

function getMaxUploads(series: UploadDayMetric[]): number {
  return series.reduce((max, item) => Math.max(max, item.uploads), 1);
}

function TypeTable({ rows }: { rows: FileTypeMetric[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No active files available for type analysis.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Files</TableHead>
          <TableHead className="text-right">Storage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell>
              <Badge variant="outline">{toTitleLabel(row.label)}</Badge>
            </TableCell>
            <TableCell className="text-right">{row.count}</TableCell>
            <TableCell className="text-right">{formatBytesCompact(row.bytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UploadTrend({ series }: { series: UploadDayMetric[] }) {
  if (series.length === 0) {
    return <p className="text-sm text-muted-foreground">No uploads in the last 30 days.</p>;
  }

  const normalizedSeries = normalizeUploadSeries(series);
  const maxUploads = getMaxUploads(normalizedSeries);

  return (
    <div className="space-y-2">
      {normalizedSeries.map((entry) => {
        const width = Math.max(8, Math.round((entry.uploads / maxUploads) * 100));
        return (
          <div key={entry.day} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{entry.day}</span>
              <span>
                {entry.uploads} upload{entry.uploads === 1 ? '' : 's'} • {formatBytesCompact(entry.bytes)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Storage analytics rendering component for enterprise dashboards.
 */
export function StorageAnalyticsOverview({ report, generatedAt }: StorageAnalyticsOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Storage</CardTitle>
            <CardDescription>Non-trashed file footprint</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBytesCompact(report.activeStorageBytes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.totalFiles} active files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trashed Storage</CardTitle>
            <CardDescription>Recoverable item footprint</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBytesCompact(report.trashedStorageBytes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.trashedItems} trashed items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shares</CardTitle>
            <CardDescription>Share link exposure summary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{report.totalShares}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.publicShares} public links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory</CardTitle>
            <CardDescription>Files, folders, and trash</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{report.totalItems}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {report.totalFolders} folders • {report.totalFiles} files
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top File Types</CardTitle>
            <CardDescription>Most common active file categories</CardDescription>
          </CardHeader>
          <CardContent>
            <TypeTable rows={report.topFileTypes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Trend (Last 30 Days)</CardTitle>
            <CardDescription>Recent upload volume by day</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadTrend series={report.uploadsLast30Days} />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Analytics generated at {new Date(generatedAt).toLocaleString()}.
      </p>
    </div>
  );
}
