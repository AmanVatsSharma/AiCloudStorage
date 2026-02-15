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

function assertRequired(options, key) {
  if (!options[key]) {
    throw new Error(`Missing required argument --${key}`);
  }
}

function formatTimestampSegment(date = new Date()) {
  return date.toISOString().replace(/[:]/g, '-').replace(/\..+/, 'Z');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    console.log(
      [
        'Usage:',
        '  node supabase/scripts/generate_security_validation_evidence.mjs \\',
        '    --environment staging \\',
        '    --validator engineer@company.com \\',
        '    --approver security@company.com \\',
        '    --ticket REL-1234 \\',
        '    [--output supabase/evidence/security-validation-staging.json]',
      ].join('\n')
    );
    return;
  }

  assertRequired(args, 'environment');
  assertRequired(args, 'validator');
  assertRequired(args, 'approver');
  assertRequired(args, 'ticket');

  const root = process.cwd();
  const templatePath = path.join(root, 'supabase', 'SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json');
  const templateRaw = await fs.readFile(templatePath, 'utf8');
  const template = JSON.parse(templateRaw);

  const nowIso = new Date().toISOString();
  template.metadata.environment = args.environment;
  template.metadata.dateTimeUtc = nowIso;
  template.metadata.validator = args.validator;
  template.metadata.approver = args.approver;
  template.metadata.changeTicket = args.ticket;

  const outputPath =
    args.output ||
    path.join(
      root,
      'supabase',
      'evidence',
      `security-validation-${args.environment}-${formatTimestampSegment()}.json`
    );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');

  console.log(`Generated security validation evidence skeleton: ${outputPath}`);
}

main().catch((error) => {
  console.error(`Failed to generate evidence skeleton: ${error.message}`);
  process.exitCode = 1;
});
