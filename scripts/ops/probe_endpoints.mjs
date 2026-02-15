#!/usr/bin/env node

/**
 * Operational endpoint probe utility.
 * Checks /api/health and /api/reliability/alerts and prints structured JSON output.
 */

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

async function fetchJson(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? 10_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers || {},
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildReliabilityUrl(baseUrl, args) {
  const url = new URL('/api/reliability/alerts', baseUrl);
  const scope = args.scope === 'global' ? 'global' : 'user';
  url.searchParams.set('scope', scope);

  if (scope === 'user' && args['actor-id']) {
    url.searchParams.set('actorId', args['actor-id']);
  }

  return url.toString();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    console.log(
      [
        'Usage:',
        '  npm run ops:probe -- --base-url https://<host> [options]',
        '',
        'Options:',
        '  --base-url <url>                    Base application URL (default: http://localhost:3000)',
        '  --timeout-ms <ms>                   Request timeout in milliseconds (default: 10000)',
        '  --reliability-token <token>         Bearer token for reliability integration mode',
        '  --scope <user|global>               Reliability report scope (default: user)',
        '  --actor-id <uuid>                   Required for reliability scope=user in integration mode',
        '  --session-cookie <cookie-header>    Optional cookie header value for session mode probes',
      ].join('\n')
    );
    return;
  }

  const baseUrl = args['base-url'] || 'http://localhost:3000';
  const timeoutMs = Number(args['timeout-ms'] || 10_000);

  const healthUrl = new URL('/api/health', baseUrl).toString();
  const reliabilityUrl = buildReliabilityUrl(baseUrl, args);

  const sharedHeaders = {};
  if (args['session-cookie']) {
    sharedHeaders.Cookie = args['session-cookie'];
  }

  const healthResult = await fetchJson(healthUrl, {
    timeoutMs,
    headers: sharedHeaders,
  });

  const reliabilityHeaders = { ...sharedHeaders };
  if (args['reliability-token']) {
    reliabilityHeaders.Authorization = `Bearer ${args['reliability-token']}`;
  }

  const reliabilityResult = await fetchJson(reliabilityUrl, {
    timeoutMs,
    headers: reliabilityHeaders,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    probes: {
      health: healthResult,
      reliability: reliabilityResult,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  const failed = !healthResult.ok || !reliabilityResult.ok;
  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
