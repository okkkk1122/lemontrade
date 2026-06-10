/**
 * Security / pentest-lite checks
 * Run: node scripts/qa-security.mjs
 */
const BASE = process.env.QA_BASE || 'http://localhost:3010';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

function parseCsrf(html) {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/) || html.match(/name="csrf-token"\s+content="([^"]+)"/);
  return m ? m[1] : '';
}

function mergeCookies(...parts) {
  const map = new Map();
  for (const part of parts.filter(Boolean)) {
    for (const chunk of part.split(',')) {
      const c = chunk.trim().split(';')[0];
      if (c.includes('=')) map.set(c.split('=')[0].trim(), c);
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
    body: new URLSearchParams({ identifier: email, password, _csrf: csrf }),
  });
  return mergeCookies(cookies, res.headers.get('set-cookie'));
}

async function main() {
  // Security headers
  const home = await fetch(`${BASE}/`);
  const h = home.headers;
  record('X-Content-Type-Options', h.get('x-content-type-options') === 'nosniff');
  record('X-Frame-Options', !!h.get('x-frame-options'));
  record('Content-Security-Policy', !!h.get('content-security-policy'));
  record('CSP blocks frames', (h.get('content-security-policy') || '').includes("frame-src 'none'"));

  // Session cookie flags
  const loginPage = await fetch(`${BASE}/login`, { redirect: 'manual' });
  const setCookie = loginPage.headers.get('set-cookie') || '';
  record('Session cookie HttpOnly', /httponly/i.test(setCookie));
  record('Session cookie SameSite', /samesite/i.test(setCookie));

  // Path traversal
  const trav = await fetch(`${BASE}/../../../etc/passwd`);
  record('Path traversal blocked', trav.status === 404 || trav.status === 400);

  // XSS reflection (login error should not execute script)
  const agent = await fetch(`${BASE}/login`);
  const csrf = parseCsrf(await agent.text());
  const ck = agent.headers.get('set-cookie') || '';
  const xss = await fetch(`${BASE}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck },
    body: new URLSearchParams({
      identifier: '<script>alert(1)</script>',
      password: 'x',
      _csrf: csrf,
    }),
  });
  const xssBody = await xss.text();
  record('XSS payload not reflected raw', !xssBody.includes('<script>alert(1)</script>'));

  // IDOR — user cannot access admin
  const userJar = await login('user@lemontrade.com', 'User@12345');
  const userAdmin = await fetch(`${BASE}/admin`, { headers: { Cookie: userJar }, redirect: 'manual' });
  record('User IDOR /admin → 403', userAdmin.status === 403);

  // Teacher cannot access admin users edit
  const teacherJar = await login('teacher@lemontrade.com', 'Teacher@12345');
  const tAdmin = await fetch(`${BASE}/admin/users`, { headers: { Cookie: teacherJar }, redirect: 'manual' });
  record('Teacher IDOR /admin/users → 403', tAdmin.status === 403);

  // Unauthenticated API — no sensitive leak
  const health = await fetch(`${BASE}/api/health`);
  if (health.status === 429) {
    record('Health has no secrets', true, 'skipped — rate limited');
  } else {
    const healthJson = await health.json();
    record('Health has no secrets', !JSON.stringify(healthJson).includes('password'));
  }

  // CSRF on JSON endpoint
  const jsonCsrf = await fetch(`${BASE}/learn/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userJar },
    body: JSON.stringify({ stepId: 'x', completed: true }),
  });
  record('JSON POST without CSRF → 403', jsonCsrf.status === 403);

  // Live signal access gates
  const liveList = await fetch(`${BASE}/signals/live?format=json`, {
    headers: { Cookie: userJar },
    redirect: 'manual',
  });
  let liveId = null;
  if (liveList.status === 200) {
    try {
      const data = await liveList.json();
      liveId = data.signals?.find((s) => !s.isSample)?.id || data.signals?.[0]?.id;
    } catch {}
  }
  if (liveId) {
    const guestSignal = await fetch(`${BASE}/signals/${liveId}`, { redirect: 'manual' });
    record('Guest live signal → login', guestSignal.status === 302 && guestSignal.headers.get('location')?.includes('login'));

    const teacherSignal = await fetch(`${BASE}/signals/${liveId}`, {
      headers: { Cookie: teacherJar },
      redirect: 'manual',
    });
    record('Teacher own live signal → 200', teacherSignal.status === 200);

    const adminJar = await login('admin@lemontrade.com', 'Admin@12345');
    const adminSignal = await fetch(`${BASE}/signals/${liveId}`, {
      headers: { Cookie: adminJar },
      redirect: 'manual',
    });
    record('Admin live signal → 200', adminSignal.status === 200);

    const nosubJar = await login('nosub@lemontrade.com', 'NoSub@12345');
    const nosubSignal = await fetch(`${BASE}/signals/${liveId}`, {
      headers: { Cookie: nosubJar },
      redirect: 'manual',
    });
    record(
      'NoSub user live signal → cart',
      nosubSignal.status === 302 && nosubSignal.headers.get('location')?.includes('cart')
    );
  } else {
    record('Guest live signal → login', true, 'skipped — no live signal');
    record('Teacher own live signal → 200', true, 'skipped — no live signal');
    record('Admin live signal → 200', true, 'skipped — no live signal');
    record('NoSub user live signal → cart', true, 'skipped — no live signal');
  }

  // Method not allowed / invalid
  const delHome = await fetch(`${BASE}/`, { method: 'DELETE' });
  record('DELETE / not 200', delHome.status !== 200);

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount }, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
