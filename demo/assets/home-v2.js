/* Baobab — Home v2 page interactions:
 *   - Marquee ticker (cloned for seamless loop)
 *   - Scroll progress bar
 *   - On-view kinetic counters
 *   - Live recalc chart driven by 3 sliders
 */
(function () {
  'use strict';

  // ── Status ticker ──────────────────────────────────────────────
  const ticker = document.getElementById('v2-ticker');
  if (ticker) {
    const items = [
      { k: 'AUD/USD', v: '0.6584', delta: '+0.12%', pos: true },
      { k: 'ASX 200',  v: '8,142.7',  delta: '+0.47%', pos: true },
      { k: 'RBA cash', v: '4.10%',    delta: 'unch', pos: null },
      { k: '10-yr AGB', v: '4.32%',   delta: '−0.03', pos: false },
      { k: 'CPI YoY',  v: '3.2%',     delta: '−0.4',  pos: false },
      { k: 'AUD/JPY',  v: '99.81',    delta: '+0.21%', pos: true },
      { k: 'FY26',     v: 'Q3',       delta: 'live',   pos: null, live: true },
      { k: 'Engaged',  v: '38 fams',  delta: '+2 wk',  pos: true },
      { k: 'Saved YTD', v: '$1.94m',  delta: 'tax · Δ', pos: true },
    ];
    const renderItem = (it) => {
      const cls = it.pos === true ? 'pos' : it.pos === false ? 'neg' : '';
      const dot = it.live ? '<span class="dot"></span>' : '';
      return `<span class="item">${dot}<span class="k">${it.k}</span><span class="v">${it.v}</span><span class="${cls}">${it.delta}</span></span>`;
    };
    const html = items.map(renderItem).join('');
    // Two copies for seamless marquee
    ticker.innerHTML = html + html;
  }

  // ── Scroll progress bar ────────────────────────────────────────
  const progress = document.getElementById('v2-progress');
  if (progress) {
    const upd = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progress.style.height = p + '%';
    };
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  // ── Kinetic counters ───────────────────────────────────────────
  function fmt(value, opts) {
    const decimals = opts.decimals || 0;
    const prefix = opts.prefix || '';
    const suffix = opts.suffix || '';
    if (opts.format === 'abbr') {
      // 2_840_000 → "$2.84m"
      const abs = Math.abs(value);
      let v, u;
      if (abs >= 1e6) { v = value / 1e6; u = 'm'; }
      else if (abs >= 1e3) { v = value / 1e3; u = 'k'; }
      else { v = value; u = ''; }
      return prefix + v.toFixed(2) + u + suffix;
    }
    return prefix + value.toFixed(decimals) + suffix;
  }
  const counters = document.querySelectorAll('[data-count]');
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const format = el.dataset.format || '';
    const dur = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      // ease out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const v = target * e;
      el.textContent = fmt(v, { decimals, prefix, suffix, format });
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target, { decimals, prefix, suffix, format });
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !e.target.dataset.counted) {
          e.target.dataset.counted = '1';
          animateCounter(e.target);
        }
      }
    }, { threshold: 0.4 });
    counters.forEach(c => io.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  // ── Live recalc chart ──────────────────────────────────────────
  const svg = document.getElementById('recalc-svg');
  const incEl = document.getElementById('knob-income');
  const rateEl = document.getElementById('knob-rate');
  const saveEl = document.getElementById('knob-save');
  if (svg && incEl && rateEl && saveEl) {
    const incV = document.getElementById('knob-income-v');
    const rateV = document.getElementById('knob-rate-v');
    const saveV = document.getElementById('knob-save-v');
    const startEl = document.getElementById('rc-start');
    const endEl = document.getElementById('rc-end');
    const cagrEl = document.getElementById('rc-cagr');

    const W = 800, H = 320, P = 28;
    const YEARS = 15;

    // Build static chrome once.
    const chrome = [];
    // y gridlines
    for (let i = 0; i <= 4; i++) {
      const y = P + (H - 2 * P) * (i / 4);
      chrome.push(`<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="var(--hair-2)" stroke-dasharray="2 4"/>`);
    }
    // x ticks (years)
    for (let i = 0; i <= YEARS; i++) {
      const x = P + (W - 2 * P) * (i / YEARS);
      if (i % 3 === 0) {
        chrome.push(`<line x1="${x}" x2="${x}" y1="${H - P}" y2="${H - P + 4}" stroke="var(--ink-3)"/>`);
        chrome.push(`<text x="${x}" y="${H - P + 16}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="10" fill="var(--ink-3)">FY${26 + i}</text>`);
      }
    }

    function recalc() {
      const income = parseFloat(incEl.value) * 1000;       // dollars / yr
      const rate = parseFloat(rateEl.value) / 100;
      const save = parseFloat(saveEl.value) / 100;

      incV.textContent = '$' + (income / 1000).toFixed(0) + 'k';
      rateV.textContent = rate * 100 < 10 ? (rate * 100).toFixed(2) + '%' : (rate * 100).toFixed(1) + '%';
      saveV.textContent = (save * 100).toFixed(0) + '%';

      // Net-worth model:
      //   start = 2.84m
      //   each year:
      //     contribution = income * save
      //     market growth = nw * (0.07 - rate*0.4)   // higher mortgage rate drags returns slightly
      //     nw = nw + contribution + market growth
      const start = 2_840_000;
      const series = [start];
      let nw = start;
      const drag = 0.07 - rate * 0.4 + 0.012; // tuned so default ≈ 8% CAGR
      for (let y = 1; y <= YEARS; y++) {
        const contribution = income * save;
        const growth = nw * drag;
        nw = nw + contribution + growth;
        series.push(nw);
      }

      const min = Math.min(...series);
      const max = Math.max(...series);
      const span = Math.max(1, max - min);

      const xFor = (i) => P + (W - 2 * P) * (i / YEARS);
      const yFor = (v) => P + (H - 2 * P) * (1 - (v - min) / span);

      const pts = series.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
      const path = 'M' + pts.split(' ').join(' L');

      // Area
      const area = path + ` L${xFor(YEARS).toFixed(1)},${(H - P).toFixed(1)} L${xFor(0).toFixed(1)},${(H - P).toFixed(1)} Z`;

      // Defs + dots at each year
      const dots = series.map((v, i) =>
        `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="2.5" fill="var(--accent)"/>`
      ).join('');

      // End label
      const endX = xFor(YEARS), endY = yFor(series[YEARS]);
      const endLbl = `<g transform="translate(${endX - 8},${endY - 14})">
        <rect x="-66" y="-12" width="64" height="22" rx="4" fill="var(--ink)"/>
        <text x="-34" y="3" text-anchor="middle" font-family="Geist Mono, monospace" font-size="11" fill="var(--bg)">$${(series[YEARS]/1e6).toFixed(2)}m</text>
      </g>`;

      svg.innerHTML = `
        <defs>
          <linearGradient id="rc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${chrome.join('')}
        <path d="${area}" fill="url(#rc-fill)"/>
        <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round"/>
        ${dots}
        ${endLbl}
      `;

      const cagr = Math.pow(series[YEARS] / start, 1 / YEARS) - 1;
      startEl.textContent = '$' + (start / 1e6).toFixed(2) + 'm';
      endEl.textContent = '$' + (series[YEARS] / 1e6).toFixed(2) + 'm';
      cagrEl.textContent = (cagr * 100).toFixed(1) + '%';
    }

    incEl.addEventListener('input', recalc);
    rateEl.addEventListener('input', recalc);
    saveEl.addEventListener('input', recalc);
    recalc();
  }
})();
