/**
 * Load / stress-lite — concurrent requests
 * Run: node scripts/qa-load.mjs
 */
const BASE = process.env.QA_BASE || 'http://localhost:3010';
const CONCURRENCY = parseInt(process.env.QA_LOAD_N || '25', 10);
const ROUNDS = parseInt(process.env.QA_LOAD_ROUNDS || '2', 10);

const results = [];

async function timedFetch(path) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  await res.text().catch(() => '');
  return { status: res.status, ms: Date.now() - t0, ok: res.status < 500 };
}

async function burst(name, path, n) {
  const all = [];
  for (let round = 0; round < ROUNDS; round++) {
    const batch = await Promise.all(Array.from({ length: n }, () => timedFetch(path)));
    all.push(...batch);
  }
  const ok = all.filter((r) => r.ok).length;
  const errors = all.filter((r) => r.status >= 500).length;
  const avg = Math.round(all.reduce((s, r) => s + r.ms, 0) / all.length);
  const max = Math.max(...all.map((r) => r.ms));
  const pass = errors === 0 && ok === all.length;
  results.push({ name, pass, detail: `n=${all.length} ok=${ok} err5xx=${errors} avg=${avg}ms max=${max}ms` });
}

async function main() {
  console.log(`Load test: ${CONCURRENCY} concurrent x ${ROUNDS} rounds against ${BASE}`);
  await burst('Homepage /', '/', CONCURRENCY);
  await burst('Health /api/health', '/api/health', CONCURRENCY);
  await burst('Login page', '/login', CONCURRENCY);
  await burst('Packages', '/packages', CONCURRENCY);

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount }, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
