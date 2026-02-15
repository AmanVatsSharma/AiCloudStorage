'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { getUserErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { trackAuditEvent } from '@/lib/audit';
import { Badge } from '@/components/ui/badge';

interface SummaryWorkbenchProps {
  userId: string;
}

/**
 * Interactive AI summarization workbench (synchronous API mode).
 */
export function SummaryWorkbench({ userId }: SummaryWorkbenchProps) {
  const { toast } = useToast();
  const [traceId] = useState(() => `summary-workbench_${Date.now()}`);
  const [input, setInput] = useState('');
  const [maxSentences, setMaxSentences] = useState(2);
  const [summary, setSummary] = useState('');
  const [provider, setProvider] = useState<'openai' | 'heuristic' | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const normalizedText = input.trim();
    setLoading(true);
    setSummary('');
    setProvider(null);

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: normalizedText,
          maxSentences: Math.max(1, Math.min(maxSentences, 5)),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Summarization failed (${response.status})`);
      }

      const payload = await response.json();
      setSummary(payload.summary || '');
      setProvider(payload.provider || 'heuristic');

      await trackAuditEvent({
        action: 'ai.summary.generate',
        resourceType: 'ai_summary',
        resourceId: userId,
        details: {
          provider: payload.provider,
          inputLength: normalizedText.length,
          outputLength: payload.summary?.length ?? 0,
          maxSentences,
        },
      });

      toast({
        title: 'Summary generated',
        description: `Provider: ${payload.provider || 'heuristic'}`,
      });
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: 'summary-workbench',
        message: 'Summary generation failed.',
        data: {
          userId,
          inputLength: normalizedText.length,
          maxSentences,
          error: error instanceof Error ? error.message : error,
        },
      });

      toast({
        title: 'Unable to generate summary',
        description: getUserErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });

      await trackAuditEvent({
        action: 'ai.summary.generate',
        resourceType: 'ai_summary',
        resourceId: userId,
        status: 'failure',
        details: {
          inputLength: normalizedText.length,
          maxSentences,
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Summary Workbench</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-summary-input">Content</Label>
            <Textarea
              id="ai-summary-input"
              placeholder="Paste document text or notes to summarize..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[180px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-summary-max-sentences">Max sentences (1-5)</Label>
            <Input
              id="ai-summary-max-sentences"
              type="number"
              min={1}
              max={5}
              value={maxSentences}
              onChange={(event) => setMaxSentences(Number(event.target.value))}
            />
          </div>

          <Button type="submit" disabled={!canSubmit}>
            {loading ? 'Generating...' : 'Generate Summary'}
          </Button>
        </form>

        {summary && (
          <div className="mt-6 border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold">Summary Output</h3>
              {provider && <Badge variant="secondary">{provider}</Badge>}
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
