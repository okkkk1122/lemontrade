(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem('lemontrade-theme') || localStorage.getItem('limootrade-theme') || 'dark';
  root.setAttribute('data-theme', saved);

  document.querySelectorAll('[data-theme-set]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeSet === saved);
    btn.addEventListener('click', () => {
      const t = btn.dataset.themeSet;
      root.setAttribute('data-theme', t);
      localStorage.setItem('lemontrade-theme', t);
      document.querySelectorAll('[data-theme-set]').forEach((b) =>
        b.classList.toggle('active', b.dataset.themeSet === t)
      );
    });
  });

  const burger = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-main');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
  }

  document.querySelectorAll('.hero-slider').forEach((slider) => {
    const slides = slider.querySelectorAll('.slide');
    if (slides.length < 2) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('active');
    }, 5000);
  });

  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
      await navigator.clipboard.writeText(el.dataset.copy);
      const msg = el.querySelector('.copy-msg');
      if (msg) {
        msg.textContent = 'کپی شد!';
        setTimeout(() => (msg.textContent = ''), 2000);
      }
    });
  });

  const pollEl = document.getElementById('signals-poll');
  if (pollEl) {
    const sec = parseInt(pollEl.dataset.seconds || '30', 10) * 1000;
    setInterval(async () => {
      const res = await fetch(window.location.pathname + '?format=json');
      const data = await res.json();
      if (data.signals) {
        const tbody = document.getElementById('signals-tbody');
        if (!tbody) return;
        tbody.innerHTML = data.signals
          .map(
            (s) => `
          <tr>
            <td>${s.isNew ? '<span class="badge badge-new">جدید</span>' : ''} ${s.pairSymbol}</td>
            <td>${s.entryPrice}</td>
            <td>${s.stopLoss}</td>
            <td>${s.takeProfit1 || '-'}</td>
            <td><a href="/signals/${s.id}">جزئیات</a></td>
          </tr>`
          )
          .join('');
      }
    }, sec);
  }

  fetch('/api/captcha')
    .then((r) => r.json())
    .then((d) => {
      const el = document.getElementById('captcha-question');
      if (el) el.textContent = d.question;
    })
    .catch(() => {});

  const soundBtn = document.getElementById('signal-sound-toggle');
  if (soundBtn) {
    let on = localStorage.getItem('signal-sound') === '1';
    soundBtn.textContent = on ? '🔔' : '🔕';
    soundBtn.addEventListener('click', () => {
      on = !on;
      localStorage.setItem('signal-sound', on ? '1' : '0');
      soundBtn.textContent = on ? '🔔' : '🔕';
    });
  }
})();
