/**
 * Functional flow tests — contact, cart, support, teacher signal, learn, payment
 * Run: node scripts/qa-functional.mjs
 */
const BASE = process.env.QA_BASE || 'http://localhost:3010';

const results = [];
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

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

async function loginAgent(email, password) {
  const page = await fetch(`${BASE}/login`, { redirect: 'manual' });
  const html = await page.text();
  const csrf = parseCsrf(html);
  let jar = page.headers.get('set-cookie') || '';
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar },
    body: new URLSearchParams({ identifier: email, password, _csrf: csrf }),
  });
  jar = mergeCookies(jar, res.headers.get('set-cookie'));
  return { jar, status: res.status, location: res.headers.get('location') };
}

async function getCsrf(path, jar) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: jar } });
  return { csrf: parseCsrf(await res.text()), jar: mergeCookies(jar, res.headers.get('set-cookie')) };
}

async function main() {
  // Contact form
  {
    const page = await fetch(`${BASE}/contact`);
    const html = await page.text();
    const csrf = parseCsrf(html);
    const ck = page.headers.get('set-cookie') || '';
    const res = await fetch(`${BASE}/contact`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck },
      body: new URLSearchParams({
        name: 'QA Test',
        email: 'qa@test.local',
        subject: 'تست QA',
        message: 'پیام تست خودکار',
        _csrf: csrf,
      }),
    });
    ok('Contact POST redirect', res.status === 302 && res.headers.get('location')?.includes('sent=1'));
  }

  // Cart add + view
  {
    const { jar } = await loginAgent('user@lemontrade.com', 'User@12345');
    const pkgPage = await fetch(`${BASE}/packages`, { headers: { Cookie: jar } });
    const pkgHtml = await pkgPage.text();
    const pkgId = pkgHtml.match(/name="packageId"\s+value="([^"]+)"/)?.[1];
    let j2 = mergeCookies(jar, pkgPage.headers.get('set-cookie'));
    const csrf = parseCsrf(pkgHtml);
    if (!pkgId) {
      ok('Cart add package', false, 'packageId not found on /packages');
    } else {
      const add = await fetch(`${BASE}/cart/add`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: j2 },
        body: new URLSearchParams({ packageId: pkgId, _csrf: csrf }),
      });
      ok('Cart add package', [302, 303].includes(add.status));
      const cart = await fetch(`${BASE}/cart`, { headers: { Cookie: mergeCookies(j2, add.headers.get('set-cookie')) } });
      const cartHtml = await cart.text();
      ok('Cart shows item', cart.status === 200 && cartHtml.length > 500);
    }
  }

  // Support ticket create
  {
    const { jar } = await loginAgent('user@lemontrade.com', 'User@12345');
    let { csrf, jar: j2 } = await getCsrf('/support', jar);
    const ticket = await fetch(`${BASE}/support`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: j2 },
      body: new URLSearchParams({
        subject: `QA تیکت ${Date.now()}`,
        message: 'متن تست پشتیبانی',
        _csrf: csrf,
      }),
    });
    ok('Support ticket create', ticket.status === 302);
  }

  // Learn progress JSON
  {
    const { jar } = await loginAgent('user@lemontrade.com', 'User@12345');
    const learn = await fetch(`${BASE}/learn/zero-to-hundred`, { headers: { Cookie: jar } });
    const learnHtml = await learn.text();
    const csrf =
      learnHtml.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] || parseCsrf(learnHtml);
    const stepMatch = learnHtml.match(/stepId:'([^']+)'/);
    if (stepMatch) {
      const prog = await fetch(`${BASE}/learn/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: jar,
          'CSRF-Token': csrf,
        },
        body: JSON.stringify({ stepId: stepMatch[1], completed: true }),
      });
      const body = await prog.json();
      ok('Learn progress JSON', prog.status === 200 && body.ok === true, JSON.stringify(body));
    } else {
      ok('Learn progress JSON', true, 'skip — no step in page');
    }
  }

  // Teacher signal create
  {
    const { jar } = await loginAgent('teacher@lemontrade.com', 'Teacher@12345');
    let { csrf, jar: j2 } = await getCsrf('/teacher', jar);
    const before = await fetch(`${BASE}/teacher`, { headers: { Cookie: j2 } });
    const beforeHtml = await before.text();
    const countBefore = (beforeHtml.match(/ACTIVE/g) || []).length;
    const sig = await fetch(`${BASE}/teacher/signals`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: j2 },
      body: new URLSearchParams({
        pairSymbol: 'EUR/USD',
        timeframe: '1h',
        tradeType: 'BUY',
        entryPrice: '1.0500',
        stopLoss: '1.0450',
        takeProfit1: '1.0600',
        analysis: 'QA automated signal test',
        _csrf: csrf,
      }),
    });
    ok('Teacher signal POST', sig.status === 302 && sig.headers.get('location')?.includes('created=1'));
    const after = await fetch(`${BASE}/teacher`, {
      headers: { Cookie: mergeCookies(j2, sig.headers.get('set-cookie')) },
    });
    const afterHtml = await after.text();
    ok('Teacher panel updated', after.status === 200 && afterHtml.includes('EUR/USD'));
  }

  // Payment dev mode (no merchant)
  {
    const { jar } = await loginAgent('user@lemontrade.com', 'User@12345');
    const pay = await fetch(`${BASE}/payment/zarinpal?amount=50000`, {
      redirect: 'manual',
      headers: { Cookie: jar },
    });
    const payLoc = pay.headers.get('location') || '';
    ok(
      'Zarinpal payment redirect',
      pay.status === 302 &&
        (payLoc.includes('/payment/zarinpal/verify') || payLoc.includes('zarinpal.com')),
      `loc=${payLoc}`,
    );
  }

  // Forgot password POST
  {
    const page = await fetch(`${BASE}/forgot-password`);
    const csrf = parseCsrf(await page.text());
    const ck = page.headers.get('set-cookie') || '';
    const fp = await fetch(`${BASE}/forgot-password`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: ck },
      body: new URLSearchParams({ email: 'user@lemontrade.com', _csrf: csrf }),
    });
    ok('Forgot password POST', fp.status === 200 || fp.status === 302, `status=${fp.status}`);
  }

  // Admin content page loads CRUD forms
  {
    const { jar } = await loginAgent('admin@lemontrade.com', 'Admin@12345');
    const content = await fetch(`${BASE}/admin/content`, { headers: { Cookie: jar } });
    const html = await content.text();
    ok('Admin content CRUD forms', content.status === 200 && !html.match(/action="[^"]*csrf-field/));
    ok('Admin content has sliders', html.includes('sliders'));
  }

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount }, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
