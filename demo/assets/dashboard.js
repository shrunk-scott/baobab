/* Baobab Portal — Dashboard logic
 * Single state object in localStorage; every input writes through; full recalc on every change.
 */

(function () {
  const LS = 'baobab.dashboard.v1';
  const fmtMoney = n => {
    if (!isFinite(n)) n = 0;
    const s = (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-AU');
    return s;
  };
  const fmtMoneyShort = n => {
    if (!isFinite(n)) n = 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (a >= 1e6) return sign + '$' + (a/1e6).toFixed(2) + 'm';
    if (a >= 1e3) return sign + '$' + (a/1e3).toLocaleString('en-AU', { maximumFractionDigits: 0 }) + 'k';
    return sign + '$' + Math.round(a).toLocaleString('en-AU');
  };
  const fmtNum = n => {
    if (!isFinite(n)) n = 0;
    return Math.round(n).toLocaleString('en-AU');
  };
  const fmtPct = n => (isFinite(n) ? (n*100).toFixed(1) + '%' : '—');

  // ── DEFAULT STATE (seeded with realistic Jones family values) ───────
  const DEFAULTS = {
    familyName: 'Jones', p1Name: 'Lina', p2Name: 'Marcus', numDeps: 2,
    trustName: 'Jones Family Trust', trustDist1: 100, trustDist2: 0,
    rbaRate: 4.35, invRate: 6.20, pporRate: 6.00, cpi: 3.0, propGrowth: 5.0,
    shareReturn: 9.0, sgcRate: 12.0, franking: 100,

    income: [
      { src: 'Trust distributions',   trust: 4500, p1: 0,    p2: 0 },
      { src: 'Salary — Person 1',     trust: 0,    p1: 9800, p2: 0 },
      { src: 'Salary — Person 2',     trust: 0,    p1: 0,    p2: 6200 },
      { src: 'Consulting income',     trust: 1800, p1: 0,    p2: 0 },
      { src: 'Net rental income',     trust: 0,    p1: 600,  p2: 600 },
      { src: 'Dividends (cash recd.)',trust: 0,    p1: 350,  p2: 350 }
    ],

    // Tax estimator: gross figures (annual) — separate from take-home
    tax: {
      p1: { salary: 165000, trust: 54000, consulting: 0, rental: -4200, dividends: 4200, franking: 1800, otherInc: 0,
            workDed: 2400, propDed: 0, ipDed: 1200, otherDed: 0, payg: 38500, otherCredit: 0 },
      p2: { salary: 105000, trust: 0,     consulting: 0, rental: -4200, dividends: 4200, franking: 1800, otherInc: 0,
            workDed: 1200, propDed: 0, ipDed: 1200, otherDed: 0, payg: 22000, otherCredit: 0 }
    },

    expenses: [
      { group: 'Groceries & food', items: [
        { name: 'Groceries / supermarket', annual: 18200 },
        { name: 'Fresh produce / deli',    annual: 4160 },
        { name: 'Coffees & lunches',       annual: 3640 }
      ]},
      { group: 'Home — principal residence', items: [
        { name: 'Council rates',     annual: 3200 },
        { name: 'Water',             annual: 1100 },
        { name: 'Electricity',       annual: 2800 },
        { name: 'Gas',               annual: 1400 },
        { name: 'Home insurance',    annual: 2400 },
        { name: 'Maintenance & garden', annual: 3600 }
      ]},
      { group: 'Telephone & internet', items: [
        { name: 'NBN / fixed line',  annual: 960 },
        { name: 'Mobiles (×2)',      annual: 1680 }
      ]},
      { group: 'Streaming & subscriptions', items: [
        { name: 'Netflix / Stan / Disney', annual: 540 },
        { name: 'Spotify',                 annual: 192 },
        { name: 'News & magazines',        annual: 240 }
      ]},
      { group: 'Vehicles & transport', items: [
        { name: 'Vehicle 1 — fuel',  annual: 3120 },
        { name: 'Vehicle 1 — insurance & rego', annual: 2200 },
        { name: 'Vehicle 2 — fuel',  annual: 2080 },
        { name: 'Vehicle 2 — insurance & rego', annual: 1900 },
        { name: 'Public transport / Uber', annual: 1040 }
      ]},
      { group: 'Health & medical', items: [
        { name: 'Private health insurance', annual: 4800 },
        { name: 'GP / specialist',         annual: 1200 },
        { name: 'Dental',                  annual: 1800 },
        { name: 'Pharmacy',                annual: 720 }
      ]},
      { group: 'Education & children', items: [
        { name: 'School fees',     annual: 28000 },
        { name: 'Uniforms & books',annual: 1800 },
        { name: 'Sport & activities', annual: 4400 }
      ]},
      { group: 'Entertainment & lifestyle', items: [
        { name: 'Dinners out',     annual: 4160 },
        { name: 'Holidays — overseas', annual: 12000 },
        { name: 'Domestic travel', annual: 4500 },
        { name: 'Gifts & donations', annual: 3200 }
      ]}
    ],

    debt: {
      investment: [
        { name: 'Investment property 1 — Coburg', balance: 480000, rate: 6.20, type: 'P&I', term: 25 },
        { name: 'Investment property 2 — Footscray', balance: 410000, rate: 6.20, type: 'IO', term: 25 },
        { name: 'Investment property 3 — Geelong', balance: 365000, rate: 6.35, type: 'P&I', term: 30 },
        { name: 'Share portfolio margin loan', balance: 85000, rate: 7.10, type: 'IO', term: 10 }
      ],
      private: [
        { name: 'PPOR mortgage — family home', balance: 540000, rate: 6.00, type: 'P&I', term: 28 },
        { name: 'Vehicle loan — SUV', balance: 22000,  rate: 8.50, type: 'P&I', term: 5 },
        { name: 'Renovation personal loan', balance: 35000, rate: 9.20, type: 'P&I', term: 7 },
        { name: 'Credit card', balance: 6400, rate: 19.99, type: 'IO', term: 3 }
      ]
    },

    rental: [
      { addr: 'Coburg, VIC 3058',  weeklyRent: 580, weeks: 50, ownership: 50, expenses: { agent: 1450, rates: 1800, insurance: 1100, interest: 38440, maint: 2200, water: 700 }},
      { addr: 'Footscray, VIC 3011', weeklyRent: 520, weeks: 50, ownership: 50, expenses: { agent: 1300, rates: 1600, insurance: 980,  interest: 33480, maint: 1800, water: 650 }}
    ],

    goals: [
      { name: 'Annual overseas holiday', target: 15000, current: 6500, deadline: '2026-12' },
      { name: 'Education fund — Child 1', target: 50000, current: 12000, deadline: '2030-01' },
      { name: 'Education fund — Child 2', target: 50000, current: 8000,  deadline: '2032-01' },
      { name: 'Home renovation',          target: 50000, current: 18000, deadline: '2026-06' },
      { name: 'Investment property — next', target: 200000, current: 45000, deadline: '2028-06' }
    ],

    emergencyTarget: 36000, emergencyCurrent: 40000,

    superP1: 285000, superP2: 142000,
    ageP1: 39, ageP2: 44,
    retP1: 65, retP2: 65,
    superContrib1: 22500, superContrib2: 14000,
    superTarget1: 1500000, superTarget2: 1500000,

    al: [
      { class: 'Property',         desc: 'Main residence',         owner: 'Joint', asset: 1450000, liab: 540000 },
      { class: 'Property',         desc: 'Investment property 1',  owner: 'Joint', asset: 780000,  liab: 480000 },
      { class: 'Property',         desc: 'Investment property 2',  owner: 'Joint', asset: 690000,  liab: 410000 },
      { class: 'Cash & savings',   desc: 'Transaction accounts',   owner: 'Joint', asset: 18000,   liab: 0 },
      { class: 'Cash & savings',   desc: 'Savings account',        owner: 'Joint', asset: 22000,   liab: 0 },
      { class: 'Superannuation',   desc: 'Super — Person 1',       owner: 'Person 1', asset: 285000, liab: 0 },
      { class: 'Superannuation',   desc: 'Super — Person 2',       owner: 'Person 2', asset: 142000, liab: 0 },
      { class: 'Shares',           desc: 'ASX listed shares',      owner: 'Joint', asset: 84000,   liab: 0 },
      { class: 'Other',            desc: 'Motor vehicles',         owner: 'Joint', asset: 65000,   liab: 22000 },
      { class: 'Credit cards',     desc: 'Credit card balances',   owner: 'Joint', asset: 0,       liab: 4200 }
    ]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(LS);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULTS), ...parsed };
    } catch { return structuredClone(DEFAULTS); }
  }
  function saveState() {
    localStorage.setItem(LS, JSON.stringify(state));
    const t = document.getElementById('last-save');
    if (t) {
      t.textContent = new Date().toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit' });
    }
  }

  let state = loadState();

  // ── ATO FY26 tax (Stage 3) ─────────────────────────────────────
  function ato(taxable) {
    if (taxable <= 0) return 0;
    if (taxable <= 18200) return 0;
    if (taxable <= 45000) return (taxable - 18200) * 0.16;
    if (taxable <= 135000) return 4288 + (taxable - 45000) * 0.30;
    if (taxable <= 190000) return 31288 + (taxable - 135000) * 0.37;
    return 51638 + (taxable - 190000) * 0.45;
  }
  function lito(taxable) {
    if (taxable <= 37500) return 700;
    if (taxable <= 45000) return 700 - (taxable - 37500) * 0.05;
    if (taxable <= 66667) return 325 - (taxable - 45000) * 0.015;
    return 0;
  }

  // ── DERIVED CALCULATIONS ───────────────────────────────────────
  function calcDerived() {
    // Income — annualise
    const incTotalsM = state.income.reduce((acc, r) => {
      acc.trust += +r.trust || 0; acc.p1 += +r.p1 || 0; acc.p2 += +r.p2 || 0;
      return acc;
    }, { trust: 0, p1: 0, p2: 0 });
    const incomeAnnual = (incTotalsM.trust + incTotalsM.p1 + incTotalsM.p2) * 12;
    const trustAnnual = incTotalsM.trust * 12;
    const rentalRow = state.income.find(r => /rental/i.test(r.src));
    const rentalAnnual = rentalRow ? ((+rentalRow.trust+(+rentalRow.p1)+(+rentalRow.p2)) * 12) : 0;

    // Expenses — annual per item = sum of every frequency column
    const EXP_FREQ = { week: 52, month: 12, quarter: 4, year: 1 };
    const itemAnnual = (it) => {
      if (it.week === undefined && it.month === undefined && it.quarter === undefined && it.year === undefined) {
        // legacy {amount,freq} / {annual}
        const amt = (it.amount != null ? +it.amount : (+it.annual || 0));
        return Math.round(amt * (EXP_FREQ[it.freq] || 1));
      }
      return Math.round(['week','month','quarter','year'].reduce((s, c) => s + (+it[c] || 0) * EXP_FREQ[c], 0));
    };
    const expByGroup = state.expenses.map(g => ({ group: g.group, total: g.items.reduce((s, it) => s + itemAnnual(it), 0) }));
    const expHouseAnnual = expByGroup.filter(g => !/entertainment/i.test(g.group)).reduce((s, g) => s + g.total, 0);
    const expEntAnnual = expByGroup.filter(g => /entertainment/i.test(g.group)).reduce((s, g) => s + g.total, 0);
    const expTotalAnnual = expHouseAnnual + expEntAnnual;

    // Tax for each person
    function taxFor(p, distPct) {
      const trustShare = trustAnnual * (distPct/100);
      const taxableIncome = (+p.salary || 0) + trustShare + (+p.consulting || 0) + (+p.rental || 0)
                          + (+p.dividends || 0) + (+p.franking || 0) + (+p.otherInc || 0)
                          - ((+p.workDed||0)+(+p.propDed||0)+(+p.ipDed||0)+(+p.otherDed||0));
      const grossTax = ato(taxableIncome);
      const litoAmt = lito(taxableIncome);
      const medicare = taxableIncome > 26000 ? taxableIncome * 0.02 : 0;
      const balance = grossTax - litoAmt + medicare - (+p.franking||0) - (+p.payg||0) - (+p.otherCredit||0);
      const eff = taxableIncome > 0 ? grossTax / taxableIncome : 0;
      return { taxableIncome, grossTax, litoAmt, medicare, balance, eff,
               franking: +p.franking||0, payg: +p.payg||0, otherCredit: +p.otherCredit||0,
               totalDed: (+p.workDed||0)+(+p.propDed||0)+(+p.ipDed||0)+(+p.otherDed||0) };
    }
    const t1 = taxFor(state.tax.p1, +state.trustDist1 || 0);
    const t2 = taxFor(state.tax.p2, +state.trustDist2 || 0);

    // Debt
    function pmt(P, r, n) {
      const m = r/12/100; const N = n*12;
      if (m === 0) return P/N;
      return P * m / (1 - Math.pow(1+m, -N));
    }
    function debtAgg(arr) {
      return arr.reduce((acc, l) => {
        const bal = +l.balance||0, rate = +l.rate||0, term = +l.term||0;
        const monInt = bal * rate / 100 / 12;
        const monRep = l.type === 'IO' ? monInt : pmt(bal, rate, term);
        acc.bal += bal; acc.int += monInt; acc.rep += monRep;
        return acc;
      }, { bal: 0, int: 0, rep: 0 });
    }
    const debtInv = debtAgg(state.debt.investment);
    const debtPriv = debtAgg(state.debt.private);
    const debtAll = { bal: debtInv.bal+debtPriv.bal, int: debtInv.int+debtPriv.int, rep: debtInv.rep+debtPriv.rep };

    // Rental aggregate
    const rentalAgg = state.rental.reduce((acc, p) => {
      const rent = (+p.weeklyRent||0) * (+p.weeks||0);
      const exp = Object.values(p.expenses||{}).reduce((s,v) => s+(+v||0), 0);
      const net = rent - exp;
      const yourShare = net * ((+p.ownership||0)/100);
      acc.rent += rent; acc.exp += exp; acc.net += net; acc.share += yourShare;
      return acc;
    }, { rent: 0, exp: 0, net: 0, share: 0 });

    // A & L
    const alAssets = state.al.reduce((s,r) => s + (+r.asset||0), 0);
    const alLiabs = state.al.reduce((s,r) => s + (+r.liab||0), 0);
    const alNet = alAssets - alLiabs;

    // Metrics
    const savings = incomeAnnual - expTotalAnnual - debtAll.rep*12;
    const savingsRate = incomeAnnual > 0 ? savings / incomeAnnual : 0;
    const dsr = incomeAnnual > 0 ? (debtAll.rep*12) / incomeAnnual : 0;
    const lvr = alAssets > 0 ? alLiabs / alAssets : 0;
    const monthlyExpenses = expTotalAnnual / 12 + debtAll.rep;
    const emergencyMonths = monthlyExpenses > 0 ? (+state.emergencyCurrent||0) / monthlyExpenses : 0;

    // Super projection — compound to retirement
    function superProj(bal, contrib, age, ret) {
      const years = Math.max(0, ret - age);
      const r = 0.07;
      let v = bal;
      for (let i = 0; i < years; i++) v = v*(1+r) + contrib;
      return v;
    }
    const superProjP1 = superProj(+state.superP1||0, +state.superContrib1||0, +state.ageP1||0, +state.retP1||0);
    const superProjP2 = superProj(+state.superP2||0, +state.superContrib2||0, +state.ageP2||0, +state.retP2||0);

    return { incTotalsM, incomeAnnual, trustAnnual, rentalAnnual, expByGroup, expHouseAnnual, expEntAnnual,
             expTotalAnnual, t1, t2, debtInv, debtPriv, debtAll, rentalAgg,
             alAssets, alLiabs, alNet, savings, savingsRate, dsr, lvr, emergencyMonths,
             monthlyExpenses, superProjP1, superProjP2 };
  }

  // ── RENDERERS ──────────────────────────────────────────────────

  function setText(key, val) {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach(el => el.textContent = val);
  }
  function setHTML(key, val) {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach(el => el.innerHTML = val);
  }

  function renderOverview(d) {
    setHTML('netWorth', fmtMoneyShort(d.alNet));
    setText('totalIncome', fmtMoney(d.incomeAnnual));
    setText('totalExpenses', fmtMoney(d.expTotalAnnual + d.debtAll.rep*12));
    const net = d.savings;
    setText('netCashflow', fmtMoney(net));
    document.querySelectorAll('[data-bind="netCashflowChip"]').forEach(el => {
      el.className = 'chip ' + (net >= 0 ? 'chip-pos' : 'chip-neg');
      el.innerHTML = `<span class="dot"></span> ${net >= 0 ? 'surplus' : 'deficit'}`;
    });

    setText('savingsRate', fmtPct(d.savingsRate));
    setText('dsr', fmtPct(d.dsr));
    setText('lvr', fmtPct(d.lvr));
    setText('emergency', d.emergencyMonths.toFixed(1) + ' mo');
    setText('taxCombined', fmtMoney(d.t1.balance + d.t2.balance));

    renderHealthScore(d);

    // CF chart — synthesize from monthly avg with seasonality
    drawCashflowChart(d);
    drawDonut(d);
    drawTrajectoryChart(d);
    drawAllocationDonut(d);
    renderGoalsMini(d);
  }

  // ── Tooltip + chart interactions ─────────────────────────────────
  function ensureTip() {
    let t = document.getElementById('chart-tip');
    if (!t) {
      t = document.createElement('div');
      t.id = 'chart-tip';
      t.className = 'chart-tip';
      t.hidden = true;
      document.body.appendChild(t);
    }
    return t;
  }
  function showTip(html, evt) {
    const t = ensureTip();
    t.innerHTML = html;
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let x = evt.clientX + 14, y = evt.clientY - r.height - 14;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y < 8) y = evt.clientY + 18;
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }
  function hideTip() { const t = document.getElementById('chart-tip'); if (t) t.hidden = true; }

  // Wire crosshair + tooltip onto a built line-chart SVG.
  function wireLineHover(svg, opts) {
    const { W, H, P, points, formatLabel, formatValue, crossColor } = opts;
    if (!points || !points.length) return;
    // Hit-test bands (one per index, equally split)
    const band = (W - 2 * P) / (points.length - 1);
    let hits = '';
    points.forEach((p, i) => {
      hits += `<rect class="chart-hit" x="${(p.x - band/2).toFixed(2)}" y="${P}" width="${band.toFixed(2)}" height="${(H - 2*P).toFixed(2)}" fill="transparent" pointer-events="all" data-i="${i}"/>`;
    });
    // Crosshair group, hidden by default
    const cross = `<g class="chart-cross" data-cross style="display:none; pointer-events:none;">
      <line class="cross-line" y1="${P}" y2="${H - P}" stroke="${crossColor || 'var(--ink-3)'}" stroke-dasharray="2 3" stroke-width="1"/>
      <circle class="cross-dot" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
    </g>`;
    svg.insertAdjacentHTML('beforeend', cross + hits);

    const crossEl = svg.querySelector('[data-cross]');
    const line = crossEl.querySelector('.cross-line');
    const dot = crossEl.querySelector('.cross-dot');

    svg.querySelectorAll('.chart-hit').forEach(rect => {
      rect.addEventListener('mouseenter', (e) => {
        const i = +rect.dataset.i;
        const p = points[i];
        crossEl.style.display = '';
        line.setAttribute('x1', p.x);
        line.setAttribute('x2', p.x);
        dot.setAttribute('cx', p.x);
        dot.setAttribute('cy', p.y);
        showTip(`<div class="tip-l">${formatLabel(p, i)}</div><div class="tip-v">${formatValue(p, i)}</div>`, e);
      });
      rect.addEventListener('mousemove', (e) => {
        const i = +rect.dataset.i;
        const p = points[i];
        showTip(`<div class="tip-l">${formatLabel(p, i)}</div><div class="tip-v">${formatValue(p, i)}</div>`, e);
      });
      rect.addEventListener('mouseleave', () => {
        crossEl.style.display = 'none';
        hideTip();
      });
    });
  }

  // Wire hover-grow + tooltip on donut slices (paths with data-* attrs).
  function wireDonutHover(svg, label) {
    const slices = svg.querySelectorAll('[data-slice]');
    slices.forEach(s => {
      s.addEventListener('mouseenter', () => {
        slices.forEach(o => o.style.opacity = o === s ? '1' : '0.35');
        s.style.transform = 'scale(1.04)';
      });
      s.addEventListener('mousemove', (e) => {
        showTip(
          `<div class="tip-l">${s.dataset.name}</div><div class="tip-v">${s.dataset.value}</div><div class="tip-s">${s.dataset.pct}% of ${label || 'total'}</div>`,
          e
        );
      });
      s.addEventListener('mouseleave', () => {
        slices.forEach(o => { o.style.opacity = ''; o.style.transform = ''; });
        hideTip();
      });
    });
  }

  function drawTrajectoryChart(d) {
    const svg = document.getElementById('trajectory-chart'); if (!svg) return;
    // Use the actual container width so we don't stretch a 600px viewBox.
    const containerW = svg.parentElement.getBoundingClientRect().width || 600;
    const W = Math.max(400, Math.round(containerW));
    const H = 240, P = 32;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.height = H + 'px';
    const YEARS = 15;
    const start = Math.max(0, d.alNet);
    const annualSurplus = Math.max(0, d.savings);
    const r = 0.07; // 7% real growth

    const series = [start];
    let nw = start;
    for (let y = 1; y <= YEARS; y++) {
      nw = nw * (1 + r) + annualSurplus;
      series.push(nw);
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = Math.max(1, max - min);
    const xFor = i => P + (W - 2*P) * (i / YEARS);
    const yFor = v => P + (H - 2*P) * (1 - (v - min) / span);

    // Grid + ticks
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const y = P + (H - 2*P) * (i / 4);
      grid += `<line x1="${P}" x2="${W-P}" y1="${y}" y2="${y}" stroke="var(--hair-2)" stroke-dasharray="2 4"/>`;
    }
    let ticks = '';
    for (let i = 0; i <= YEARS; i += 3) {
      const x = xFor(i);
      ticks += `<text x="${x}" y="${H-12}" text-anchor="middle" class="label-tick">FY${26 + i}</text>`;
    }

    const pts = series.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
    const path = 'M' + pts.split(' ').join(' L');
    const area = path + ` L${xFor(YEARS)},${H - P} L${xFor(0)},${H - P} Z`;

    const dots = series.map((v, i) => i % 3 === 0
      ? `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.6"/>`
      : '').join('');

    const endX = xFor(YEARS), endY = yFor(series[YEARS]);
    // Pin label inside chart, biased to the left of the endpoint so it never
    // clips on narrow panels; raise it above the dot.
    const lblX = Math.min(endX - 8, W - P - 6);
    const lblY = Math.max(P + 12, endY - 22);
    const endLbl = `<g transform="translate(${lblX - 68},${lblY - 12})">
      <rect width="68" height="20" rx="4" fill="var(--ink)"/>
      <text x="34" y="13" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--bg)">${fmtMoneyShort(series[YEARS])}</text>
    </g>`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="traj-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${area}" fill="url(#traj-fill)"/>
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
      ${ticks}
      ${endLbl}
    `;

    // Interactive crosshair
    wireLineHover(svg, {
      W, H, P,
      points: series.map((v, i) => ({ x: xFor(i), y: yFor(v), v, i })),
      formatLabel: (p) => `FY${(26 + p.i).toString().slice(-2)}–${(27 + p.i).toString().slice(-2)}`,
      formatValue: (p) => fmtMoneyShort(p.v),
      crossColor: 'var(--primary)'
    });
  }

  function drawAllocationDonut(d) {
    const svg = document.getElementById('alloc-donut'); if (!svg) return;
    const ul = document.getElementById('alloc-legend');
    // Group assets by class
    const groups = {};
    (state.al || []).forEach(r => {
      const cls = (r.class || 'Other').trim();
      groups[cls] = (groups[cls] || 0) + (+r.asset || 0);
    });
    const entries = Object.entries(groups).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total === 0 || entries.length === 0) {
      svg.innerHTML = `<text x="50" y="55" text-anchor="middle" font-size="9" fill="var(--ink-3)">no assets yet</text>`;
      if (ul) ul.innerHTML = `<li style="color: var(--ink-3); font-size: 12px;">Add A&amp;L lines to see allocation</li>`;
      return;
    }
    const palette = ['var(--primary)', 'var(--accent)', 'var(--primary-2)', 'var(--accent-2)', 'var(--ink-3)', 'var(--ink-4)'];
    const cx = 50, cy = 50, R = 36, r = 24;
    let acc = 0, paths = '', legend = '';
    entries.forEach(([name, val], i) => {
      const frac = val / total;
      const a0 = acc * Math.PI * 2 - Math.PI / 2;
      const a1 = (acc + frac) * Math.PI * 2 - Math.PI / 2;
      acc += frac;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
      const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
      paths += `<path class="donut-slice" data-slice data-name="${name}" data-value="${fmtMoneyShort(val)}" data-pct="${(frac*100).toFixed(0)}" d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${palette[i]}" stroke="var(--surface)" stroke-width="0.6"/>`;
      legend += `<li><span class="sw" style="background:${palette[i]}"></span><span>${name}</span><span class="mono muted">${(frac*100).toFixed(0)}%</span></li>`;
    });
    svg.innerHTML = paths +
      `<text x="50" y="49" text-anchor="middle" font-size="6" fill="var(--ink-3)" letter-spacing="0.05em" pointer-events="none">TOTAL ASSETS</text>` +
      `<text x="50" y="59" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--ink)" font-weight="500" pointer-events="none">${fmtMoneyShort(total)}</text>`;
    if (ul) ul.innerHTML = legend;
    wireDonutHover(svg, 'assets');
  }

  function renderHealthScore(d) {
    const band = document.getElementById('health-band');
    if (!band) return;
    // Four sub-scores (0..1) → weighted blend.
    const f = {
      savings: { label: 'Savings rate', weight: 0.30,
        score: clamp((d.savingsRate - 0) / 0.25), val: fmtPct(d.savingsRate), target: '>20%' },
      debt: { label: 'Debt service', weight: 0.25,
        score: clamp((0.45 - d.dsr) / 0.30), val: fmtPct(d.dsr), target: '<30%' },
      buffer: { label: 'Emergency fund', weight: 0.25,
        score: clamp(d.emergencyMonths / 6), val: d.emergencyMonths.toFixed(1) + ' mo', target: '3–6 mo' },
      gearing: { label: 'Leverage (LVR)', weight: 0.20,
        score: clamp((0.65 - d.lvr) / 0.45), val: fmtPct(d.lvr), target: '<50%' }
    };
    function clamp(x){ return Math.max(0, Math.min(1, isFinite(x)?x:0)); }
    let score = 0; Object.values(f).forEach(x => score += x.score * x.weight);
    score = Math.round(score * 100);

    const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Strong' : score >= 50 ? 'Fair' : score >= 35 ? 'Needs work' : 'At risk';
    const color = score >= 65 ? 'var(--pos)' : score >= 50 ? 'var(--accent)' : 'var(--neg)';
    const headline = score >= 80 ? 'Outstanding shape — you’re ahead on every measure that matters.'
      : score >= 65 ? 'Healthy overall. A couple of levers could lift you into excellent.'
      : score >= 50 ? 'Solid foundation with clear room to improve. Focus on the weakest factor below.'
      : 'A few fundamentals need attention. Your planner has flagged the priorities.';

    setText('healthScore', score);
    const gradeEl = document.querySelector('[data-bind="healthGrade"]');
    if (gradeEl) { gradeEl.textContent = grade; gradeEl.style.color = color; }
    setText('healthHeadline', headline);

    // Gauge — 200×130 viewBox, semicircle arc sampled as a path
    const svg = document.getElementById('health-gauge');
    if (svg) {
      const cx = 100, cy = 110, r = 82;
      const arc = (from, to) => {
        const N = 64; let dd = '';
        for (let i = 0; i <= N; i++) {
          const t = from + (to - from) * (i / N);
          const a = Math.PI - t * Math.PI;
          const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
          dd += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        }
        return dd.trim();
      };
      const frac = score / 100;
      // tick marks at 50 and 80 thresholds
      const tick = (t) => {
        const a = Math.PI - t * Math.PI;
        const x1 = cx + (r-9) * Math.cos(a), y1 = cy - (r-9) * Math.sin(a);
        const x2 = cx + (r+9) * Math.cos(a), y2 = cy - (r+9) * Math.sin(a);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--ink-4)" stroke-width="1.5"/>`;
      };
      svg.innerHTML = `
        <path d="${arc(0,1)}" fill="none" stroke="var(--hair-c)" stroke-width="13" stroke-linecap="round"/>
        ${frac>0.005?`<path d="${arc(0,frac)}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>`:''}
        ${tick(0.5)}${tick(0.8)}
        <text x="18" y="126" font-family="var(--font-mono)" font-size="8" fill="var(--ink-4)">0</text>
        <text x="178" y="126" font-family="var(--font-mono)" font-size="8" fill="var(--ink-4)" text-anchor="end">100</text>`;
    }

    // Factor breakdown
    const host = document.getElementById('health-factors');
    if (host) {
      host.innerHTML = Object.values(f).map(x => {
        const cls = x.score >= 0.66 ? 'hf-good' : x.score >= 0.4 ? 'hf-ok' : 'hf-bad';
        return `<div class="hf ${cls}">
          <div class="hf-top"><span class="hf-label">${x.label}</span><span class="hf-val">${x.val}</span></div>
          <div class="hf-bar"><div style="width:${Math.round(x.score*100)}%"></div></div>
          <div class="hf-label" style="margin-top:6px; color:var(--ink-3); font-family:var(--font-mono); font-size:10px;">target ${x.target}</div>
        </div>`;
      }).join('');
    }
  }

  function drawCashflowChart(d) {
    const svg = document.getElementById('cf-chart'); if (!svg) return;
    const containerW = svg.parentElement.getBoundingClientRect().width || 600;
    const W = Math.max(360, Math.round(containerW));
    const H = 220, P = 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.height = H + 'px';
    svg.style.width = '100%';
    const monthlyNet = d.savings / 12;
    const seasonal = [1.0, 1.05, 0.85, 1.0, 0.95, 0.7, 1.15, 1.0, 0.9, 1.1, 1.0, 0.6];
    const data = seasonal.map(s => monthlyNet * s);
    const xStep = (W - P*2) / (data.length - 1);
    const baseY = H - 24; // baseline sits above month labels

    // Scale to the data's own range (with headroom) so variation is visible,
    // anchoring the fill to the chart baseline rather than a centred midline.
    const lo = Math.min(...data), hi = Math.max(...data);
    const pad = (hi - lo) * 0.25 || Math.abs(hi) * 0.25 || 1;
    const top = hi + pad;
    const bot = Math.min(lo - pad, lo >= 0 ? lo - pad : lo);
    const span = Math.max(1, top - bot);
    const yScale = v => 16 + (baseY - 16) * (1 - (v - bot) / span);

    let path = '';
    data.forEach((v, i) => {
      const x = P + i*xStep, y = yScale(v);
      path += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    });
    const lastX = P + (data.length-1)*xStep;
    const area = path + `L ${lastX.toFixed(1)},${baseY} L ${P},${baseY} Z`;

    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    let ticks = '';
    months.forEach((m, i) => {
      const x = P + i*xStep;
      ticks += `<text x="${x}" y="${H-6}" text-anchor="middle" class="label-tick">${m}</text>`;
    });

    svg.innerHTML = `
      <line x1="${P}" y1="${baseY}" x2="${W-P}" y2="${baseY}" class="axis"/>
      <path d="${area}" fill="var(--primary)" opacity="0.10"/>
      <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${data.map((v,i) => `<circle cx="${(P+i*xStep).toFixed(1)}" cy="${yScale(v).toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.5"/>`).join('')}
      ${ticks}
    `;

    // Interactive crosshair
    const monthsFull = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    wireLineHover(svg, {
      W, H, P,
      points: data.map((v, i) => ({ x: P + i*xStep, y: yScale(v), v, i })),
      formatLabel: (p) => monthsFull[p.i],
      formatValue: (p) => fmtMoney(p.v) + ' / mo',
      crossColor: 'var(--primary)'
    });
  }

  function drawDonut(d) {
    const svg = document.getElementById('exp-donut'); if (!svg) return;
    const ul = document.getElementById('exp-legend');
    const groups = d.expByGroup.filter(g => g.total > 0).sort((a,b) => b.total - a.total).slice(0, 6);
    const total = groups.reduce((s,g) => s+g.total, 0);
    const palette = ['var(--primary)', 'var(--accent)', 'var(--primary-2)', 'var(--accent-2)', 'var(--ink-3)', 'var(--ink-4)'];
    const cx = 50, cy = 50, R = 36, r = 24;
    let acc = 0;
    let paths = '';
    let legend = '';
    groups.forEach((g, i) => {
      const frac = g.total / total;
      const a0 = acc * Math.PI * 2 - Math.PI/2;
      const a1 = (acc + frac) * Math.PI * 2 - Math.PI/2;
      acc += frac;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + R*Math.cos(a0), y0 = cy + R*Math.sin(a0);
      const x1 = cx + R*Math.cos(a1), y1 = cy + R*Math.sin(a1);
      const xi1 = cx + r*Math.cos(a1), yi1 = cy + r*Math.sin(a1);
      const xi0 = cx + r*Math.cos(a0), yi0 = cy + r*Math.sin(a0);
      paths += `<path class="donut-slice" data-slice data-name="${g.group}" data-value="${fmtMoneyShort(g.total)}" data-pct="${(frac*100).toFixed(0)}" d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${palette[i]}" stroke="var(--surface)" stroke-width="0.6"/>`;
      legend += `<li><span class="sw" style="background:${palette[i]}"></span><span>${g.group}</span><span class="mono muted">${(frac*100).toFixed(0)}%</span></li>`;
    });
    svg.innerHTML = paths + `<text x="50" y="49" text-anchor="middle" font-size="6" fill="var(--ink-3)" letter-spacing="0.05em" pointer-events="none">TOTAL SPEND</text><text x="50" y="59" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--ink)" font-weight="500" pointer-events="none">${fmtMoneyShort(total)}</text>`;
    if (ul) ul.innerHTML = legend;
    wireDonutHover(svg, 'spend');
  }

  function renderGoalsMini(d) {
    const root = document.getElementById('goals-mini');
    if (!root) return;
    root.innerHTML = state.goals.slice(0, 4).map(g => {
      const pct = g.target > 0 ? Math.min(100, (g.current/g.target)*100) : 0;
      return `
        <div>
          <div class="flex justify-between" style="font-size: 13px; margin-bottom: 6px;">
            <span>${g.name}</span>
            <span class="mono muted">${fmtMoneyShort(g.current)} / ${fmtMoneyShort(g.target)}</span>
          </div>
          <div class="goal-bar"><div style="width:${pct.toFixed(1)}%"></div></div>
        </div>`;
    }).join('');
  }

  function renderAssumptions() {
    document.querySelectorAll('[data-input]').forEach(el => {
      const k = el.dataset.input;
      if (k in state) el.value = state[k];
    });
  }

  function renderIncome() {
    const tbody = document.querySelector('#income-table tbody');
    if (!tbody) return;
    tbody.innerHTML = state.income.map((r, i) => {
      const monthly = (+r.trust||0)+(+r.p1||0)+(+r.p2||0);
      const annual = monthly * 12;
      return `
        <tr data-income-row="${i}">
          <td><input class="field text-input" type="text" data-inc="${i}.src" value="${r.src||''}"></td>
          <td class="num"><input class="field" type="number" data-inc="${i}.trust" value="${r.trust||0}"></td>
          <td class="num"><input class="field" type="number" data-inc="${i}.p1"    value="${r.p1||0}"></td>
          <td class="num"><input class="field" type="number" data-inc="${i}.p2"    value="${r.p2||0}"></td>
          <td class="num">${fmtMoney(monthly)}</td>
          <td class="num"><strong>${fmtMoney(annual)}</strong></td>
        </tr>`;
    }).join('');
    document.querySelectorAll('[data-bind-attr="p1Header"]').forEach(el => el.textContent = state.p1Name);
    document.querySelectorAll('[data-bind-attr="p2Header"]').forEach(el => el.textContent = state.p2Name);
  }

  function renderTax(d) {
    const renderPanel = (target, p, t, name) => {
      target.innerHTML = `
        <table class="tbl">
          <tbody>
            <tr class="group-head"><td colspan="2">Income (gross, annual)</td></tr>
            <tr><td>Gross salary / wages</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.salary" value="${p.salary}"></div></td></tr>
            <tr><td>Trust distributions</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.trust" value="${p.trust}" disabled style="background: var(--panel);"></div></td></tr>
            <tr><td>Consulting / business</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.consulting" value="${p.consulting}"></div></td></tr>
            <tr><td>Net rental income / (loss)</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.rental" value="${p.rental}"></div></td></tr>
            <tr><td>Dividend income</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.dividends" value="${p.dividends}"></div></td></tr>
            <tr><td>Franking credits</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.franking" value="${p.franking}"></div></td></tr>
            <tr><td>Other income</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.otherInc" value="${p.otherInc}"></div></td></tr>

            <tr class="group-head"><td colspan="2">Allowable deductions</td></tr>
            <tr><td>Work-related</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.workDed" value="${p.workDed}"></div></td></tr>
            <tr><td>Investment property</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.propDed" value="${p.propDed}"></div></td></tr>
            <tr><td>Income protection</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.ipDed" value="${p.ipDed}"></div></td></tr>
            <tr><td>Other</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.otherDed" value="${p.otherDed}"></div></td></tr>
            <tr class="subtotal"><td>Total deductions</td><td class="num">${fmtMoney(t.totalDed)}</td></tr>

            <tr class="group-head"><td colspan="2">Tax calculation · FY 2025–26</td></tr>
            <tr><td>Taxable income</td><td class="num">${fmtMoney(t.taxableIncome)}</td></tr>
            <tr><td>Gross income tax</td><td class="num">${fmtMoney(t.grossTax)}</td></tr>
            <tr><td>Less: LITO</td><td class="num">−${fmtMoney(t.litoAmt)}</td></tr>
            <tr><td>Add: Medicare (2%)</td><td class="num">${fmtMoney(t.medicare)}</td></tr>
            <tr><td>Less: Franking credits</td><td class="num">−${fmtMoney(t.franking)}</td></tr>
            <tr><td>Less: PAYG withheld</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.payg" value="${p.payg}"></div></td></tr>
            <tr><td>Less: Other credits</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-tax="${name}.otherCredit" value="${p.otherCredit}"></div></td></tr>
            <tr class="total"><td>Balance due / (refund)</td><td class="num" style="color: ${t.balance >= 0 ? 'var(--neg)' : 'var(--pos)'}">${fmtMoney(t.balance)}</td></tr>
            <tr><td>Effective tax rate</td><td class="num">${fmtPct(t.eff)}</td></tr>
          </tbody>
        </table>`;
    };
    const el1 = document.getElementById('tax-p1');
    const el2 = document.getElementById('tax-p2');
    if (el1) renderPanel(el1, state.tax.p1, d.t1, 'p1');
    if (el2) renderPanel(el2, state.tax.p2, d.t2, 'p2');
    document.querySelectorAll('[data-bind-attr="p1TaxHeader"]').forEach(el => el.textContent = `${state.p1Name} · FY26`);
    document.querySelectorAll('[data-bind-attr="p2TaxHeader"]').forEach(el => el.textContent = `${state.p2Name} · FY26`);

    // Set the disabled trust dist
    const t1Trust = document.querySelector('[data-tax="p1.trust"]');
    const t2Trust = document.querySelector('[data-tax="p2.trust"]');
    if (t1Trust) t1Trust.value = Math.round(d.trustAnnual * (+state.trustDist1||0)/100);
    if (t2Trust) t2Trust.value = Math.round(d.trustAnnual * (+state.trustDist2||0)/100);

    // Combined panel
    const cmb = document.getElementById('tax-combined');
    if (cmb) {
      const totalBal = d.t1.balance + d.t2.balance;
      cmb.innerHTML = `
        <div>
          <div class="label">Combined balance due</div>
          <div class="serif" style="font-size: 56px; line-height: 1; margin-top: 8px; color: ${totalBal >= 0 ? 'var(--neg)' : 'var(--pos)'}">${fmtMoney(totalBal)}</div>
        </div>
        <div class="grid col-2 gap-3" style="font-size: 13px;">
          <div><div class="muted" style="font-size: 11px;">Combined taxable</div><div class="mono" style="font-size: 18px;">${fmtMoney(d.t1.taxableIncome + d.t2.taxableIncome)}</div></div>
          <div><div class="muted" style="font-size: 11px;">Combined gross tax</div><div class="mono" style="font-size: 18px;">${fmtMoney(d.t1.grossTax + d.t2.grossTax)}</div></div>
          <div><div class="muted" style="font-size: 11px;">Combined effective</div><div class="mono" style="font-size: 18px;">${fmtPct((d.t1.grossTax+d.t2.grossTax)/Math.max(1,(d.t1.taxableIncome+d.t2.taxableIncome)))}</div></div>
          <div><div class="muted" style="font-size: 11px;">Combined PAYG</div><div class="mono" style="font-size: 18px;">${fmtMoney(d.t1.payg + d.t2.payg)}</div></div>
        </div>
        <div style="font-size: 12px; color: var(--ink-3); padding: 12px; background: var(--surface); border-radius: var(--radius);">
          <strong style="color: var(--ink); font-weight: 500;">Heads up.</strong> Trust distributions flow from Income — Person 1 / 2 split is set in Assumptions (currently ${state.trustDist1}% / ${state.trustDist2}%).
        </div>
      `;
    }

    setText('incomeAnnual', fmtMoneyShort(d.incomeAnnual));
    setText('incomeTrust', fmtMoneyShort(d.trustAnnual));
    setText('incomeRental', fmtMoneyShort(d.rentalAnnual));
  }

  function renderExpenses(d) {
    const tbody = document.querySelector('#exp-table tbody');
    if (!tbody) return;
    const FREQ = { week: 52, month: 12, quarter: 4, year: 1 };
    const COLS = ['week', 'month', 'quarter', 'year'];
    let html = '';
    state.expenses.forEach((g, gi) => {
      html += `<tr class="group-head">
        <td><input class="field text-input grouphead-input" type="text" data-expgroup="${gi}" value="${g.group}"></td>
        <td colspan="4"></td>
        <td class="num" style="text-align:right;"><button class="btn btn-ghost btn-sm" data-del-category="${gi}" title="Remove category">✕</button></td>
      </tr>`;
      g.items.forEach((it, ii) => {
        // migrate legacy {amount, freq} or {annual} → per-frequency fields
        if (it.week === undefined && it.month === undefined && it.quarter === undefined && it.year === undefined) {
          const legacyAmt = (it.amount != null ? +it.amount : (+it.annual || 0));
          const legacyFreq = it.freq || 'year';
          COLS.forEach(c => it[c] = 0);
          it[legacyFreq] = legacyAmt;
        }
        // annual = sum of every frequency column
        const annual = Math.round(COLS.reduce((s, c) => s + (+it[c] || 0) * FREQ[c], 0));
        it.annual = annual;
        const cell = (col) => `<td class="num"><input class="field" type="number" placeholder="—" data-exp-freq="${gi}.${ii}.${col}" value="${(+it[col]) ? it[col] : ''}"></td>`;
        html += `<tr>
          <td><input class="field text-input" type="text" data-exp="${gi}.${ii}.name" value="${it.name||''}"></td>
          ${COLS.map(cell).join('')}
          <td class="num exp-annual-cell"><strong>${fmtMoney(annual)}</strong><button class="btn btn-ghost btn-sm exp-del" data-del-exp-item="${gi}.${ii}" title="Remove line">✕</button></td>
        </tr>`;
      });
      const sub = g.items.reduce((s,it) => s + (+it.annual||0), 0);
      html += `<tr class="subtotal"><td colspan="5" style="text-align:right;">Subtotal — ${g.group}</td><td class="num">${fmtMoney(sub)}</td></tr>`;
      html += `<tr class="add-item-row"><td colspan="6"><button class="btn btn-ghost btn-sm" data-add-exp-item="${gi}">+ Add line to ${g.group}</button></td></tr>`;
    });
    html += `<tr class="add-cat-row"><td colspan="6"><button class="btn btn-secondary btn-sm" id="add-category">+ Add category</button></td></tr>`;
    tbody.innerHTML = html;

    setText('expHouseAnnual', fmtMoneyShort(d.expHouseAnnual));
    setText('expEntAnnual', fmtMoneyShort(d.expEntAnnual));
    setText('expWeekly', fmtMoney(d.expTotalAnnual / 52));

    // Spend mix — horizontal bar list that fills the card height
    const stack = document.getElementById('exp-stack');
    if (stack) {
      const groups = d.expByGroup.filter(g => g.total > 0).sort((a,b) => b.total - a.total);
      const total = groups.reduce((s,g) => s+g.total, 0);
      const palette = ['var(--primary)', 'var(--accent)', 'var(--primary-2)', 'var(--accent-2)', 'var(--ink-3)', 'var(--ink-4)', 'var(--primary)', 'var(--accent)'];
      // Benchmark mix — share of total household spend for a comparable
      // Australian household (ABS HES-style proportions), matched by keyword.
      const bench = (name) => {
        const n = name.toLowerCase();
        if (/grocer|food/.test(n)) return 0.17;
        if (/home|residence|rent|mortgage|utilit|rates|insurance/.test(n)) return 0.22;
        if (/vehicle|transport|car|fuel/.test(n)) return 0.13;
        if (/health|medical/.test(n)) return 0.06;
        if (/education|children|school/.test(n)) return 0.10;
        if (/entertainment|lifestyle|dining|holiday/.test(n)) return 0.13;
        if (/phone|internet|telecom/.test(n)) return 0.03;
        if (/stream|subscription/.test(n)) return 0.02;
        return 0.04;
      };
      const maxShare = Math.max(0.01, ...groups.map(g => Math.max(g.total/total, bench(g.group))));
      if (!groups.length) {
        stack.innerHTML = `<div class="empty-state" style="margin:auto;"><div class="emoji">📊</div><strong>No spend yet.</strong>Enter amounts on the left to see the mix.</div>`;
      } else {
        stack.innerHTML = groups.map((g, i) => {
          const share = total > 0 ? g.total/total : 0;
          const pct = share*100;
          const bpct = bench(g.group)*100;
          const w = (share/maxShare)*100;
          const bx = (bench(g.group)/maxShare)*100;
          const diff = pct - bpct;
          const cls = Math.abs(diff) < 1.5 ? 'inline' : diff > 0 ? 'over' : 'under';
          const tag = Math.abs(diff) < 1.5 ? 'on par' : `${diff>0?'+':'−'}${Math.abs(diff).toFixed(0)} pp vs avg`;
          return `<div class="spend-row">
            <div class="spend-row-top">
              <span class="spend-name"><span class="sw" style="background:${palette[i%palette.length]}"></span>${g.group}</span>
              <span class="spend-val mono">${fmtMoneyShort(g.total)} <span class="spend-pct">${pct.toFixed(0)}%</span></span>
            </div>
            <div class="spend-track" title="You ${pct.toFixed(0)}% · avg household ${bpct.toFixed(0)}%">
              <div class="spend-fill" style="width:${w.toFixed(1)}%; background:${palette[i%palette.length]}"></div>
              <div class="spend-bench" style="left:${bx.toFixed(1)}%" title="Average household: ${bpct.toFixed(0)}%"></div>
            </div>
            <div class="spend-meta spend-${cls}">${tag}</div>
          </div>`;
        }).join('');
        stack.insertAdjacentHTML('beforeend',
          `<div class="spend-key"><span class="spend-bench-key"></span> marker = average household with similar income</div>`);
      }
    }
  }

  function renderCashflow(d) {
    const tbl = document.getElementById('cashflow-table');
    if (!tbl) return;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Income — flat monthly
    const incMonthly = d.incomeAnnual / 12;
    // Expenses — distribute with seasonality (school terms quarterly, holidays Dec, etc.)
    const seasonHouse = [1,1,1.05,1,1,1,1.1,1,1,1,1,1.1];   // mild winter/Xmas
    const seasonEnt = [0.9,0.9,0.9,1,0.9,1,1.4,1,0.9,1.0,0.9,1.8]; // holidays in Dec
    const seasonDebt = Array(12).fill(1);
    const houseM = d.expHouseAnnual / 12;
    const entM = d.expEntAnnual / 12;
    const debtM = d.debtAll.rep;

    let html = `<thead><tr><th>Line</th>${months.map(m => `<th class="num">${m}</th>`).join('')}<th class="num">Annual</th></tr></thead><tbody>`;
    function row(label, monthly, season, posClass) {
      let total = 0;
      const cells = monthly === 0 ? months.map(() => 0)
        : season.map(s => Math.round(monthly * s));
      // re-normalize to keep annual ≈ monthly*12
      const sum = cells.reduce((a,b)=>a+b,0);
      const target = Math.round(monthly * 12);
      if (sum > 0) {
        const f = target / sum;
        for (let i=0; i<cells.length; i++) cells[i] = Math.round(cells[i] * f);
      }
      total = cells.reduce((a,b)=>a+b,0);
      return `<tr><td>${label}</td>${cells.map(v => `<td class="num ${posClass||''}">${v ? fmtMoney(v) : '—'}</td>`).join('')}<td class="num"><strong>${fmtMoney(total)}</strong></td></tr>`;
    }
    html += `<tr class="cat-head"><td colspan="14">Income</td></tr>`;
    html += row('Total income (smoothed)', incMonthly, Array(12).fill(1), 'pos');
    html += `<tr class="cat-head"><td colspan="14">Expenses</td></tr>`;
    html += row('Household', houseM, seasonHouse);
    html += row('Entertainment & lifestyle', entM, seasonEnt);
    html += row('Debt repayments', debtM, seasonDebt);
    // Net row
    const incCells = Array(12).fill(Math.round(incMonthly));
    const houseCells = seasonHouse.map(s => Math.round(houseM * s));
    const entCells = seasonEnt.map(s => Math.round(entM * s));
    const debtCells = Array(12).fill(Math.round(debtM));
    const net = incCells.map((v, i) => v - houseCells[i] - entCells[i] - debtCells[i]);
    html += `<tr class="cat-head"><td colspan="14">Net</td></tr>`;
    html += `<tr class="cf-net-row"><td><strong>Net cashflow</strong></td>${net.map(v => `<td class="num"><strong class="${v >= 0 ? 'pos' : 'neg'}">${fmtMoney(v)}</strong></td>`).join('')}<td class="num"><strong>${fmtMoney(net.reduce((a,b)=>a+b,0))}</strong></td></tr>`;
    // Running balance row (starts from emergency current as opening buffer)
    let bal = +state.emergencyCurrent || 0;
    const runBal = net.map(v => (bal += v));
    html += `<tr class="cf-bal-row"><td>Running balance</td>${runBal.map(v => `<td class="num ${v < 0 ? 'neg' : ''}">${fmtMoneyShort(v)}</td>`).join('')}<td class="num"></td></tr>`;
    html += `</tbody>`;
    tbl.innerHTML = html;

    // Shade detail cells by intensity
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td.num')].slice(0, 12);
      const vals = cells.map(c => Math.abs(parseFloat((c.textContent||'').replace(/[^0-9.-]/g,'')) || 0));
      const max = Math.max(1, ...vals);
      if (tr.classList.contains('cf-net-row') || tr.classList.contains('cf-bal-row')) return;
      cells.forEach((c, i) => {
        if (vals[i] > 0) c.style.background = `color-mix(in oklch, var(--primary) ${Math.round(vals[i]/max*16)}%, transparent)`;
      });
    });

    // ── Summary band ──
    const totalNet = net.reduce((a,b)=>a+b,0);
    setText('cfAvgSurplus', fmtMoney(Math.round(totalNet/12)));
    setText('cfSurplusNote', totalNet >= 0 ? 'surplus across the year' : 'shortfall across the year');
    const maxNet = Math.max(...net), minNet = Math.min(...net);
    const bestI = net.indexOf(maxNet), worstI = net.indexOf(minNet);
    setText('cfBest', months[bestI]); setText('cfBestVal', fmtMoney(maxNet));
    setText('cfWorst', months[worstI]); setText('cfWorstVal', fmtMoney(minNet));
    const minBal = Math.min(...runBal);
    setText('cfMinBal', fmtMoney(minBal));
    setText('cfMinBalNote', minBal < 0 ? '⚠ goes negative — needs buffer' : 'stays positive all year');
    document.querySelectorAll('[data-bind="cfMinBal"]').forEach(el => el.style.color = minBal < 0 ? 'var(--neg)' : 'var(--ink)');

    drawCashflowMonthChart(months, net, runBal);
  }

  function drawCashflowMonthChart(months, net, runBal) {
    const svg = document.getElementById('cashflow-chart');
    if (!svg) return;
    const W = svg.parentElement.getBoundingClientRect().width || 720;
    const H = 280, padX = 30, padTop = 20, padBot = 40;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const innerW = W - padX*2, innerH = H - padTop - padBot;
    const n = months.length;
    const bw = innerW / n * 0.56;
    const step = innerW / n;
    const maxNet = Math.max(1, ...net.map(Math.abs));
    const allBal = runBal.concat([0]);
    const balMin = Math.min(...allBal), balMax = Math.max(...allBal);
    const balSpan = Math.max(1, balMax - balMin);
    const zeroY = padTop + innerH * (maxNet / (maxNet*2)); // net baseline (centre)
    const netY = v => zeroY - (v / maxNet) * (innerH/2 - 4);
    const balY = v => padTop + innerH * (1 - (v - balMin) / balSpan);

    let bars = '', balPts = [], labels = '';
    net.forEach((v, i) => {
      const cx = padX + step*i + step/2;
      const y = netY(v);
      const h = Math.abs(y - zeroY);
      const col = v >= 0 ? 'var(--primary)' : 'var(--neg)';
      bars += `<rect x="${(cx-bw/2).toFixed(1)}" y="${(v>=0?y:zeroY).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="2" fill="${col}" opacity="0.85"><title>${months[i]}: ${fmtMoney(v)} net</title></rect>`;
      balPts.push(`${cx.toFixed(1)},${balY(runBal[i]).toFixed(1)}`);
      labels += `<text x="${cx.toFixed(1)}" y="${(H-padBot+18).toFixed(1)}" text-anchor="middle" class="label-tick">${months[i][0]}</text>`;
    });
    const balPath = 'M' + balPts.join(' L');
    const balDots = runBal.map((v,i) => { const cx = padX+step*i+step/2; return `<circle cx="${cx.toFixed(1)}" cy="${balY(v).toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.6"/>`; }).join('');

    // Hover hit-zones with crosshair + tooltip
    const fullMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let hits = '';
    net.forEach((v, i) => {
      const cx = padX + step*i + step/2;
      hits += `<rect class="cf-hit" x="${(padX+step*i).toFixed(1)}" y="${padTop}" width="${step.toFixed(1)}" height="${innerH.toFixed(1)}" fill="transparent" pointer-events="all" data-i="${i}"/>`;
    });

    svg.innerHTML = `
      <line x1="${padX}" y1="${zeroY.toFixed(1)}" x2="${W-padX}" y2="${zeroY.toFixed(1)}" stroke="var(--hair-c)"/>
      <line class="cf-cross" x1="0" y1="${padTop}" x2="0" y2="${(H-padBot).toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="2 3" stroke-width="1" style="display:none;"/>
      ${bars}
      <path d="${balPath}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${balDots}
      ${labels}
      ${hits}`;

    const cross = svg.querySelector('.cf-cross');
    svg.querySelectorAll('.cf-hit').forEach(rect => {
      const showFor = (e) => {
        const i = +rect.dataset.i;
        const cx = padX + step*i + step/2;
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = '';
        svg.querySelectorAll('rect[data-i]')?.forEach;
        const html = `<div class="tip-l">${fullMonths[i]}</div>`
          + `<div class="tip-v" style="color:${net[i]>=0?'var(--pos)':'var(--neg)'}">${net[i]>=0?'+':''}${fmtMoney(net[i])}</div>`
          + `<div class="tip-s">running balance ${fmtMoney(runBal[i])}</div>`;
        showChartTip(html, e);
      };
      rect.addEventListener('mouseenter', showFor);
      rect.addEventListener('mousemove', showFor);
      rect.addEventListener('mouseleave', () => { cross.style.display = 'none'; hideChartTip(); });
    });
  }

  // Shared lightweight chart tooltip (used by cashflow month chart)
  function showChartTip(html, evt) {
    let t = document.getElementById('cf-tip');
    if (!t) { t = document.createElement('div'); t.id = 'cf-tip'; t.className = 'chart-tip'; document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    const r = t.getBoundingClientRect();
    let x = evt.clientX + 14, y = evt.clientY - r.height - 14;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y < 8) y = evt.clientY + 18;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideChartTip() { const t = document.getElementById('cf-tip'); if (t) t.hidden = true; }

  function renderDebt(d) {
    function pmt(P, r, n) { const m = r/12/100; const N = n*12; if (m===0) return P/N; return P*m/(1-Math.pow(1+m,-N)); }
    document.querySelectorAll('.debt-table[data-debt]').forEach(tbl => {
      const which = tbl.dataset.debt;
      const arr = state.debt[which] || [];
      const tbody = tbl.querySelector('tbody');
      if (arr.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">
          <div class="empty-state">
            <div class="emoji">${which === 'investment' ? '🏘' : '🏠'}</div>
            <strong>No ${which === 'investment' ? 'investment' : 'private'} loans yet.</strong>
            Click "+ Add loan" above, or upload your upload template to populate from CSV.
          </div>
        </td></tr>`;
        return;
      }
      tbody.innerHTML = arr.map((l, i) => {
        const bal = +l.balance||0, rate = +l.rate||0, term = +l.term||0;
        const monInt = bal * rate / 100 / 12;
        const monRep = l.type === 'IO' ? monInt : pmt(bal, rate, term);
        return `
          <tr>
            <td><input class="field text-input" type="text" data-debt-input="${which}.${i}.name" value="${l.name||''}"></td>
            <td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="text" inputmode="numeric" data-debt-input="${which}.${i}.balance" value="${bal.toLocaleString('en-AU')}"></div></td>
            <td class="num"><div class="input-suffix" data-suffix="%"><input class="field" type="number" step="0.01" data-debt-input="${which}.${i}.rate" value="${rate}"></div></td>
            <td><select class="field" data-debt-input="${which}.${i}.type"><option value="P&I" ${l.type==='P&I'?'selected':''}>P&amp;I</option><option value="IO" ${l.type==='IO'?'selected':''}>IO</option></select></td>
            <td class="num"><input class="field" type="number" data-debt-input="${which}.${i}.term" value="${term}"></td>
            <td class="num">${fmtMoney(monInt)}</td>
            <td class="num"><strong>${fmtMoney(monRep)}</strong></td>
            <td><button class="btn btn-ghost btn-sm" data-debt-del="${which}.${i}" aria-label="Delete">×</button></td>
          </tr>`;
      }).join('');
      // Subtotal row
      const totBal = arr.reduce((s,l) => s + (+l.balance||0), 0);
      const totInt = arr.reduce((s,l) => s + (+l.balance||0)*(+l.rate||0)/100/12, 0);
      const totRep = arr.reduce((s,l) => {
        const monInt = (+l.balance||0)*(+l.rate||0)/100/12;
        return s + (l.type==='IO' ? monInt : pmt(+l.balance||0, +l.rate||0, +l.term||0));
      }, 0);
      tbody.insertAdjacentHTML('beforeend', `<tr class="subtotal"><td><strong>Subtotal — ${which === 'investment' ? 'investment' : 'private'}</strong></td><td class="num">${fmtMoney(totBal)}</td><td colspan="3"></td><td class="num">${fmtMoney(totInt)}</td><td class="num"><strong>${fmtMoney(totRep)}</strong></td><td></td></tr>`);
    });
    setText('debtTotal', fmtMoneyShort(d.debtAll.bal));
    setText('debtInterest', fmtMoney(d.debtAll.int));
    setText('debtRepay', fmtMoney(d.debtAll.rep));
  }

  function renderRental(d) {
    const root = document.getElementById('rental-grid');
    if (!root) return;
    if (!state.rental || state.rental.length === 0) {
      root.style.gridTemplateColumns = '1fr';
      root.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty-state">
        <div class="emoji">🏠</div>
        <strong>No rental properties yet.</strong>
        Add one when you're ready, or upload your upload template.
        <div class="actions">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('template-dl-btn')?.click()">↓ Get template</button>
        </div>
      </div></div></div>`;
      return;
    }
    root.style.gridTemplateColumns = 'repeat(2, 1fr)';
    root.innerHTML = state.rental.map((p, i) => {
      const rent = (+p.weeklyRent||0) * (+p.weeks||0);
      const exp = Object.values(p.expenses||{}).reduce((s,v) => s+(+v||0), 0);
      const net = rent - exp;
      const yourShare = net * ((+p.ownership||0)/100);
      return `
        <div class="panel">
          <div class="panel-head"><h2>Property ${i+1}</h2><span class="muted mono" style="font-size:11px;">${i+1}/${state.rental.length}</span></div>
          <div class="panel-body" style="padding: 0;">
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--hair-2);">
              <input class="field text-input field-text" type="text" placeholder="Address" data-rental="${i}.addr" value="${p.addr||''}" style="width:100%; height:36px;">
            </div>
            <table class="tbl" style="font-size:13px;">
              <tbody>
                <tr><td>Weekly rent</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.weeklyRent" value="${p.weeklyRent}"></div></td></tr>
                <tr><td>Weeks rented</td><td class="num"><input class="field" type="number" data-rental="${i}.weeks" value="${p.weeks}"></td></tr>
                <tr><td>Ownership %</td><td class="num"><input class="field" type="number" data-rental="${i}.ownership" value="${p.ownership}"></td></tr>
                <tr class="subtotal"><td>Annual rent received</td><td class="num">${fmtMoney(rent)}</td></tr>
                <tr class="group-head"><td colspan="2">Expenses (annual)</td></tr>
                <tr><td>Property agent</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.agent" value="${p.expenses.agent||0}"></div></td></tr>
                <tr><td>Council rates</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.rates" value="${p.expenses.rates||0}"></div></td></tr>
                <tr><td>Insurance</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.insurance" value="${p.expenses.insurance||0}"></div></td></tr>
                <tr><td>Interest on loan</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.interest" value="${p.expenses.interest||0}"></div></td></tr>
                <tr><td>Repairs &amp; maintenance</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.maint" value="${p.expenses.maint||0}"></div></td></tr>
                <tr><td>Water charges</td><td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-rental="${i}.expenses.water" value="${p.expenses.water||0}"></div></td></tr>
                <tr class="subtotal"><td>Total expenses</td><td class="num">${fmtMoney(exp)}</td></tr>
                <tr class="total"><td>Net profit / (loss)</td><td class="num" style="color: ${net >= 0 ? 'var(--pos)' : 'var(--neg)'}">${fmtMoney(net)}</td></tr>
                <tr><td>Your share (net)</td><td class="num">${fmtMoney(yourShare)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    }).join('');
    setText('rentTotal', fmtMoneyShort(d.rentalAgg.rent));
    setText('rentNet', fmtMoneyShort(d.rentalAgg.net));
    setText('rentShare', fmtMoneyShort(d.rentalAgg.share));
  }

  function renderGoals(d) {
    // Populate super + emergency input fields (they live on this tab but
    // are only auto-filled by renderAssumptions otherwise).
    document.querySelectorAll('[data-section="goals"] [data-input]').forEach(el => {
      const k = el.dataset.input;
      if (k in state && document.activeElement !== el) {
        el.value = el.dataset.numeric === '1' ? (+state[k]||0).toLocaleString('en-AU') : state[k];
      }
    });
    const root = document.getElementById('goals-list');
    if (!root) return;
    if (!state.goals || state.goals.length === 0) {
      root.innerHTML = `<div class="empty-state">
        <div class="emoji">🎯</div>
        <strong>No goals tracked yet.</strong>
        Add a target — an emergency fund, a deposit, a renovation — and we'll show you the monthly contribution to hit it.
        <div class="actions"><button class="btn btn-secondary btn-sm" id="add-goal-empty">+ Add your first goal</button></div>
      </div>`;
      const btn = document.getElementById('add-goal-empty');
      if (btn) btn.addEventListener('click', () => document.getElementById('add-goal')?.click());
    } else {
    root.innerHTML = state.goals.map((g, i) => {
      const pct = g.target > 0 ? Math.min(100, (g.current/g.target)*100) : 0;
      const remaining = Math.max(0, (+g.target||0) - (+g.current||0));
      const ms = g.deadline ? (new Date(g.deadline + '-01').getTime() - Date.now()) : 0;
      const monthsLeft = Math.max(1, Math.round(ms / (1000*60*60*24*30.4)));
      const required = remaining / monthsLeft;
      const onPace = required <= (+g.target||0)/24 * 1.2;
      const statusCls = pct >= 100 ? 'done' : onPace ? 'ok' : 'late';
      const statusTxt = pct >= 100 ? '✓ reached' : onPace ? '● on pace' : '▲ behind pace';
      return `
        <div class="goal-card">
          <div class="goal-card-head">
            <input class="goal-title-input" type="text" data-goal="${i}.name" value="${g.name||''}" placeholder="Goal name">
            <span class="goal-status ${statusCls}">${statusTxt}</span>
            <button class="goal-del-btn" data-goal-del="${i}" title="Remove goal" aria-label="Remove goal">✕</button>
          </div>
          <div class="goal-card-body">
            <label class="goal-field"><span>Target</span><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-goal="${i}.target" value="${g.target}"></div></label>
            <label class="goal-field"><span>Saved</span><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-goal="${i}.current" value="${g.current}"></div></label>
            <label class="goal-field"><span>Deadline</span><input class="field" type="month" data-goal="${i}.deadline" value="${g.deadline||''}"></label>
          </div>
          <div class="goal-progress">
            <div class="goal-bar"><div style="width:${pct.toFixed(1)}%"></div></div>
            <div class="goal-progress-meta">
              <span class="mono">${pct.toFixed(0)}% · ${fmtMoneyShort(remaining)} to go</span>
              <span class="mono muted">${pct >= 100 ? 'complete' : 'need ' + fmtMoneyShort(required) + '/mo · ' + monthsLeft + ' mo'}</span>
            </div>
          </div>
        </div>`;
    }).join('');
    }

    // ── Goals summary band ──
    const goals = state.goals || [];
    const totalSaved = goals.reduce((s,g) => s + (+g.current||0), 0);
    const totalTarget = goals.reduce((s,g) => s + (+g.target||0), 0);
    setText('goalsSaved', fmtMoney(totalSaved));
    setText('goalsSavedPct', (totalTarget>0 ? Math.round(totalSaved/totalTarget*100) : 0) + '% of targets');
    setText('goalsTarget', fmtMoney(totalTarget));
    setText('goalsCount', goals.length + (goals.length === 1 ? ' goal' : ' goals'));
    // On-pace count: required monthly ≤ a "natural pace" (target/24mo) proxy
    let onTrack = 0;
    goals.forEach(g => {
      const ms = g.deadline ? (new Date(g.deadline + '-01').getTime() - Date.now()) : 0;
      const monthsLeft = Math.max(1, Math.round(ms / (1000*60*60*24*30.4)));
      const required = Math.max(0, (+g.target||0) - (+g.current||0)) / monthsLeft;
      if (required <= (+g.target||0)/24 * 1.2) onTrack++;
    });
    setText('goalsOnTrack', `${onTrack} / ${goals.length}`);

    // Emergency fund
    const monthly = d.monthlyExpenses;
    const cur = +state.emergencyCurrent || 0;
    const tgt = +state.emergencyTarget || 1;
    const months = monthly > 0 ? (cur / monthly) : 0;
    setText('emergencyMonths', monthly > 0 ? months.toFixed(1) + ' months' : '— months');
    const fill = document.getElementById('emergency-fill');
    if (fill) {
      fill.style.width = Math.max(2, Math.min(100, months / 6 * 100)).toFixed(1) + '%';
      fill.style.background = months >= 6 ? 'var(--pos)' : months >= 3 ? 'var(--accent)' : 'var(--neg)';
    }
    const statusEl = months >= 6 ? ['Well covered', 'var(--pos)']
      : months >= 3 ? ['Adequate buffer', 'var(--accent)']
      : ['Below minimum', 'var(--neg)'];
    document.querySelectorAll('[data-bind="emergencyStatus"]').forEach(el => { el.textContent = statusEl[0]; el.style.color = statusEl[1]; });
    const shortfall = Math.max(0, (monthly * 3) - cur);
    setText('emergencyCaption', months >= 6
      ? `You could cover ${months.toFixed(1)} months of outgoings with no income.`
      : months >= 3
        ? `Solid. ${fmtMoneyShort(Math.max(0,(monthly*6)-cur))} more reaches the 6-month target.`
        : `Top up ${fmtMoneyShort(shortfall)} to reach the 3-month minimum buffer.`);

    // Super
    setText('superProjP1', fmtMoney(d.superProjP1));
    setText('superProjP2', fmtMoney(d.superProjP2));
    const gap1 = (+state.superTarget1||0) - d.superProjP1;
    const gap2 = (+state.superTarget2||0) - d.superProjP2;
    document.querySelectorAll('[data-bind="superGapP1"]').forEach(el => { el.textContent = fmtMoney(gap1); el.style.color = gap1 > 0 ? 'var(--neg)' : 'var(--pos)'; });
    document.querySelectorAll('[data-bind="superGapP2"]').forEach(el => { el.textContent = fmtMoney(gap2); el.style.color = gap2 > 0 ? 'var(--neg)' : 'var(--pos)'; });
    document.querySelectorAll('[data-bind-attr="p1SuperHead"]').forEach(el => el.textContent = state.p1Name);
    document.querySelectorAll('[data-bind-attr="p2SuperHead"]').forEach(el => el.textContent = state.p2Name);

    // Super summary + projection cards
    const projTotal = d.superProjP1 + d.superProjP2;
    const targetTotal = (+state.superTarget1||0) + (+state.superTarget2||0);
    setText('superProjTotal', fmtMoneyShort(projTotal));
    const gapTotal = targetTotal - projTotal;
    setText('superGapNote', gapTotal > 0 ? fmtMoneyShort(gapTotal) + ' below target' : fmtMoneyShort(-gapTotal) + ' above target');

    const superCards = document.getElementById('super-cards');
    if (superCards) {
      const people = [
        { name: state.p1Name, bal: +state.superP1||0, proj: d.superProjP1, target: +state.superTarget1||0, age: +state.ageP1||0, ret: +state.retP1||0 },
        { name: state.p2Name, bal: +state.superP2||0, proj: d.superProjP2, target: +state.superTarget2||0, age: +state.ageP2||0, ret: +state.retP2||0 }
      ];
      superCards.innerHTML = people.map(p => {
        const pct = p.target > 0 ? Math.min(100, p.proj/p.target*100) : 0;
        const ok = p.proj >= p.target;
        const yrs = Math.max(0, p.ret - p.age);
        return `<div class="super-card">
          <div class="super-card-head">
            <span class="super-name">${p.name}</span>
            <span class="super-yrs">${yrs} yrs to retirement</span>
          </div>
          <div class="super-figs">
            <div><div class="sl">Now</div><div class="sv mono">${fmtMoneyShort(p.bal)}</div></div>
            <div class="super-arrow">→</div>
            <div><div class="sl">Projected at ${p.ret}</div><div class="sv mono" style="color:var(--primary)">${fmtMoneyShort(p.proj)}</div></div>
          </div>
          <div class="super-bar"><div class="super-bar-fill" style="width:${pct.toFixed(0)}%; background:${ok?'var(--pos)':'var(--accent)'}"></div><div class="super-bar-target" title="ASFA comfortable target"></div></div>
          <div class="super-foot">${ok ? '✓ On track for ' : '▲ '}${fmtMoneyShort(p.target)} target${ok ? '' : ' — ' + fmtMoneyShort(p.target - p.proj) + ' short'}</div>
        </div>`;
      }).join('');
    }
  }

  function renderAssetsLiabs(d) {
    const tbl = document.querySelector('#al-table tbody');
    if (!tbl) return;
    if (!state.al || state.al.length === 0) {
      tbl.innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
          <div class="emoji">📈</div>
          <strong>No A&amp;L lines yet.</strong>
          Add a line — property, super, cash — and your net worth picture builds itself.
          <div class="actions">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('add-al')?.click()">+ Add first line</button>
          </div>
        </div>
      </td></tr>`;
    } else {
    tbl.innerHTML = state.al.map((r, i) => {
      const net = (+r.asset||0) - (+r.liab||0);
      return `
        <tr>
          <td><input class="field text-input" type="text" data-al="${i}.class" value="${r.class||''}"></td>
          <td><input class="field text-input" type="text" data-al="${i}.desc" value="${r.desc||''}"></td>
          <td><input class="field text-input" type="text" data-al="${i}.owner" value="${r.owner||''}"></td>
          <td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-al="${i}.asset" value="${r.asset||0}"></div></td>
          <td class="num"><div class="input-prefix" data-prefix="$"><input class="field" type="number" data-al="${i}.liab" value="${r.liab||0}"></div></td>
          <td class="num"><strong>${fmtMoney(net)}</strong></td>
          <td><button class="btn btn-ghost btn-sm" data-al-del="${i}">×</button></td>
        </tr>`;
    }).join('');
    }
    setText('alAssets', fmtMoneyShort(d.alAssets));
    setText('alLiabs', fmtMoneyShort(d.alLiabs));
    setText('alNet', fmtMoneyShort(d.alNet));
  }

  // ── RECALC + RERENDER ALL ───────────────────────────────────────
  // Capture the focused field so a rerender (which rebuilds table HTML)
  // doesn't drop the cursor mid-typing and leak digits to global shortcuts.
  function focusKey(el) {
    if (!el) return null;
    for (const a of ['data-inc','data-exp','data-exp-freq','data-input','data-tax','data-goal','data-al','data-debt-input','data-rental']) {
      if (el.hasAttribute(a)) return `[${a}="${el.getAttribute(a)}"]`;
    }
    return null;
  }
  // While the user is actively typing in a field, rebuilding that field's
  // table would reset the caret (you can't restore caret on type=number).
  // So on input we only refresh things OUTSIDE the active table (KPIs, charts),
  // and defer the full table rebuild to blur/change.
  function rerender(opts) {
    opts = opts || {};
    const ae = document.activeElement;
    const editing = opts.fromInput && ae && focusKey(ae);
    if (editing) {
      // Don't touch the DOM synchronously while the user is typing — it can
      // disturb the caret on number inputs. Debounce a KPI-only refresh that
      // never rebuilds the active table.
      scheduleLiveKpis();
      saveState();
      return;
    }
    _rerenderBody();
  }
  let _kpiTimer = null;
  function scheduleLiveKpis() {
    if (_kpiTimer) clearTimeout(_kpiTimer);
    _kpiTimer = setTimeout(() => {
      _kpiTimer = null;
      try { renderOverview(calcDerived()); } catch (e) {}
    }, 450);
  }
  function _rerenderBody() {
    const d = calcDerived();
    const active = document.querySelector('.dash-tab[data-active="true"]');
    const which = active ? active.dataset.tab : 'overview';
    // Always update overview KPIs (cheap), but only re-render the active tab heavy bits
    renderOverview(d);
    if (which === 'assumptions') renderAssumptions();
    if (which === 'income') renderIncome();
    if (which === 'tax') renderTax(d);
    if (which === 'expenses') renderExpenses(d);
    if (which === 'cashflow') renderCashflow(d);
    if (which === 'debt') renderDebt(d);
    if (which === 'rental') renderRental(d);
    if (which === 'goals') renderGoals(d);
    if (which === 'assets') renderAssetsLiabs(d);
    saveState();
  }

  // ── EVENT WIRING ───────────────────────────────────────────────
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const n = parts[i+1];
      if (!(k in o)) o[k] = /^\d+$/.test(n) ? [] : {};
      o = o[k];
    }
    o[parts[parts.length-1]] = value;
  }

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.matches('input, select')) return;
    const num = (v) => { if (typeof v === 'string') v = v.replace(/[,$\s]/g, ''); return v === '' ? 0 : (isNaN(+v) ? v : +v); };

    if (t.dataset.input) {
      const k = t.dataset.input;
      state[k] = (t.type === 'number' || t.dataset.numeric === '1') ? num(t.value) : t.value;
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.inc) {
      const [i, k] = t.dataset.inc.split('.');
      state.income[+i][k] = t.type === 'number' ? num(t.value) : t.value;
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.tax) {
      const [who, k] = t.dataset.tax.split('.');
      state.tax[who][k] = num(t.value);
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.exp) {
      const [gi, ii, k] = t.dataset.exp.split('.');
      state.expenses[+gi].items[+ii][k] = t.type === 'number' ? num(t.value) : t.value;
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.expFreq) {
      const [gi, ii, freq] = t.dataset.expFreq.split('.');
      const item = state.expenses[+gi].items[+ii];
      // Ensure all four frequency fields exist (migrate legacy on first edit)
      if (item.week === undefined && item.month === undefined && item.quarter === undefined && item.year === undefined) {
        const amt = (item.amount != null ? +item.amount : (+item.annual || 0));
        ['week','month','quarter','year'].forEach(c => item[c] = 0);
        item[item.freq || 'year'] = amt;
        delete item.amount; delete item.freq;
      }
      item[freq] = num(t.value);
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.expgroup) {
      state.expenses[+t.dataset.expgroup].group = t.value;
      saveState(); return;
    }
    if (t.dataset.debtInput) {
      const [which, i, k] = t.dataset.debtInput.split('.');
      state.debt[which][+i][k] = (k === 'name' || k === 'type') ? t.value : num(t.value);
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.rental) {
      setPath(state.rental, t.dataset.rental, t.type === 'number' ? num(t.value) : t.value);
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.goal) {
      const [i, k] = t.dataset.goal.split('.');
      state.goals[+i][k] = t.type === 'number' ? num(t.value) : t.value;
      rerender({ fromInput: true }); return;
    }
    if (t.dataset.al) {
      const [i, k] = t.dataset.al.split('.');
      state.al[+i][k] = (k === 'asset' || k === 'liab') ? num(t.value) : t.value;
      rerender({ fromInput: true }); return;
    }
  });

  // On blur, do a full rebuild so computed cells (annual totals, subtotals,
  // tables) catch up with what was typed.
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input, select, textarea') &&
        (t.dataset.input || t.dataset.inc || t.dataset.tax || t.dataset.exp ||
         t.dataset.expFreq || t.dataset.debtInput || t.dataset.rental ||
         t.dataset.goal || t.dataset.al)) {
      setTimeout(() => { if (typeof _rerenderBody === 'function') _rerenderBody(); }, 0);
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('select[data-debt-input]')) {
      const [which, i, k] = t.dataset.debtInput.split('.');
      state.debt[which][+i][k] = t.value;
      rerender();
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-add-debt]')) {
      const which = t.dataset.addDebt;
      state.debt[which].push({ name: 'New loan', balance: 0, rate: which === 'investment' ? 6.2 : 6.0, type: 'P&I', term: 30 });
      rerender(); return;
    }
    if (t.matches('[data-debt-del]')) {
      const [which, i] = t.dataset.debtDel.split('.');
      state.debt[which].splice(+i, 1); rerender(); return;
    }
    if (t.id === 'add-income') {
      state.income.push({ src: 'New source', trust: 0, p1: 0, p2: 0 });
      rerender(); return;
    }
    if (t.id === 'add-category') {
      state.expenses.push({ group: 'New category', items: [{ name: 'New line', amount: 0, freq: 'month', annual: 0 }] });
      rerender(); return;
    }
    if (t.dataset.addExpItem) {
      state.expenses[+t.dataset.addExpItem].items.push({ name: 'New line', amount: 0, freq: 'month', annual: 0 });
      rerender(); return;
    }
    if (t.dataset.delExpItem) {
      const [gi, ii] = t.dataset.delExpItem.split('.');
      state.expenses[+gi].items.splice(+ii, 1);
      if (state.expenses[+gi].items.length === 0) state.expenses.splice(+gi, 1);
      rerender(); return;
    }
    if (t.dataset.delCategory) {
      if (confirm('Remove this whole category and its lines?')) {
        state.expenses.splice(+t.dataset.delCategory, 1);
        rerender();
      }
      return;
    }
    if (t.id === 'add-goal') {
      state.goals.push({ name: 'New goal', target: 10000, current: 0, deadline: '2027-01' });
      rerender(); return;
    }
    if (t.matches('[data-goal-del]')) {
      state.goals.splice(+t.dataset.goalDel, 1); rerender(); return;
    }
    if (t.id === 'add-al') {
      state.al.push({ class: 'Other', desc: 'New asset', owner: 'Joint', asset: 0, liab: 0 });
      rerender(); return;
    }
    if (t.matches('[data-al-del]')) {
      state.al.splice(+t.dataset.alDel, 1); rerender(); return;
    }
    if (t.id === 'reset-btn') {
      if (confirm('Reset all data to the demo values?')) {
        localStorage.removeItem(LS); state = loadState(); rerender();
      }
      return;
    }
    if (t.id === 'export-btn') {
      window.print();
      return;
    }
    if (t.matches('[data-tab-link]')) {
      e.preventDefault();
      switchTab(t.dataset.tabLink);
    }
  });

  // ── TAB SWITCHING ───────────────────────────────────────────────
  const TAB_TITLES = {
    overview:    { ttl: 'Overview',         hint: 'live recalc' },
    assumptions: { ttl: 'Assumptions',      hint: 'master settings' },
    income:      { ttl: 'Income',           hint: 'net to bank' },
    tax:         { ttl: 'Tax estimator',    hint: 'FY26 · ATO' },
    expenses:    { ttl: 'Expenditure',      hint: 'household + lifestyle' },
    cashflow:    { ttl: 'Cashflow',         hint: '12-month calendar' },
    debt:        { ttl: 'Debt schedule',    hint: 'investment + private' },
    rental:      { ttl: 'Rental properties',hint: 'up to 4 properties' },
    goals:       { ttl: 'Goals & super',    hint: 'targets + retirement' },
    assets:      { ttl: 'Assets & liabilities', hint: 'net worth' }
  };
  function switchTab(name) {
    document.querySelectorAll('.dash-tab').forEach(b => b.dataset.active = String(b.dataset.tab === name));
    document.querySelectorAll('.section-view').forEach(s => s.dataset.active = String(s.dataset.section === name));
    const titleEl = document.getElementById('dash-section-title');
    if (titleEl) {
      const t = TAB_TITLES[name] || { ttl: 'Section', hint: '' };
      titleEl.innerHTML = `${t.ttl} <span class="ttl-hint">${t.hint}</span>`;
    }
    history.replaceState(null, '', '#' + name);
    rerender();
  }

  document.querySelectorAll('.dash-tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ── ONBOARDING BANNER ───────────────────────────────────────────
  const ONB_KEY = 'baobab.dashboard.onboarded';
  const onboardBanner = document.getElementById('onboarding-banner');
  function setOnboardingVisible(show) {
    if (onboardBanner) onboardBanner.hidden = !show;
  }
  function dismissOnboarding() {
    try { localStorage.setItem(ONB_KEY, '1'); } catch (e) {}
    setOnboardingVisible(false);
  }
  if (onboardBanner) {
    let onboarded;
    try { onboarded = localStorage.getItem(ONB_KEY); } catch (e) {}
    setOnboardingVisible(!onboarded);

    const closeBtn = document.getElementById('onboarding-close');
    if (closeBtn) closeBtn.addEventListener('click', dismissOnboarding);

    document.querySelectorAll('[data-onboard-action]').forEach(b => {
      b.addEventListener('click', () => {
        const action = b.dataset.onboardAction;
        if (action === 'template') {
          // Trigger the existing download flow
          const dl = document.getElementById('template-dl-btn');
          if (dl) dl.click();
        } else if (action === 'manual') {
          // Clear state to blank slate and jump to Assumptions
          if (confirm('Clear the demo data and start with a blank workbook?')) {
            localStorage.removeItem(LS);
            state = loadState();
            // Reset all collections to empty so the user truly starts blank
            state.income = [];
            state.expenses = [];
            state.debt = { investment: [], private: [] };
            state.rental = [];
            state.goals = [];
            state.al = [];
            saveState();
            switchTab('assumptions');
          }
        }
        // 'keep' → just dismiss the banner
        dismissOnboarding();
      });
    });
  }

  // Boot — pick tab from hash
  const initial = (location.hash || '#overview').replace('#','');
  const valid = ['overview','assumptions','income','tax','expenses','cashflow','debt','rental','goals','assets'];
  switchTab(valid.includes(initial) ? initial : 'overview');
})();
