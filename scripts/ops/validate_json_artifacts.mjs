#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_KEYS_BY_FILE = {
  'docs/samples/reliability_alerts_response_sample.json': ['generatedAt', 'counters', 'alerts'],
  'docs/samples/health_response_sample.json': ['status', 'timestamp', 'checks'],
  'docs/samples/ops_probe_output_sample.json': ['generatedAt', 'baseUrl', 'probes'],
  'supabase/SECURITY_VALIDATION_EVIDENCE_TEMPLATE.json': ['metadata', 'sqlVerification', 'decision'],
  'supabase/SECURITY_VALIDATION_EVIDENCE_SAMPLE.json': ['metadata', 'sqlVerification', 'decision'],
};

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function validateKeys(filePath, data) {
  const requiredKeys = REQUIRED_KEYS_BY_FILE[filePath] || [];
  const missing = requiredKeys.filter((key) => !(key in data));
  return missing;
}

async function main() {
  const root = process.cwd();
  const relativePaths = Object.keys(REQUIRED_KEYS_BY_FILE);
  const failures = [];
  const results = [];

  for (const relativePath of relativePaths) {
    const absolutePath = path.join(root, relativePath);

    try {
      const json = await readJson(absolutePath);
      const missingKeys = validateKeys(relativePath, json);
      if (missingKeys.length > 0) {
        failures.push({
          file: relativePath,
          reason: `Missing required keys: ${missingKeys.join(', ')}`,
        });
      } else {
        results.push({
          file: relativePath,
          status: 'ok',
        });
      }
    } catch (error) {
      failures.push({
        file: relativePath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    checkedFiles: relativePaths.length,
    passedFiles: results.length,
    failures,
  };

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
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
