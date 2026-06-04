/* Baobab — Dashboard "big" features.
 *
 *   - Notifications inbox (bell + dropdown panel)
 *   - Decision timeline (drawer triggered from sidebar)
 *   - Stress-test view (modal with rate/job/market sliders)
 *   - Onboarding wizard (3-step modal, replaces banner)
 *   - Document drop zone on Income (simulated AI extract)
 *   - Goal storytelling (pace, ETA, suggested contrib)
 *   - Presence indicator on the planner card
 *
 * Loaded after dashboard.js + template.js so the LS schema exists.
 */
(function () {
  'use strict';
  const LS = 'baobab.dashboard.v1';
  const state = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };

  // ───────────────────────────────────────────────────────────────
  // NOTIFICATIONS BELL
  // ───────────────────────────────────────────────────────────────
  const NOTIF_KEY = 'baobab.notif.seen.v1';
  const NOTIFS = [
    { id: 'eofy',  ago: '2h', from: 'Kudzai Mhishi', kind: 'planner', title: "EOFY checkpoint",        body: "You're 3 weeks from EOFY — let's confirm trust distributions before 30 June. Open a slot?", cta: { label: 'Schedule', href: '#' } },
    { id: 'q3',    ago: '1d', from: 'System',      kind: 'insight', title: "Q3 spend ↑ 18% vs Q2",   body: "Entertainment & lifestyle is running hotter than Q2. Open the Expenditure tab to break it down.", cta: { label: 'Open', tab: 'expenses' } },
    { id: 'goal',  ago: '2d', from: 'You',         kind: 'goal',    title: "Holiday goal — $6,500 / $15,000", body: "Pacing slightly behind target. Consider lifting monthly contribution by $230.", cta: { label: 'View goal', tab: 'goals' } },
    { id: 'doc',   ago: '4d', from: 'Kudzai Mhishi', kind: 'planner', title: "Tax return draft",       body: "Draft FY25 return uploaded for review.", cta: { label: 'View doc', href: '#' } },
    { id: 'super', ago: '1wk',from: 'System',      kind: 'tip',     title: "Concessional cap headroom", body: "You have ~$8,600 of FY26 concessional super cap remaining. Lina is in the 37% bracket.", cta: { label: 'See super', tab: 'goals' } }
  ];

  function readSeen() { try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch (e) { return []; } }
  function writeSeen(a) { localStorage.setItem(NOTIF_KEY, JSON.stringify(a)); }

  function mountBell() {
    const tb = document.querySelector('.dash-toolbar');
    if (!tb || document.getElementById('bb-bell')) return;
    const unseen = NOTIFS.filter(n => !readSeen().includes(n.id)).length;
    const bell = document.createElement('button');
    bell.id = 'bb-bell';
    bell.className = 'bb-bell btn btn-secondary btn-sm';
    bell.setAttribute('aria-label', 'Notifications');
    bell.innerHTML = `
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3.5 6.5a4.5 4.5 0 1 1 9 0v3l1 2H2.5l1-2v-3z"/>
        <path d="M6 13.5a2 2 0 0 0 4 0"/>
      </svg>
      <span class="bb-bell-badge" data-count="${unseen}">${unseen}</span>`;
    tb.insertBefore(bell, tb.firstChild);

    const panel = document.createElement('div');
    panel.id = 'bb-bell-panel';
    panel.className = 'bb-bell-panel';
    panel.hidden = true;
    document.body.appendChild(panel);
    function render() {
      const seen = readSeen();
      panel.innerHTML = `
        <div class="bb-bell-head">
          <strong>Inbox</strong>
          <span class="bb-bell-sub">${NOTIFS.length} items · ${unseen} new</span>
          <button class="bb-bell-mark" aria-label="Mark all read">Mark all read</button>
        </div>
        <div class="bb-bell-list">
          ${NOTIFS.map(n => `
            <div class="bb-bell-item" data-id="${n.id}" data-unseen="${!seen.includes(n.id)}" data-kind="${n.kind}">
              <span class="bb-bell-mark-dot"></span>
              <div class="bb-bell-body">
                <div class="bb-bell-meta"><span class="bb-bell-from">${n.from}</span><span class="bb-bell-ago">${n.ago}</span></div>
                <div class="bb-bell-title">${n.title}</div>
                <div class="bb-bell-text">${n.body}</div>
                <button class="bb-bell-cta" data-tab="${n.cta.tab || ''}">${n.cta.label} →</button>
              </div>
            </div>`).join('')}
        </div>
        <a class="bb-bell-foot" href="contact.html">All messages with Kudzai →</a>`;
    }
    render();

    function close() { panel.classList.remove('is-open'); setTimeout(() => panel.hidden = true, 180); }
    function position() {
      const r = bell.getBoundingClientRect();
      panel.style.top = (r.bottom + 8) + 'px';
      panel.style.right = (window.innerWidth - r.right) + 'px';
    }
    bell.addEventListener('click', e => {
      e.stopPropagation();
      const open = !panel.hidden;
      if (open) { close(); return; }
      position(); panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-open'));
      // Mark all as seen on open
      writeSeen(NOTIFS.map(n => n.id));
      bell.querySelector('.bb-bell-badge').dataset.count = '0';
      bell.querySelector('.bb-bell-badge').textContent = '0';
    });
    document.addEventListener('click', e => {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== bell && !bell.contains(e.target)) close();
    });
    panel.addEventListener('click', e => {
      const cta = e.target.closest('.bb-bell-cta');
      if (cta && cta.dataset.tab) {
        document.querySelector(`.dash-tab[data-tab="${cta.dataset.tab}"]`)?.click();
        close();
      }
      const mark = e.target.closest('.bb-bell-mark');
      if (mark) { writeSeen(NOTIFS.map(n => n.id)); render(); }
    });
    window.addEventListener('resize', position);
  }
  mountBell();

  // ───────────────────────────────────────────────────────────────
  // DECISION TIMELINE
  // ───────────────────────────────────────────────────────────────
  const TIMELINE = [
    { t: 'just now',   author: 'You',         act: 'edited',   what: 'Tax — Person 1 — Gross salary',  was: '$160,000', now: '$165,000' },
    { t: '2h ago',     author: 'You',         act: 'edited',   what: 'Income — Trust distributions',   was: '$4,200/mo', now: '$4,500/mo' },
    { t: 'yesterday',  author: 'Kudzai Mhishi', act: 'flagged',  what: 'IP1 — Neg-gearing pre-12 May check needed' },
    { t: '3d ago',     author: 'You',         act: 'added',    what: 'Goal — Home renovation $50,000' },
    { t: '5d ago',     author: 'Kudzai Mhishi', act: 'scheduled',what: 'Q4 review · 14 Jul 10:00 AM' },
    { t: '1wk ago',    author: 'Kudzai Mhishi', act: 'reviewed', what: 'Quarterly statement — all good' },
    { t: '2wk ago',    author: 'You',         act: 'uploaded', what: 'Payslip · Lina · Apr 2026' },
    { t: '1mo ago',    author: 'System',      act: 'snapshot', what: 'EOFY rollover — FY25 closed' }
  ];

  function mountTimelineEntry() {
    // Add as a button under planner card; opens a side drawer.
    const planner = document.querySelector('.planner-card');
    if (!planner || document.getElementById('bb-timeline-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'bb-timeline-trigger';
    btn.className = 'bb-timeline-trigger';
    btn.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg> View timeline`;
    planner.appendChild(btn);

    const drawer = document.createElement('div');
    drawer.id = 'bb-timeline-drawer';
    drawer.className = 'bb-drawer';
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="bb-drawer-backdrop" data-close></div>
      <aside class="bb-drawer-panel" aria-label="Decision timeline">
        <div class="bb-drawer-head">
          <div>
            <div class="bb-drawer-eyebrow">Audit · last 90 days</div>
            <strong>Decision timeline</strong>
          </div>
          <button class="bb-drawer-close" aria-label="Close">×</button>
        </div>
        <ol class="bb-timeline">
          ${TIMELINE.map(e => `
            <li>
              <span class="bb-tl-dot ${e.author === 'You' ? 'you' : e.author === 'System' ? 'sys' : 'planner'}"></span>
              <div class="bb-tl-body">
                <div class="bb-tl-meta"><strong>${e.author}</strong> · ${e.act} · <span class="bb-tl-when">${e.t}</span></div>
                <div class="bb-tl-what">${e.what}</div>
                ${e.was ? `<div class="bb-tl-diff"><s>${e.was}</s> → <strong>${e.now}</strong></div>` : ''}
              </div>
            </li>`).join('')}
        </ol>
      </aside>`;
    document.body.appendChild(drawer);
    btn.addEventListener('click', () => { drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open')); });
    drawer.querySelector('.bb-drawer-close').addEventListener('click', closeDrawer);
    drawer.querySelector('[data-close]').addEventListener('click', closeDrawer);
    function closeDrawer() { drawer.classList.remove('is-open'); setTimeout(() => drawer.hidden = true, 220); }
  }
  mountTimelineEntry();

  // ───────────────────────────────────────────────────────────────
  // STRESS TEST — adds a new tab + section
  // ───────────────────────────────────────────────────────────────
  function mountStressTab() {
    const nav = document.querySelector('nav.dash-nav');
    if (!nav || document.querySelector('.dash-tab[data-tab="stress"]')) return;
    // Insert tab after assets
    const stressBtn = document.createElement('button');
    stressBtn.className = 'dash-tab';
    stressBtn.dataset.tab = 'stress';
    stressBtn.innerHTML = `<span class="num-tick">⚡</span> Stress test`;
    const analysisLabel = document.createElement('div');
    analysisLabel.className = 'nav-section-label';
    analysisLabel.textContent = 'Analysis';
    nav.appendChild(analysisLabel);
    nav.appendChild(stressBtn);

    const content = document.querySelector('.dash-content');
    if (!content) return;
    const sec = document.createElement('section');
    sec.className = 'section-view';
    sec.dataset.section = 'stress';
    sec.innerHTML = `
      <div class="section-intro">
        <div>
          <div class="meta">⚡ · STRESS TEST</div>
          <h2>What if it all goes <em>sideways?</em></h2>
          <p class="deck">Drag the sliders. Net cashflow, debt cover and net worth recompute live. Red = at-risk · green = resilient. Use this before any big decision.</p>
        </div>
      </div>

      <div class="row-trajectory">
        <div class="panel">
          <div class="panel-head"><h2>Resilience score</h2><span class="muted" style="font-size:12px;">aggregate of cashflow, runway, LVR</span></div>
          <div class="panel-body">
            <div class="bb-stress-score">
              <svg viewBox="0 0 120 72" id="bb-stress-arc" style="width: 100%; max-width: 520px; display:block; margin:auto;"></svg>
              <div class="bb-stress-band">
                <div class="bb-stress-grid">
                  <div><div class="l">Net cashflow</div><div class="v" id="bb-stress-cf">$0</div></div>
                  <div><div class="l">Months runway</div><div class="v" id="bb-stress-rw">0</div></div>
                  <div><div class="l">Debt service</div><div class="v" id="bb-stress-dsr">0%</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Stressors</h2></div>
          <div class="panel-body">
            ${stressorRow('rate',  'Interest rates',      '-3', '4', 0, '%', 'pp shift on all variable loans — drag left for cuts')}
            ${stressorRow('income','Income change',       '-40','40',0, '%', 'pay rise / cut, new role, bonus')}
            ${stressorRow('job',   'Job loss / shortfall','0',  '24', 0, ' mo','months without earned income')}
            ${stressorRow('market','Market move',         '-40','40',0, '%', 'equity / property values — left = drawdown, right = gains')}
            ${stressorRow('exp',   'Lifestyle change',    '-25','30',0, '%', 'household + entertainment — left = cuts, right = creep')}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:14px;">
        <div class="panel-head"><h2>Net worth under stress</h2><span class="muted" style="font-size:12px;">baseline = solid · stressed = dashed</span></div>
        <div class="panel-body"><svg id="bb-stress-chart" style="width:100%; height: 220px; display:block;"></svg></div>
      </div>`;
    content.appendChild(sec);

    function stressorRow(key, label, min, max, def, suffix, hint) {
      const step = key === 'job' ? 1 : 0.25;
      return `<div class="bb-stressor" data-key="${key}">
        <div class="bb-stressor-head">
          <span class="bb-stressor-label">${label}</span>
          <span class="bb-stressor-edit">
            <input type="number" class="bb-stressor-num" min="${min}" max="${max}" step="${step}" value="${def}">
            <span class="bb-stressor-unit">${key === 'job' ? 'mo' : '%'}</span>
          </span>
        </div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${def}" class="bb-stressor-input">
        <div class="bb-stressor-hint">${hint}</div>
      </div>`;
    }

    function recalc() {
      const vals = {};
      sec.querySelectorAll('.bb-stressor').forEach(r => {
        const range = r.querySelector('.bb-stressor-input');
        vals[r.dataset.key] = parseFloat(range.value);
        const numIn = r.querySelector('.bb-stressor-num');
        if (numIn && document.activeElement !== numIn) numIn.value = vals[r.dataset.key];
      });

      const s = state();
      // Coarse baseline pulls.
      const incomeAnnual = (s.income || []).reduce((acc, r) => acc + ((+r.trust||0)+(+r.p1||0)+(+r.p2||0))*12, 0);
      const expHouseAnnual = (s.expenses || []).filter(g => !/entertainment/i.test(g.group)).reduce((sum, g) => sum + g.items.reduce((t, it) => t+(+it.annual||0), 0), 0);
      const expEntAnnual = (s.expenses || []).filter(g => /entertainment/i.test(g.group)).reduce((sum, g) => sum + g.items.reduce((t, it) => t+(+it.annual||0), 0), 0);
      function pmt(P, r, n) { const m = r/12/100; const N = n*12; if (m === 0) return P/N; return P*m/(1 - Math.pow(1+m, -N)); }
      const debtAll = [].concat(s.debt?.investment || [], s.debt?.private || []);
      const baseInterest = debtAll.reduce((sum, l) => sum + (+l.balance||0)*(+l.rate||0)/100, 0);
      const baseRepayAnnual = debtAll.reduce((sum, l) => {
        const rate = +l.rate||0, bal = +l.balance||0, term = +l.term||30;
        return sum + 12 * (l.type === 'IO' ? bal*rate/100/12 : pmt(bal, rate, term));
      }, 0);
      const alAssets = (s.al || []).reduce((sum, r) => sum + (+r.asset||0), 0);
      const alLiabs = (s.al || []).reduce((sum, r) => sum + (+r.liab||0), 0);
      const netWorth = alAssets - alLiabs;

      // Apply stress (all bidirectional — positive scenarios count too)
      const rateShift = vals.rate || 0;
      const incomeChange = (vals.income || 0) / 100;
      const jobMonths = vals.job || 0;
      const marketMove = (vals.market || 0) / 100;   // negative = drawdown, positive = gains
      const expChange = (vals.exp || 0) / 100;        // negative = cuts, positive = creep

      const earnedAfterJob = incomeAnnual * Math.max(0, (12 - jobMonths) / 12);
      const stressedIncomeAnnual = earnedAfterJob * (1 + incomeChange);
      const stressedHouse = expHouseAnnual * (1 + expChange);
      const stressedEnt   = expEntAnnual * (1 + expChange);
      const extraInterest = (debtAll.reduce((sum, l) => sum + (+l.balance||0), 0)) * (rateShift / 100);
      const stressedDebtAnnual = baseRepayAnnual + extraInterest;
      const stressedNetCF = stressedIncomeAnnual - stressedHouse - stressedEnt - stressedDebtAnnual;
      const monthlyExpenses = (stressedHouse + stressedEnt + stressedDebtAnnual) / 12;
      // Cash runway draws on liquid cash & savings (A&L) plus the emergency fund,
      // topped up by any monthly surplus.
      const liquidCash = (s.al || []).filter(r => /cash|saving|term deposit|offset/i.test((r.class||'') + ' ' + (r.desc||'')))
        .reduce((sum, r) => sum + (+r.asset||0), 0);
      const cashSavings = Math.max(+s.emergencyCurrent || 0, liquidCash, (+s.emergencyCurrent||0) + liquidCash * 0.5);
      const monthlySurplus = stressedNetCF / 12;
      const runway = monthlyExpenses > 0
        ? (monthlySurplus >= 0 ? 99 : cashSavings / Math.abs(monthlySurplus))
        : 99;
      const stressedAssets = alAssets * (1 + marketMove * 0.65); // property + shares blended sensitivity
      const stressedNW = stressedAssets - alLiabs;
      const stressedDSR = stressedIncomeAnnual > 0 ? stressedDebtAnnual / stressedIncomeAnnual : 1;

      sec.querySelector('#bb-stress-cf').textContent = fmtMoneyShort(stressedNetCF);
      sec.querySelector('#bb-stress-cf').className = 'v ' + (stressedNetCF >= 0 ? 'pos' : 'neg');
      sec.querySelector('#bb-stress-rw').textContent = runway >= 99 ? '∞' : runway.toFixed(1) + ' mo';
      sec.querySelector('#bb-stress-rw').className = 'v ' + (runway >= 6 ? 'pos' : runway >= 3 ? 'warn' : 'neg');
      sec.querySelector('#bb-stress-dsr').textContent = (stressedDSR * 100).toFixed(0) + '%';
      sec.querySelector('#bb-stress-dsr').className = 'v ' + (stressedDSR < 0.3 ? 'pos' : stressedDSR < 0.5 ? 'warn' : 'neg');

      // ── Graduated resilience score 0–100 (weighted, continuous) ──
      // Cashflow health (35): scaled by surplus as a % of income.
      const cfRatio = stressedIncomeAnnual > 0 ? stressedNetCF / stressedIncomeAnnual : (stressedNetCF >= 0 ? 0.2 : -0.5);
      const cfScore = clamp01((cfRatio + 0.10) / 0.30) * 35;        // −10%→0, +20%→full
      // Runway (25): 0 mo→0, 6+ mo→full.
      const rwScore = clamp01(runway / 6) * 25;
      // Debt service (25): 50%+→0, 20%-→full.
      const dsrScore = clamp01((0.50 - stressedDSR) / 0.30) * 25;
      // Net-worth preservation (15): lose half→0, hold/grow→full.
      const nwRatio = netWorth > 0 ? stressedNW / netWorth : 1;
      const nwScore = clamp01((nwRatio - 0.5) / 0.5) * 15;
      let score = Math.round(cfScore + rwScore + dsrScore + nwScore);
      score = Math.max(0, Math.min(100, score));
      drawArc(sec.querySelector('#bb-stress-arc'), score);
      drawStressChart(sec.querySelector('#bb-stress-chart'), netWorth, stressedNW);
    }
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    sec.querySelectorAll('.bb-stressor-input').forEach(i => i.addEventListener('input', recalc));
    sec.querySelectorAll('.bb-stressor-num').forEach(i => i.addEventListener('input', () => {
      const range = i.closest('.bb-stressor').querySelector('.bb-stressor-input');
      let v = parseFloat(i.value); if (isNaN(v)) return;
      v = Math.max(+range.min, Math.min(+range.max, v));
      range.value = v; recalc();
    }));
    recalc();

    // Switch handler — re-register so dashboard.js's switchTab works for the new section
    stressBtn.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(b => b.dataset.active = String(b === stressBtn));
      document.querySelectorAll('.section-view').forEach(s => s.dataset.active = String(s === sec));
      const title = document.getElementById('dash-section-title');
      if (title) title.innerHTML = `Stress test <span class="ttl-hint">⚡ what-if</span>`;
      history.replaceState(null, '', '#stress');
      recalc();
    });
  }

  function fmtMoneyShort(n) {
    if (!isFinite(n)) n = 0;
    const a = Math.abs(n); const sign = n < 0 ? '−' : '';
    if (a >= 1e6) return sign + '$' + (a/1e6).toFixed(2) + 'm';
    if (a >= 1e3) return sign + '$' + (a/1e3).toLocaleString('en-AU', { maximumFractionDigits: 0 }) + 'k';
    return sign + '$' + Math.round(a).toLocaleString('en-AU');
  }

  function drawArc(svg, score) {
    if (!svg) return;
    const W = 120, H = 72, cx = 60, cy = 60, r = 46;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Build the top semicircle as a sampled path (avoids SVG arc-flag ambiguity).
    function pt(t) { const a = Math.PI - t * Math.PI; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    function arcPath(from, to) {
      const N = 60; let dd = '';
      for (let i = 0; i <= N; i++) {
        const t = from + (to - from) * (i / N);
        const [x, y] = pt(t);
        dd += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
      return dd.trim();
    }
    const frac = Math.max(0, Math.min(1, score / 100));
    const color = score >= 70 ? 'var(--pos)' : score >= 40 ? 'var(--accent)' : 'var(--neg)';
    svg.innerHTML = `
      <path d="${arcPath(0, 1)}" fill="none" stroke="var(--hair-c)" stroke-width="8" stroke-linecap="round"/>
      ${frac > 0.001 ? `<path d="${arcPath(0, frac)}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>` : ''}
      <text x="${cx}" y="44" text-anchor="middle" font-family="var(--font-mono)" font-size="20" font-weight="600" fill="var(--ink)">${score}</text>
      <text x="${cx}" y="55" text-anchor="middle" font-family="var(--font-mono)" font-size="5" letter-spacing="0.18em" fill="var(--ink-3)">RESILIENCE</text>`;
  }

  function drawStressChart(svg, base, stressed) {
    if (!svg) return;
    const W = svg.parentElement.getBoundingClientRect().width || 600;
    const H = 220, P = 24;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const YEARS = 10;
    const baseSeries = [base];
    const stressedSeries = [stressed];
    for (let i = 1; i <= YEARS; i++) {
      baseSeries.push(baseSeries[i - 1] * 1.07);
      stressedSeries.push(stressedSeries[i - 1] * 1.04);
    }
    const all = baseSeries.concat(stressedSeries);
    const min = Math.min(0, ...all), max = Math.max(1, ...all);
    const span = Math.max(1, max - min);
    const xFor = i => P + (W - 2*P) * (i / YEARS);
    const yFor = v => P + (H - 2*P) * (1 - (v - min) / span);
    function poly(s) { return s.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' '); }
    svg.innerHTML = `
      <polyline points="${poly(baseSeries)}" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <polyline points="${poly(stressedSeries)}" fill="none" stroke="var(--neg)" stroke-width="2" stroke-dasharray="4 4"/>
      <text x="${xFor(YEARS) - 4}" y="${yFor(baseSeries[YEARS]) - 6}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--primary)">baseline ${fmtMoneyShort(baseSeries[YEARS])}</text>
      <text x="${xFor(YEARS) - 4}" y="${yFor(stressedSeries[YEARS]) + 14}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--neg)">stressed ${fmtMoneyShort(stressedSeries[YEARS])}</text>`;
  }

  mountStressTab();

  // ───────────────────────────────────────────────────────────────
  // ONBOARDING WIZARD — replaces dismissible banner with modal
  // ───────────────────────────────────────────────────────────────
  function mountWizard() {
    const banner = document.getElementById('onboarding-banner');
    if (!banner) return;
    const onboarded = localStorage.getItem('baobab.dashboard.onboarded');
    if (onboarded) return;

    // Hide banner, show modal instead the first time
    banner.hidden = true;
    const m = document.createElement('div');
    m.className = 'bb-wizard';
    m.innerHTML = `
      <div class="bb-wizard-backdrop"></div>
      <div class="bb-wizard-shell" role="dialog" aria-label="Get started">
        <div class="bb-wizard-progress">
          <span class="bb-wstep" data-state="active">1 · Path</span>
          <span class="bb-wconn"></span>
          <span class="bb-wstep">2 · Family</span>
          <span class="bb-wconn"></span>
          <span class="bb-wstep">3 · Done</span>
        </div>
        <div class="bb-wizard-body">

          <!-- step 1 -->
          <section class="bb-wpane" data-pane="1" data-active="true">
            <h3>How do you want to <em>start?</em></h3>
            <p>You can switch anytime — these are just our recommended first steps.</p>
            <div class="bb-wpath-grid">
              <button class="bb-wpath" data-path="template">
                <span class="num">↓ FAST · 5 MIN</span>
                <span class="ttl">Download upload template</span>
                <span class="desc">CSV with every field labelled. Fill offline, upload back. Best if you have your accountant's docs handy.</span>
              </button>
              <button class="bb-wpath" data-path="manual">
                <span class="num">✎ PACE · 15 MIN</span>
                <span class="ttl">Enter inline as I go</span>
                <span class="desc">Blank workbook, edit cells directly. Auto-saves. You can always upload a template later.</span>
              </button>
              <button class="bb-wpath" data-path="demo">
                <span class="num">◐ EXPLORE · 1 MIN</span>
                <span class="ttl">Keep the Jones family demo</span>
                <span class="desc">Look around first. Demo numbers in every tab. Clear when you're ready.</span>
              </button>
            </div>
          </section>

          <!-- step 2 -->
          <section class="bb-wpane" data-pane="2">
            <h3>Quick orientation</h3>
            <p>So we can set the right defaults — answer one each:</p>
            <div class="bb-wq">
              <label>Adults in the plan</label>
              <div class="bb-wseg" data-q="adults">
                <button data-v="1">1</button><button data-v="2" data-active="true">2</button><button data-v="3">3+</button>
              </div>
            </div>
            <div class="bb-wq">
              <label>Investment properties</label>
              <div class="bb-wseg" data-q="ips">
                <button data-v="0">None</button><button data-v="1">1</button><button data-v="2" data-active="true">2</button><button data-v="3+">3+</button>
              </div>
            </div>
            <div class="bb-wq">
              <label>Top priority right now</label>
              <div class="bb-wseg" data-q="goal">
                <button data-v="tax" data-active="true">Lower tax</button><button data-v="debt">Pay down debt</button><button data-v="grow">Grow assets</button><button data-v="retire">Retirement</button>
              </div>
            </div>
          </section>

          <!-- step 3 -->
          <section class="bb-wpane" data-pane="3">
            <div class="bb-wdone">
              <div class="bb-wdone-mark">✓</div>
              <h3>You're set, <em><span id="bb-wname">Lina</span></em>.</h3>
              <p>Your dashboard is open. Quick tips:</p>
              <ul class="bb-wtips">
                <li><kbd>⌘K</kbd> opens the command palette · jump anywhere.</li>
                <li><kbd>?</kbd> shows keyboard shortcuts.</li>
                <li>Click <strong>↓ Template</strong> in the toolbar to bulk-import.</li>
                <li>Tap the <strong>🔔</strong> bell for notes from Kudzai, your planner.</li>
              </ul>
            </div>
          </section>
        </div>
        <div class="bb-wizard-foot">
          <button class="btn btn-ghost btn-sm" data-skip>Skip — explore demo</button>
          <div style="flex:1"></div>
          <button class="btn btn-secondary btn-sm" data-prev hidden>← Back</button>
          <button class="btn btn-primary btn-sm" data-next>Continue →</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    requestAnimationFrame(() => m.classList.add('is-open'));

    let step = 1, chosenPath = null;
    function setStep(n) {
      step = n;
      m.querySelectorAll('.bb-wpane').forEach(p => p.dataset.active = String(+p.dataset.pane === n));
      m.querySelectorAll('.bb-wstep').forEach((s, i) => {
        if (i + 1 < n) s.dataset.state = 'done';
        else if (i + 1 === n) s.dataset.state = 'active';
        else delete s.dataset.state;
      });
      m.querySelector('[data-prev]').hidden = n === 1;
      m.querySelector('[data-next]').textContent = n === 3 ? 'Open dashboard →' : 'Continue →';
    }

    m.querySelectorAll('.bb-wpath').forEach(b => b.addEventListener('click', () => {
      m.querySelectorAll('.bb-wpath').forEach(x => x.dataset.active = 'false');
      b.dataset.active = 'true';
      chosenPath = b.dataset.path;
    }));
    m.querySelectorAll('.bb-wseg button').forEach(b => b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(x => delete x.dataset.active);
      b.dataset.active = 'true';
    }));
    m.querySelector('[data-skip]').addEventListener('click', () => finish('demo'));
    m.querySelector('[data-prev]').addEventListener('click', () => setStep(Math.max(1, step - 1)));
    m.querySelector('[data-next]').addEventListener('click', () => {
      if (step === 1) {
        if (!chosenPath) chosenPath = 'demo';
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else {
        finish(chosenPath || 'demo');
      }
    });
    function finish(path) {
      localStorage.setItem('baobab.dashboard.onboarded', '1');
      m.classList.remove('is-open');
      setTimeout(() => m.remove(), 220);
      if (path === 'template') document.getElementById('template-dl-btn')?.click();
      else if (path === 'manual') {
        if (confirm('Clear demo data and start blank?')) {
          const s = state();
          s.income = []; s.expenses = []; s.debt = { investment: [], private: [] };
          s.rental = []; s.goals = []; s.al = [];
          localStorage.setItem(LS, JSON.stringify(s));
          location.reload();
        }
      }
    }
  }
  mountWizard();

  // ───────────────────────────────────────────────────────────────
  // GOAL STORYTELLING enrichment
  // ───────────────────────────────────────────────────────────────
  function enrichGoals() {
    document.querySelectorAll('.goal-row').forEach(row => {
      if (row.dataset.enriched) return;
      const target = parseFloat(row.querySelector('[data-goal$=".target"]')?.value || 0);
      const current = parseFloat(row.querySelector('[data-goal$=".current"]')?.value || 0);
      const deadline = row.querySelector('[data-goal$=".deadline"]')?.value;
      if (!target || !deadline) return;
      const ms = new Date(deadline + '-01').getTime() - Date.now();
      const monthsLeft = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.4)));
      const remaining = Math.max(0, target - current);
      const required = remaining / monthsLeft;
      // Pace assumption: same as current contribution rate guesstimate (target/24 mo)
      const naturalPace = target / 24;
      const onTrack = required <= naturalPace * 1.2;
      const meta = row.querySelector('.goal-meta');
      if (!meta) return;
      const story = document.createElement('div');
      story.className = 'goal-story';
      story.innerHTML = `
        <span class="goal-story-status ${onTrack ? 'ok' : 'late'}">${onTrack ? '● on pace' : '▲ behind pace'}</span>
        <span>Need <strong>${fmtMoneyShort(required)}</strong>/mo over ${monthsLeft} mo</span>`;
      meta.appendChild(story);
      row.dataset.enriched = '1';
    });
  }
  // Re-enrich after every dashboard rerender
  const goalsRoot = document.getElementById('goals-list');
  if (goalsRoot) new MutationObserver(enrichGoals).observe(goalsRoot, { childList: true, subtree: true });
  setTimeout(enrichGoals, 400);

  // ───────────────────────────────────────────────────────────────
  // DOCUMENT DROP ZONE on Income tab (simulated AI extract)
  // ───────────────────────────────────────────────────────────────
  function mountDropzone() {
    const incomeSection = document.querySelector('[data-section="income"]');
    if (!incomeSection || incomeSection.querySelector('.bb-dropzone')) return;
    const dz = document.createElement('div');
    dz.className = 'bb-dropzone';
    dz.innerHTML = `
      <div class="bb-dropzone-icon">↓</div>
      <div>
        <strong>Drop a payslip, statement or summary</strong>
        <span>PDF, image or CSV. We extract the gross + PAYG and pre-fill the form. Beta — review before saving.</span>
      </div>
      <input type="file" id="bb-dz-input" accept="application/pdf,image/*,.csv" hidden multiple>
      <button class="btn btn-secondary btn-sm">Choose file</button>`;
    const firstPanel = incomeSection.querySelector('.panel');
    if (firstPanel) incomeSection.insertBefore(dz, firstPanel);
    else incomeSection.appendChild(dz);

    const input = dz.querySelector('#bb-dz-input');
    dz.querySelector('button').addEventListener('click', () => input.click());

    const isDragging = (e) => e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files');
    ['dragenter', 'dragover'].forEach(evt => dz.addEventListener(evt, e => { if (!isDragging(e)) return; e.preventDefault(); dz.dataset.over = 'true'; }));
    ['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, e => { delete dz.dataset.over; }));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      const files = [...(e.dataTransfer.files || [])];
      if (files.length) handleFile(files[0]);
    });
    input.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      input.value = '';
    });
    function handleFile(file) {
      dz.dataset.processing = 'true';
      dz.querySelector('div:nth-child(2)').innerHTML = `<strong>Extracting from ${file.name}…</strong><span>Parsing line items · this is a beta feature.</span>`;
      setTimeout(() => {
        delete dz.dataset.processing;
        dz.querySelector('div:nth-child(2)').innerHTML = `<strong style="color: var(--pos);">✓ Detected · gross $11,200 · PAYG $2,840</strong><span>We've added a row to Income — review and save.</span>`;
        // Simulate adding a row
        const s = state();
        s.income = s.income || [];
        s.income.push({ src: 'Salary — extracted from ' + file.name.replace(/\.[^.]+$/, ''), trust: 0, p1: 8360, p2: 0 });
        localStorage.setItem(LS, JSON.stringify(s));
        location.reload();
      }, 1400);
    }
  }
  mountDropzone();

  // ───────────────────────────────────────────────────────────────
  // PRESENCE INDICATOR on planner card
  // ───────────────────────────────────────────────────────────────
  function mountPresence() {
    const planner = document.querySelector('.planner-card .planner-who');
    if (!planner || planner.querySelector('.bb-presence')) return;
    const dot = document.createElement('span');
    dot.className = 'bb-presence';
    dot.title = 'Kudzai visited the Tax tab 2h ago';
    planner.querySelector('.pcav')?.appendChild(dot);
  }
  mountPresence();
})();
