#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

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

function usageText() {
  return [
    'Usage:',
    '  node supabase/scripts/validate_security_baseline.mjs \\',
    '    --environment staging \\',
    '    --connection-string "postgres://..." \\',
    '    [--output supabase/evidence/security-baseline-validation-staging.json]',
    '',
    'You can omit --connection-string when SUPABASE_DB_URL is set.',
  ].join('\n');
}

async function runQueries(client) {
  const requiredStoragePolicies = [
    'storage_objects_select_own_prefix',
    'storage_objects_insert_own_prefix',
    'storage_objects_update_own_prefix',
    'storage_objects_delete_own_prefix',
  ];

  const requiredFunctionRows = await client.query(`
    SELECT
      expected.expected_function AS function_name,
      CASE WHEN p.proname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
    FROM (
      SELECT unnest(ARRAY[
        'is_team_owner',
        'is_team_member',
        'is_org_owner',
        'is_org_member',
        'is_org_admin',
        'log_audit_event'
      ]) AS expected_function
    ) expected
    LEFT JOIN pg_proc p
      ON p.proname = expected.expected_function
    LEFT JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' OR n.nspname IS NULL
    ORDER BY expected.expected_function;
  `);

  const rlsRows = await client.query(`
    WITH required_tables AS (
      SELECT unnest(ARRAY[
        'profiles',
        'files',
        'file_versions',
        'shared_files',
        'tags',
        'file_tags',
        'teams',
        'team_members',
        'organizations',
        'organization_members',
        'organization_invitations'
      ]) AS table_name
    ),
    rls_state AS (
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n
        ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (SELECT table_name FROM required_tables)
    )
    SELECT
      rt.table_name,
      COALESCE(rs.rls_enabled, false) AS rls_enabled,
      CASE WHEN COALESCE(rs.rls_enabled, false) THEN 'PASS' ELSE 'FAIL' END AS result
    FROM required_tables rt
    LEFT JOIN rls_state rs
      ON rs.table_name = rt.table_name
    ORDER BY rt.table_name;
  `);

  const forbiddenPolicyRows = await client.query(`
    WITH forbidden_policies AS (
      SELECT unnest(ARRAY[
        'Temporary full access to profiles for authenticated users',
        'Temporary full access to files for authenticated users',
        'Temporary full access to file_versions for authenticated users',
        'Temporary full access to shared_files for authenticated users',
        'Temporary full access to tags for authenticated users',
        'Temporary full access to file_tags for authenticated users',
        'Temporary full access to teams for authenticated users',
        'Temporary full access to team_members for authenticated users',
        'Temporary full access to files bucket for authenticated users'
      ]) AS policy_name
    )
    SELECT
      fp.policy_name,
      CASE WHEN pol.policyname IS NULL THEN 'PASS' ELSE 'FAIL' END AS result
    FROM forbidden_policies fp
    LEFT JOIN pg_policies pol
      ON pol.policyname = fp.policy_name
    ORDER BY fp.policy_name;
  `);

  const storagePolicyRows = await client.query(`
    SELECT
      policyname,
      tablename,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'storage_objects_select_own_prefix',
        'storage_objects_insert_own_prefix',
        'storage_objects_update_own_prefix',
        'storage_objects_delete_own_prefix'
      )
    ORDER BY policyname;
  `);

  const storagePolicyCoverage = requiredStoragePolicies.map((name) => ({
    policyname: name,
    result: storagePolicyRows.rows.some((row) => row.policyname === name) ? 'PASS' : 'FAIL',
  }));

  const checks = {
    rlsState: {
      rows: rlsRows.rows,
      pass: rlsRows.rows.every((row) => row.result === 'PASS'),
    },
    helperFunctions: {
      rows: requiredFunctionRows.rows,
      pass: requiredFunctionRows.rows.every((row) => row.result === 'PASS'),
    },
    forbiddenPolicies: {
      rows: forbiddenPolicyRows.rows,
      pass: forbiddenPolicyRows.rows.every((row) => row.result === 'PASS'),
    },
    storagePrefixPolicies: {
      rows: storagePolicyCoverage,
      pass: storagePolicyCoverage.every((row) => row.result === 'PASS'),
      details: storagePolicyRows.rows,
    },
  };

  return checks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true' || args.h === 'true') {
    console.log(usageText());
    return;
  }

  if (!args.environment) {
    throw new Error('Missing required --environment argument');
  }

  const connectionString = args['connection-string'] || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      'Missing database connection string. Provide --connection-string or SUPABASE_DB_URL.'
    );
  }

  const client = new Client({
    connectionString,
    statement_timeout: 60_000,
  });

  console.info(`security-baseline-validation: connecting to ${args.environment}`);
  await client.connect();

  try {
    const checks = await runQueries(client);
    const report = {
      generatedAt: new Date().toISOString(),
      environment: args.environment,
      overallStatus: Object.values(checks).every((check) => check.pass) ? 'PASS' : 'FAIL',
      checks,
    };

    if (args.output) {
      const outputPath = path.resolve(process.cwd(), args.output);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.info(`security-baseline-validation: wrote report to ${outputPath}`);
    }

    console.log(JSON.stringify(report, null, 2));

    if (report.overallStatus !== 'PASS') {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`security-baseline-validation: ${error.message}`);
  process.exitCode = 1;
});
