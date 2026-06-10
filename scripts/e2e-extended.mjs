/**
 * Extended E2E checks — forms integrity, signup, teacher/admin HTML
 * Run: node scripts/e2e-extended.mjs
 */
const BASE = process.env.QA_BASE || 'http://localhost:3010';

function parseCsrf(html) {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/);
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
    body: new URLSearchParams({ identifier: email, password, next: '/dashboard', _csrf: csrf }),
  });
  return { jar: mergeCookies(cookies, res.headers.get('set-cookie')), status: res.status };
}

const results = [];
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

async function main() {
  // Form integrity — no CSRF inside action attribute
  const teacherLogin = await login('teacher@lemontrade.com', 'Teacher@12345');
  ok('Teacher login', teacherLogin.status === 302, `status=${teacherLogin.status}`);

  const teacherPanel = await fetch(`${BASE}/teacher`, {
    headers: { Cookie: teacherLogin.jar },
    redirect: 'manual',
  });
  const tpHtml = await teacherPanel.text();
  ok('Teacher panel 200', teacherPanel.status === 200);
  ok('Teacher close form action intact', !tpHtml.includes('csrf-field') || !tpHtml.match(/action="[^"]*csrf-field/));
  ok('Teacher close form has /close', tpHtml.includes('/close"'));

  const adminLogin = await login('admin@lemontrade.com', 'Admin@12345');
  const adminSignals = await fetch(`${BASE}/admin/signals`, { headers: { Cookie: adminLogin.jar } });
  const asHtml = await adminSignals.text();
  ok('Admin signals 200', adminSignals.status === 200);
  ok('Admin signal status form intact', asHtml.includes('/status"') && !asHtml.match(/action="[^"]*csrf-field/));

  // Signup flow — captcha first so session answer matches POST
  let cookies = '';
  const capRes = await fetch(`${BASE}/api/captcha`);
  cookies = mergeCookies(cookies, capRes.headers.get('set-cookie'));
  if (capRes.status === 429) {
    ok('Signup POST', false, 'rate limited — restart app and retry');
    const passCount = results.filter((r) => r.pass).length;
    const failCount = results.filter((r) => !r.pass).length;
    console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount }, results }, null, 2));
    process.exit(1);
  }
  const capJson = await capRes.json();
  const qMatch = String(capJson.question || '').match(/(\d+)\s*\+\s*(\d+)/);
  const answer = qMatch ? String(Number(qMatch[1]) + Number(qMatch[2])) : '';
  const signupGet = await fetch(`${BASE}/signup`, { headers: { Cookie: cookies } });
  cookies = mergeCookies(cookies, signupGet.headers.get('set-cookie'));
  const signupHtml = await signupGet.text();
  const csrf = parseCsrf(signupHtml);
  const email = `e2e_${Date.now()}@test.local`;
  const signupPost = await fetch(`${BASE}/signup`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({
      fullName: 'E2E Test',
      email,
      mobile: `09${String(Date.now()).slice(-9)}`,
      password: 'Test@12345',
      passwordConfirm: 'Test@12345',
      captcha: answer,
      terms: 'on',
      _csrf: csrf,
    }),
  });
  const signupBody = await signupPost.text();
  const signupErr = signupBody.match(/alert-error[^>]*>([^<]+)/)?.[1]?.trim();
  ok(
    'Signup POST',
    [302, 303].includes(signupPost.status),
    `status=${signupPost.status} loc=${signupPost.headers.get('location') || signupErr || ''} email=${email}`,
  );

  // Forgot-password page
  const fp = await fetch(`${BASE}/forgot-password`);
  ok('Forgot-password 200', fp.status === 200);

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount }, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
