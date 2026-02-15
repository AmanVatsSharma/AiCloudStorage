import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { summarizeTextHeuristic, truncateForModel } from '@/lib/ai/summarizer';

type SummarizeRequest = {
  text?: string;
  maxSentences?: number;
};

async function summarizeWithOpenAI(text: string, maxSentences: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You summarize enterprise documents in ${maxSentences} concise sentence(s).`,
        },
        {
          role: 'user',
          content: truncateForModel(text),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI response did not include summary text.');
  }

  return content.trim();
}

export async function POST(request: NextRequest) {
  const traceId = `ai-summarize_${Date.now()}`;

  try {
    const body = (await request.json()) as SummarizeRequest;
    const text = body?.text?.trim() ?? '';
    const maxSentences = Math.max(1, Math.min(body?.maxSentences ?? 2, 5));

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    let summary = '';
    let provider: 'openai' | 'heuristic' = 'heuristic';

    if (process.env.OPENAI_API_KEY) {
      try {
        summary = await summarizeWithOpenAI(text, maxSentences);
        provider = 'openai';
      } catch (error: unknown) {
        logger.warn({
          traceId,
          scope: "ai-summarize-route",
          message: "OpenAI summarization failed, falling back to heuristic summarizer.",
          data: {
            reason: error instanceof Error ? error.message : error,
          },
        });
        summary = summarizeTextHeuristic(text, maxSentences);
      }
    } else {
      summary = summarizeTextHeuristic(text, maxSentences);
    }

    logger.info({
      traceId,
      scope: "ai-summarize-route",
      message: "Summary generated successfully.",
      data: {
        provider,
        maxSentences,
        inputLength: text.length,
        outputLength: summary.length,
      },
    });

    return NextResponse.json({
      summary,
      provider,
      maxSentences,
    });
  } catch (error: unknown) {
    logger.error({
      traceId,
      scope: "ai-summarize-route",
      message: "Failed to generate summary.",
      data: {
        error: error instanceof Error ? error.message : error,
      },
    });

    return NextResponse.json(
      { error: 'Unable to generate summary' },
      { status: 500 }
    );
  }
}
