/**
 * lemontrade full QA audit — run: node scripts/qa-audit.mjs
 */
const BASE = process.env.QA_BASE || 'http://localhost:3010';

const publicPages = [
  '/', '/about', '/contact', '/terms', '/faq', '/blog', '/blog/start-trading',
  '/packages', '/packages/forex-starter', '/sessions',
  '/learn/zero-to-hundred', '/learn/metatrader', '/login', '/signup',
  '/forgot-password', '/api/health', '/api/menu/header', '/api/captcha',
];

const authPages = [
  '/dashboard', '/signals/live', '/signals/past', '/cart', '/wallet',
  '/profile', '/support', '/referrals', '/investment', '/my-packages', '/teacher', '/admin',
];

const adminPages = [
  '/admin', '/admin/settings', '/admin/content', '/admin/users', '/admin/teachers',
  '/admin/signals', '/admin/pairs', '/admin/subscriptions', '/admin/packages',
  '/admin/blog', '/admin/sessions', '/admin/tickets', '/admin/investments',
];

const userPages = ['/dashboard', '/signals/live', '/signals/past', '/cart', '/wallet', '/profile', '/support', '/referrals'];

async function fetchStatus(url, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual', ...opts });
    const ms = Date.now() - t0;
    let body = '';
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json') || res.status < 400) {
      try {
        body = await res.text();
      } catch {}
    }
    return { status: res.status, ms, body, ok: res.ok || res.status < 400 };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, error: e.message, ok: false };
  }
}

function parseCsrf(html) {
  const m = html.match(/name="csrf-token"\s+content="([^"]+)"/) || html.match(/name="_csrf"\s+value="([^"]+)"/);
  return m ? m[1] : '';
}

function mergeCookies(...parts) {
  const map = new Map();
  for (const part of parts.filter(Boolean)) {
    for (const chunk of part.split(',')) {
      const c = chunk.trim().split(';')[0];
      if (c.includes('=')) {
        const [k] = c.split('=');
        map.set(k.trim(), c);
      }
    }
  }
  return [...map.values()].join('; ');
}

async function login(email, password) {
  const page = await fetch(`${BASE}/login`, { redirect: 'manual' });
  const html = await page.text();
  const csrf = parseCsrf(html);
  const cookies = page.headers.get('set-cookie') || '';
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({ identifier: email, password, next: '/dashboard', _csrf: csrf }),
  });
  const jar = mergeCookies(cookies, res.headers.get('set-cookie'));
  return { status: res.status, location: res.headers.get('location'), jar };
}

async function getWithCookie(path, jar) {
  return fetchStatus(`${BASE}${path}`, { headers: jar ? { Cookie: jar } : {} });
}

const results = [];
function record(cat, name, pass, detail = '') {
  results.push({ cat, name, pass, detail });
}

async function main() {
  console.log('QA audit against', BASE);

  for (const p of publicPages) {
    const r = await fetchStatus(`${BASE}${p}`);
    record('Smoke', `GET ${p}`, r.status === 200, `status=${r.status} ${r.ms}ms`);
    await new Promise((r) => setTimeout(r, 50));
  }

  for (const p of authPages) {
    const r = await fetchStatus(`${BASE}${p}`);
    record('AuthZ', `${p} unauth redirect`, [302, 303].includes(r.status), `status=${r.status}`);
  }

  const user = await login('user@lemontrade.com', 'User@12345');
  record('Auth', 'User login', user.status === 302, `loc=${user.location}`);

  for (const p of userPages) {
    const r = await getWithCookie(p, user.jar);
    record('User', `GET ${p}`, r.status === 200, `status=${r.status}`);
  }

  record('Security', 'User → /admin', (await getWithCookie('/admin', user.jar)).status === 403);
  record('Security', 'User → /teacher', (await getWithCookie('/teacher', user.jar)).status === 403);

  const teacher = await login('teacher@lemontrade.com', 'Teacher@12345');
  record('Auth', 'Teacher login', teacher.status === 302, `loc=${teacher.location}`);
  record('Teacher', 'Teacher panel', (await getWithCookie('/teacher', teacher.jar)).status === 200);
  record('Security', 'Teacher → /admin', (await getWithCookie('/admin', teacher.jar)).status === 403);

  const admin = await login('admin@lemontrade.com', 'Admin@12345');
  record('Auth', 'Admin login', admin.status === 302, `loc=${admin.location}`);

  for (const p of adminPages) {
    const r = await getWithCookie(p, admin.jar);
    record('Admin', `GET ${p}`, r.status === 200, `status=${r.status}`);
  }

  const liveJson = await getWithCookie('/signals/live?format=json', user.jar);
  record('API', 'Live signals JSON', liveJson.body?.includes('"signals"'), liveJson.body?.slice(0, 60));

  const noCsrf = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ identifier: 'x', password: 'y' }),
  });
  record('Security', 'POST without CSRF → 403', noCsrf.status === 403, `status=${noCsrf.status}`);

  const loginPage = await fetch(`${BASE}/login`);
  const csrf = parseCsrf(await loginPage.text());
  const sqli = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: loginPage.headers.get('set-cookie') || '',
    },
    body: new URLSearchParams({ identifier: "' OR 1=1--", password: 'x', _csrf: csrf }),
  });
  record('Security', 'SQLi login → 400', sqli.status === 400, `status=${sqli.status}`);

  const health = await fetchStatus(`${BASE}/api/health`);
  record('API', 'Health contract', health.body?.includes('lemontrade'), health.body?.slice(0, 80));

  const notFound = await fetchStatus(`${BASE}/nonexistent-xyz`);
  record('Functional', '404 page', notFound.status === 404, `status=${notFound.status}`);

  const timings = [];
  for (let i = 0; i < 15; i++) {
    timings.push((await fetchStatus(`${BASE}/`)).ms);
  }
  const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
  record('Performance', 'Homepage avg <500ms', avg < 500, `avg=${avg}ms max=${Math.max(...timings)}ms`);

  const home = await fetchStatus(`${BASE}/`);
  record('UI', 'Homepage brand FA', home.body?.includes('لیموترید'), '');
  record('UI', 'Homepage brand EN', home.body?.includes('lemontrade'), '');

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  const fails = results.filter((r) => !r.pass);
  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount, total: results.length }, fails, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
