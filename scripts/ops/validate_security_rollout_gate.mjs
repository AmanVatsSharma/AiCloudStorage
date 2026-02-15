#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

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

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/ops/validate_security_rollout_gate.mjs \\',
      '    --staging-report supabase/evidence/security-baseline-validation-staging.json \\',
      '    --production-report supabase/evidence/security-baseline-validation-production.json \\',
      '    [--output supabase/evidence/security-rollout-gate-summary.json]',
    ].join('\n')
  );
}

async function readJsonFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(resolved, 'utf8');
  return JSON.parse(raw);
}

function validateReportShape(report, expectedEnvironment) {
  const missingKeys = ['generatedAt', 'environment', 'overallStatus', 'checks'].filter(
    (key) => !(key in report)
  );
  const failures = [];

  if (missingKeys.length > 0) {
    failures.push(`missing_keys:${missingKeys.join(',')}`);
  }
  if (report.environment !== expectedEnvironment) {
    failures.push(`environment_mismatch:expected_${expectedEnvironment}_got_${report.environment}`);
  }
  if (!['PASS', 'FAIL'].includes(report.overallStatus)) {
    failures.push(`invalid_overallStatus:${report.overallStatus}`);
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true' || args.h === 'true') {
    printUsage();
    return;
  }

  if (!args['staging-report'] || !args['production-report']) {
    throw new Error('Both --staging-report and --production-report are required.');
  }

  const stagingReport = await readJsonFile(args['staging-report']);
  const productionReport = await readJsonFile(args['production-report']);

  const stagingValidation = validateReportShape(stagingReport, 'staging');
  const productionValidation = validateReportShape(productionReport, 'production');

  const summary = {
    generatedAt: new Date().toISOString(),
    gateStatus:
      stagingValidation.valid &&
      productionValidation.valid &&
      stagingReport.overallStatus === 'PASS' &&
      productionReport.overallStatus === 'PASS'
        ? 'PASS'
        : 'FAIL',
    environments: {
      staging: {
        reportStatus: stagingReport.overallStatus,
        schemaValid: stagingValidation.valid,
        failures: stagingValidation.failures,
      },
      production: {
        reportStatus: productionReport.overallStatus,
        schemaValid: productionValidation.valid,
        failures: productionValidation.failures,
      },
    },
  };

  if (args.output) {
    const outputPath = path.resolve(process.cwd(), args.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`security-rollout-gate: wrote summary to ${outputPath}`);
  }

  console.log(JSON.stringify(summary, null, 2));

  if (summary.gateStatus !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`security-rollout-gate: ${error.message}`);
  process.exitCode = 1;
});
