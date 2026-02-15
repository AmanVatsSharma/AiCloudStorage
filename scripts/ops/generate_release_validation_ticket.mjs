#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    i += 1;
  }

  return options;
}

function requireArg(options, key) {
  if (!options[key]) {
    throw new Error(`Missing required argument --${key}`);
  }
}

function nowUtc() {
  return new Date().toISOString();
}

function fileSafeTimestamp(isoValue = nowUtc()) {
  return isoValue.replace(/:/g, '-');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    console.log(
      [
        'Usage:',
        '  node scripts/ops/generate_release_validation_ticket.mjs \\',
        '    --release-id release-2026-02-15-01 \\',
        '    --environment staging \\',
        '    --owner platform.engineer@company.com \\',
        '    --approver security.lead@company.com \\',
        '    [--output docs/operations/releases/release-2026-02-15-01.md]',
      ].join('\n')
    );
    return;
  }

  requireArg(args, 'release-id');
  requireArg(args, 'environment');
  requireArg(args, 'owner');
  requireArg(args, 'approver');

  const root = process.cwd();
  const templatePath = path.join(root, 'docs', 'operations', 'RELEASE_VALIDATION_TEMPLATE.md');
  const templateContent = await fs.readFile(templatePath, 'utf8');

  const timestamp = nowUtc();
  const outputPath =
    args.output ||
    path.join(
      root,
      'docs',
      'operations',
      'releases',
      `${args['release-id']}-${fileSafeTimestamp(timestamp)}.md`
    );

  const generatedContent = templateContent
    .replace('- Release ID:', `- Release ID: \`${args['release-id']}\``)
    .replace('- Environment: `staging | production`', `- Environment: \`${args.environment}\``)
    .replace('- Date/Time (UTC):', `- Date/Time (UTC): \`${timestamp}\``)
    .replace('- Change Owner:', `- Change Owner: ${args.owner}`)
    .replace('- Approver(s):', `- Approver(s): ${args.approver}`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, generatedContent, 'utf8');

  console.log(`Generated release validation ticket skeleton: ${outputPath}`);
}

main().catch((error) => {
  console.error(`Failed to generate release validation ticket: ${error.message}`);
  process.exitCode = 1;
});
