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
import { formatUsd } from '@/lib/ai/cost-estimator';

interface SummaryWorkbenchProps {
  userId: string;
}

type SummaryUsage = {
  provider: 'openai' | 'heuristic';
  inputChars: number;
  outputChars: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

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
  const [usage, setUsage] = useState<SummaryUsage | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const normalizedText = input.trim();
    setLoading(true);
    setSummary('');
    setProvider(null);
    setUsage(null);

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
        if (response.status === 429) {
          const retryAfter = Number(body?.retryAfterSeconds || 0);
          const retryMessage =
            retryAfter > 0
              ? `Rate limited. Retry in about ${retryAfter} seconds.`
              : 'Rate limited. Please retry shortly.';
          throw new Error(retryMessage);
        }

        throw new Error(body?.error || `Summarization failed (${response.status})`);
      }

      const payload = await response.json();
      const summaryText = payload.summary || '';
      const providerName: 'openai' | 'heuristic' = payload.provider === 'openai' ? 'openai' : 'heuristic';
      const usagePayload = payload.usage as SummaryUsage | undefined;

      setSummary(summaryText);
      setProvider(providerName);
      if (usagePayload) {
        setUsage(usagePayload);
      }

      await trackAuditEvent({
        action: 'ai.summary.generate',
        resourceType: 'ai_summary',
        resourceId: userId,
        details: {
          provider: providerName,
          inputLength: normalizedText.length,
          outputLength: summaryText.length,
          inputTokens: usagePayload?.inputTokens,
          outputTokens: usagePayload?.outputTokens,
          estimatedCostUsd: usagePayload?.estimatedCostUsd,
          maxSentences,
        },
      });

      toast({
        title: 'Summary generated',
        description: `Provider: ${providerName}`,
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
            {usage && (
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <p>Input: {usage.inputChars} chars / ~{usage.inputTokens} tokens</p>
                <p>Output: {usage.outputChars} chars / ~{usage.outputTokens} tokens</p>
                <p>Estimated cost: {formatUsd(usage.estimatedCostUsd)}</p>
                <p>Provider metering: {usage.provider}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
