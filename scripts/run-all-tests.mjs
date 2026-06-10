/**
 * Master test runner — all QA suites
 * Run: node scripts/run-all-tests.mjs
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const suites = [
  { name: 'QA Forms integrity', cmd: 'node', args: ['scripts/qa-forms.mjs'], cwd: root },
  { name: 'QA Security', cmd: 'node', args: ['scripts/qa-security.mjs'], cwd: root },
  { name: 'QA Audit (smoke/auth/admin)', cmd: 'node', args: ['scripts/qa-audit.mjs'], cwd: root },
  { name: 'QA Functional flows', cmd: 'node', args: ['scripts/qa-functional.mjs'], cwd: root },
  { name: 'E2E Extended', cmd: 'node', args: ['scripts/e2e-extended.mjs'], cwd: root },
  { name: 'Jest (backend)', cmd: 'npm', args: ['test'], shell: true, cwd: path.join(root, 'backend'), env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://limootrade:limootrade_secret@127.0.0.1:5432/limootrade',
      SESSION_SECRET: process.env.SESSION_SECRET || 'lemontrade-dev-secret-min-32-characters-long',
    } },
  ...(process.env.SKIP_PLAYWRIGHT === '1'
    ? []
    : [{ name: 'Playwright E2E', cmd: 'npm', args: ['run', 'test:e2e'], shell: true, cwd: root }]),
  { name: 'QA Load (stress — run last)', cmd: 'node', args: ['scripts/qa-load.mjs'], cwd: root },
];

const summary = [];

// Wait for app health before running HTTP suites
async function waitHealthy() {
  const base = process.env.QA_BASE || 'http://localhost:3010';
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn('Warning: app health check timed out');
}
await waitHealthy();

for (const suite of suites) {
  process.stdout.write(`\n▶ ${suite.name}...\n`);
  const result = spawnSync(suite.cmd, suite.args, {
    cwd: suite.cwd,
    env: suite.env || process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: suite.shell || false,
  });
  const out = (result.stdout || '') + (result.stderr || '');
  const tail = out.trim().split('\n').slice(-15).join('\n');
  const pass = result.status === 0;
  summary.push({ suite: suite.name, pass, exitCode: result.status ?? 1, tail });
  console.log(pass ? '  ✓ PASS' : '  ✗ FAIL');
  if (!pass && tail) console.log(tail);
}

const passed = summary.filter((s) => s.pass).length;
const failed = summary.filter((s) => !s.pass).length;
console.log('\n' + '='.repeat(50));
console.log(`TOTAL: ${passed}/${summary.length} suites passed`);
if (failed) {
  console.log('Failed:', summary.filter((s) => !s.pass).map((s) => s.suite).join(', '));
}
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
