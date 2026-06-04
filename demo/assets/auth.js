/* Baobab — auth pages script (register stepper, login form) */
(function () {
  'use strict';

  // ── Password strength ────────────────────────────────────────
  const pw = document.getElementById('pw');
  const meter = document.getElementById('pw-meter');
  const pwLabel = document.getElementById('pw-strength-label');
  if (pw && meter) {
    pw.addEventListener('input', () => {
      const v = pw.value || '';
      let score = 0;
      if (v.length >= 8) score++;
      if (v.length >= 12) score++;
      if (/[0-9]/.test(v) && /[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v) && v.length >= 10) score++;
      meter.dataset.score = score;
      if (pwLabel) pwLabel.textContent = ['too short','weak','okay','strong','excellent'][score];
    });
  }

  // ── Entity chips ─────────────────────────────────────────────
  const chipsContainer = document.getElementById('entity-chips');
  if (chipsContainer) {
    const opts = ['Personal','Family Trust','Pty Ltd company','SMSF','Bucket co.','Holding co.'];
    chipsContainer.innerHTML = opts.map((o,i) =>
      `<button type="button" class="chip-btn" data-entity="${o}" data-active="${i < 2}">${o}</button>`
    ).join('');
    chipsContainer.addEventListener('click', e => {
      const b = e.target.closest('.chip-btn');
      if (b) b.dataset.active = String(b.dataset.active !== 'true');
    });
  }

  // ── Tier tiles ───────────────────────────────────────────────
  const tierBox = document.getElementById('tier-tiles');
  if (tierBox) {
    tierBox.addEventListener('click', e => {
      const t = e.target.closest('[data-tier]');
      if (!t) return;
      tierBox.querySelectorAll('[data-tier]').forEach(x => x.dataset.active = 'false');
      t.dataset.active = 'true';
    });
  }

  // ── Stepper navigation ───────────────────────────────────────
  const form = document.getElementById('reg-form');
  if (form) {
    const panes = form.querySelectorAll('.pane');
    const steps = document.querySelectorAll('#stepper .step');
    const setPane = (n) => {
      panes.forEach(p => p.dataset.active = String(p.dataset.pane == n));
      steps.forEach(s => {
        const sn = parseInt(s.dataset.step, 10);
        if (sn < n) s.dataset.state = 'done';
        else if (sn == n) s.dataset.state = 'active';
        else delete s.dataset.state;
      });
      // Focus first input of new pane
      const active = form.querySelector('.pane[data-active="true"]');
      const firstInput = active && active.querySelector('input, select, textarea, button');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);
    };
    form.addEventListener('click', e => {
      const next = e.target.closest('[data-next]');
      const prev = e.target.closest('[data-prev]');
      const cur = form.querySelector('.pane[data-active="true"]');
      const n = parseInt(cur.dataset.pane, 10);
      if (next) setPane(Math.min(4, n + 1));
      if (prev) setPane(Math.max(1, n - 1));
    });

    const submit = document.getElementById('reg-submit');
    if (submit) submit.addEventListener('click', () => {
      // Read first name and personalize done pane
      const first = (form.querySelector('[name="firstName"]') || {}).value || 'there';
      const last  = (form.querySelector('[name="lastName"]')  || {}).value || '';
      const email = (form.querySelector('[name="email"]')     || {}).value || '';
      // Sign the user in.
      try {
        localStorage.setItem('baobab.session', JSON.stringify({
          name: (first + ' ' + last).trim() || 'New client',
          email: email || 'you@example.com',
          tier: (document.querySelector('[data-tier][data-active="true"]') || {}).dataset?.tier || 'family',
          signedInAt: Date.now()
        }));
      } catch (e) { /* ignore */ }
      const doneName = document.getElementById('done-name');
      if (doneName) doneName.textContent = first;
      setPane(4);
    });
  }

  // ── Login form sign-in animation ─────────────────────────────
  const loginForm = document.getElementById('login-form');
  function deriveName(email) {
    try {
      const local = email.split('@')[0].replace(/[\d_.]+/g, ' ').trim();
      const n = local.split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
      return n || 'Client';
    } catch (e) { return 'Client'; }
  }
  if (loginForm) {
    // Demo credential book. Email match decides the destination; password is
    // accepted as-is in this prototype (any non-empty value works).
    const ACCOUNTS = {
      'lina@jonesfamilytrust.com.au': { name: 'Lina Jones',   role: 'client', dest: 'dashboard.html' },
      'admin@kudz.com.au':           { name: 'Kudzai Mhishi', role: 'admin',  dest: 'admin.html' }
    };
    const errEl = document.getElementById('login-error');
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const emailEl = loginForm.querySelector('input[type="email"]');
      const email = ((emailEl && emailEl.value) || '').trim().toLowerCase();
      const acct = ACCOUNTS[email] || (
        /admin/.test(email)
          ? { name: 'Kudzai Mhishi', role: 'admin', dest: 'admin.html' }
          : email
            ? { name: deriveName(email), role: 'client', dest: 'dashboard.html' }
            : null
      );
      if (!acct) {
        if (errEl) { errEl.textContent = 'Enter your email to continue.'; errEl.hidden = false; }
        return;
      }
      const btn = loginForm.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.dataset.loading = 'true';
        btn.innerHTML = '<span class="spinner"></span> Signing in…';
      }
      try {
        localStorage.setItem('baobab.session', JSON.stringify({
          name: acct.name, email, role: acct.role, signedInAt: Date.now()
        }));
      } catch (e) {}
      setTimeout(() => { location.href = acct.dest; }, 800);
    });
  }
})();
