/* Baobab — Scenario A/B compare + Quarterly report generator.
 * Self-contained: reads state from localStorage, computes derived figures,
 * adds a "Compare" tool to the Stress test tab and a "Report" toolbar button.
 */
(function () {
  'use strict';
  const LS = 'baobab.dashboard.v1';
  const SCEN_KEY = 'baobab.scenarios.v1';
  const getState = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };

  const fmtMoney = n => (!isFinite(n) ? '$0' : (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-AU'));
  const fmtShort = n => {
    if (!isFinite(n)) n = 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'm';
    if (a >= 1e3) return s + '$' + (a/1e3).toLocaleString('en-AU', { maximumFractionDigits: 0 }) + 'k';
    return s + '$' + Math.round(a).toLocaleString('en-AU');
  };
  const fmtPct = n => (isFinite(n) ? (n*100).toFixed(1) + '%' : '—');

  // ── ATO FY26 tax (mirror of dashboard.js) ───────────────────────
  function ato(t){ if(t<=18200)return 0; if(t<=45000)return (t-18200)*0.16; if(t<=135000)return 4288+(t-45000)*0.30; if(t<=190000)return 31288+(t-135000)*0.37; return 51638+(t-190000)*0.45; }
  function lito(t){ if(t<=37500)return 700; if(t<=45000)return 700-(t-37500)*0.05; if(t<=66667)return 325-(t-45000)*0.015; return 0; }
  function pmt(P,r,n){ const m=r/12/100, N=n*12; if(m===0)return P/N; return P*m/(1-Math.pow(1+m,-N)); }

  // ── Compute the full derived snapshot from a state object ───────
  function derive(s) {
    const incM = (s.income||[]).reduce((a,r)=>{a.t+=+r.trust||0;a.p1+=+r.p1||0;a.p2+=+r.p2||0;return a;},{t:0,p1:0,p2:0});
    const incomeAnnual = (incM.t+incM.p1+incM.p2)*12;
    const trustAnnual = incM.t*12;
    const expByGroup = (s.expenses||[]).map(g=>({group:g.group,total:g.items.reduce((x,it)=>x+(+it.annual||0),0)}));
    const expHouse = expByGroup.filter(g=>!/entertainment/i.test(g.group)).reduce((x,g)=>x+g.total,0);
    const expEnt = expByGroup.filter(g=>/entertainment/i.test(g.group)).reduce((x,g)=>x+g.total,0);
    const expTotal = expHouse+expEnt;
    function taxFor(p,dist){ if(!p)return{bal:0,taxable:0,gross:0}; const trustShare=trustAnnual*(dist/100);
      const taxable=(+p.salary||0)+trustShare+(+p.consulting||0)+(+p.rental||0)+(+p.dividends||0)+(+p.franking||0)+(+p.otherInc||0)-((+p.workDed||0)+(+p.propDed||0)+(+p.ipDed||0)+(+p.otherDed||0));
      const gross=ato(taxable), l=lito(taxable), med=taxable>26000?taxable*0.02:0;
      const bal=gross-l+med-(+p.franking||0)-(+p.payg||0)-(+p.otherCredit||0);
      return {bal,taxable,gross}; }
    const t1=taxFor(s.tax&&s.tax.p1,+s.trustDist1||0), t2=taxFor(s.tax&&s.tax.p2,+s.trustDist2||0);
    const debtAll=[].concat(s.debt?.investment||[],s.debt?.private||[]);
    const debtBal=debtAll.reduce((x,l)=>x+(+l.balance||0),0);
    const debtRepay=debtAll.reduce((x,l)=>{const mi=(+l.balance||0)*(+l.rate||0)/100/12;return x+(l.type==='IO'?mi:pmt(+l.balance||0,+l.rate||0,+l.term||30));},0);
    const alAssets=(s.al||[]).reduce((x,r)=>x+(+r.asset||0),0);
    const alLiabs=(s.al||[]).reduce((x,r)=>x+(+r.liab||0),0);
    const netWorth=alAssets-alLiabs;
    const savings=incomeAnnual-expTotal-debtRepay*12;
    const savingsRate=incomeAnnual>0?savings/incomeAnnual:0;
    const dsr=incomeAnnual>0?(debtRepay*12)/incomeAnnual:0;
    const taxCombined=t1.bal+t2.bal;
    return { incomeAnnual, expTotal, savings, savingsRate, dsr, netWorth, alAssets, alLiabs, debtBal, taxCombined, expByGroup };
  }

  // ════════════════════════════════════════════════════════════════
  // QUARTERLY REPORT
  // ════════════════════════════════════════════════════════════════
  function buildReport() {
    const s = getState();
    const d = derive(s);
    const fam = s.familyName || 'Household';
    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const p1 = s.p1Name || 'Person 1', p2 = s.p2Name || 'Person 2';
    const expRows = d.expByGroup.filter(g=>g.total>0).sort((a,b)=>b.total-a.total)
      .map(g=>`<tr><td>${g.group}</td><td class="r">${fmtMoney(g.total)}</td></tr>`).join('');
    const goals = (s.goals||[]).map(g=>{
      const pct = g.target>0?Math.min(100,(g.current/g.target)*100):0;
      return `<tr><td>${g.name||''}</td><td class="r">${fmtMoney(g.current||0)} / ${fmtMoney(g.target||0)}</td>
        <td><div class="rep-bar"><div style="width:${pct.toFixed(0)}%"></div></div></td><td class="r">${pct.toFixed(0)}%</td></tr>`;
    }).join('');
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to generate the report.'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>${fam} — Quarterly Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');
        :root { --ink:#1F2A1E; --ink2:#3F4A3D; --ink3:#6B7367; --hair:#D8D2C2; --bg:#F5F1E8; --primary:#3D6B47; --accent:#B98A2B; --neg:#B0432B; --pos:#2F7A45; }
        * { box-sizing: border-box; }
        body { font-family:'Geist',sans-serif; color:var(--ink); margin:0; background:#fff; line-height:1.5; }
        .page { width: 794px; margin: 0 auto; padding: 56px 64px; }
        .num, .r { font-family:'Geist Mono',monospace; font-feature-settings:"tnum"; }
        .r { text-align: right; }
        .cover { border-bottom: 2px solid var(--ink); padding-bottom: 28px; margin-bottom: 36px; display:flex; justify-content:space-between; align-items:flex-end; }
        .cover .ey { font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink3); }
        .cover h1 { font-size:42px; font-weight:500; letter-spacing:-0.03em; margin:10px 0 0; }
        .cover .meta { text-align:right; font-size:12px; color:var(--ink3); font-family:'Geist Mono',monospace; line-height:1.7; }
        .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:40px; }
        .kpi { border:1px solid var(--hair); border-radius:10px; padding:16px; }
        .kpi .l { font-family:'Geist Mono',monospace; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink3); margin-bottom:8px; }
        .kpi .v { font-family:'Geist Mono',monospace; font-size:24px; font-weight:500; letter-spacing:-0.02em; }
        section { margin-bottom: 36px; page-break-inside: avoid; }
        h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.1em; color:var(--ink2); border-bottom:1px solid var(--hair); padding-bottom:8px; margin:0 0 14px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        td { padding:8px 4px; border-bottom:1px solid #ECE6D7; }
        .rep-bar { height:5px; background:#ECE6D7; border-radius:3px; overflow:hidden; min-width:120px; }
        .rep-bar div { height:100%; background:var(--primary); }
        .note { background:var(--bg); border-left:3px solid var(--accent); padding:14px 18px; font-size:13px; color:var(--ink2); border-radius:0 8px 8px 0; }
        .foot { margin-top:48px; padding-top:18px; border-top:1px solid var(--hair); font-size:11px; color:var(--ink3); font-family:'Geist Mono',monospace; display:flex; justify-content:space-between; }
        .actions { position:fixed; top:16px; right:16px; display:flex; gap:8px; }
        .actions button { font-family:'Geist',sans-serif; font-size:13px; padding:8px 16px; border-radius:8px; border:1px solid var(--ink); background:var(--ink); color:#fff; cursor:pointer; }
        .actions button.ghost { background:#fff; color:var(--ink); }
        @media print { .actions { display:none; } .page { padding: 0; } body { background:#fff; } @page { margin: 18mm; } }
      </style></head><body>
      <div class="actions">
        <button onclick="window.print()">Save as PDF</button>
        <button class="ghost" onclick="window.close()">Close</button>
      </div>
      <div class="page">
        <div class="cover">
          <div><div class="ey">Quarterly Planning Report · FY 2025–26</div><h1>${fam} family</h1></div>
          <div class="meta">Baobab Consulting<br>Prepared ${today}<br>Commercial in confidence</div>
        </div>

        <div class="kpis">
          <div class="kpi"><div class="l">Net worth</div><div class="v">${fmtShort(d.netWorth)}</div></div>
          <div class="kpi"><div class="l">Annual income</div><div class="v">${fmtShort(d.incomeAnnual)}</div></div>
          <div class="kpi"><div class="l">Savings rate</div><div class="v">${fmtPct(d.savingsRate)}</div></div>
          <div class="kpi"><div class="l">Tax (combined est.)</div><div class="v">${fmtShort(d.taxCombined)}</div></div>
        </div>

        <section>
          <h2>Position summary</h2>
          <table>
            <tr><td>Total assets</td><td class="r">${fmtMoney(d.alAssets)}</td></tr>
            <tr><td>Total liabilities</td><td class="r">${fmtMoney(d.alLiabs)}</td></tr>
            <tr><td><strong>Net worth</strong></td><td class="r"><strong>${fmtMoney(d.netWorth)}</strong></td></tr>
            <tr><td>Annual net cashflow</td><td class="r" style="color:${d.savings>=0?'var(--pos)':'var(--neg)'}">${fmtMoney(d.savings)}</td></tr>
            <tr><td>Debt service ratio</td><td class="r">${fmtPct(d.dsr)}</td></tr>
            <tr><td>Total debt balance</td><td class="r">${fmtMoney(d.debtBal)}</td></tr>
          </table>
        </section>

        <section>
          <h2>Expenditure breakdown</h2>
          <table>${expRows || '<tr><td colspan="2" style="color:var(--ink3)">No expenditure recorded.</td></tr>'}</table>
        </section>

        <section>
          <h2>Goal progress</h2>
          <table>${goals || '<tr><td colspan="4" style="color:var(--ink3)">No goals tracked.</td></tr>'}</table>
        </section>

        <section>
          <h2>Planner notes</h2>
          <div class="note"><strong>Kudzai Mhishi — ${today}:</strong> ${fam} is tracking ${d.savingsRate>=0.2?'ahead of':'behind'} the 20% savings-rate target. Priority for next quarter: confirm trust distribution split (currently ${s.trustDist1||0}% / ${s.trustDist2||0}%) before EOFY and review investment-loan fixed/variable mix against current rates.</div>
        </section>

        <div class="foot"><span>© 2026 Baobab Group of Companies · Planning &amp; modelling only — not financial product advice.</span><span>${fam} · FY26 · Q4</span></div>
      </div>
      </body></html>`);
    win.document.close();
  }

  // ════════════════════════════════════════════════════════════════
  // SCENARIO A/B COMPARE — mounts inside the Stress test section
  // ════════════════════════════════════════════════════════════════
  function readScenarios(){ try { return JSON.parse(localStorage.getItem(SCEN_KEY)||'{}'); } catch(e){ return {}; } }
  function writeScenarios(o){ localStorage.setItem(SCEN_KEY, JSON.stringify(o)); }

  function mountCompare() {
    const stressSection = document.querySelector('[data-section="stress"]');
    if (!stressSection || document.getElementById('bb-compare')) return false;
    const wrap = document.createElement('div');
    wrap.className = 'panel'; wrap.id = 'bb-compare';
    wrap.style.marginTop = '14px';
    wrap.innerHTML = `
      <div class="panel-head">
        <h2>Scenario compare · A / B</h2>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" data-save="A">Save as A</button>
          <button class="btn btn-secondary btn-sm" data-save="B">Save as B</button>
          <button class="btn btn-ghost btn-sm" data-clear>Clear</button>
        </div>
      </div>
      <div class="panel-body"><div id="bb-compare-body"></div></div>`;
    stressSection.appendChild(wrap);
    wrap.querySelector('[data-save="A"]').addEventListener('click', () => saveScenario('A'));
    wrap.querySelector('[data-save="B"]').addEventListener('click', () => saveScenario('B'));
    wrap.querySelector('[data-clear]').addEventListener('click', () => { writeScenarios({}); renderCompare(); });
    renderCompare();
    return true;
  }

  function currentStressLabel() {
    const sec = document.querySelector('[data-section="stress"]');
    if (!sec) return 'live';
    const vals = [...sec.querySelectorAll('.bb-stressor')].map(r => r.querySelector('.bb-stressor-val')?.textContent.trim());
    return vals.filter(Boolean).join(' · ') || 'baseline';
  }

  function saveScenario(slot) {
    const scen = readScenarios();
    const d = derive(getState());
    // capture current stress readouts from the DOM (already computed by dash-features)
    const sec = document.querySelector('[data-section="stress"]');
    const grab = sel => sec?.querySelector(sel)?.textContent.trim() || '—';
    scen[slot] = {
      label: currentStressLabel(),
      savedAt: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      netWorth: d.netWorth,
      income: d.incomeAnnual,
      savings: d.savings,
      savingsRate: d.savingsRate,
      dsr: d.dsr,
      tax: d.taxCombined,
      stressCF: grab('#bb-stress-cf'),
      stressRW: grab('#bb-stress-rw'),
      stressDSR: grab('#bb-stress-dsr')
    };
    writeScenarios(scen);
    renderCompare();
  }

  function renderCompare() {
    const body = document.getElementById('bb-compare-body');
    if (!body) return;
    const scen = readScenarios();
    const A = scen.A, B = scen.B;
    if (!A && !B) {
      body.innerHTML = `<div class="empty-state"><div class="emoji">⚖</div><strong>No saved scenarios yet.</strong>
        Set the stressors above, then "Save as A". Adjust them, "Save as B", and compare side by side.</div>`;
      return;
    }
    const rows = [
      ['Net worth', s => fmtShort(s.netWorth), 'netWorth', true],
      ['Annual income', s => fmtShort(s.income), 'income', true],
      ['Net cashflow', s => fmtMoney(s.savings), 'savings', true],
      ['Savings rate', s => fmtPct(s.savingsRate), 'savingsRate', true],
      ['Debt service', s => fmtPct(s.dsr), 'dsr', false],
      ['Tax (combined)', s => fmtShort(s.tax), 'tax', false],
      ['Stressed cashflow', s => s.stressCF, null, null],
      ['Months runway', s => s.stressRW, null, null],
      ['Stressed DSR', s => s.stressDSR, null, null],
    ];
    const cell = (sc) => sc ? `<div class="cmp-col-head"><span class="cmp-slot">${sc===A?'A':'B'}</span><span class="cmp-lbl">${sc.label}</span><span class="cmp-time">saved ${sc.savedAt}</span></div>` : `<div class="cmp-col-head cmp-empty-col">— not saved —</div>`;
    let html = `<div class="cmp-grid"><div class="cmp-metric-head">Metric</div>${cell(A)}${cell(B)}</div>`;
    rows.forEach(([label, fn, key, higherBetter]) => {
      const av = A ? fn(A) : '—', bv = B ? fn(B) : '—';
      let delta = '';
      if (A && B && key != null && typeof A[key] === 'number') {
        const diff = B[key] - A[key];
        if (Math.abs(diff) > 0.0001) {
          const good = higherBetter ? diff > 0 : diff < 0;
          const disp = (key === 'savingsRate' || key === 'dsr') ? (diff*100).toFixed(1) + ' pp' : fmtShort(diff);
          delta = `<span class="cmp-delta ${good ? 'good' : 'bad'}">${diff>0?'▲':'▼'} ${disp.replace('−','')}</span>`;
        }
      }
      html += `<div class="cmp-grid cmp-row">
        <div class="cmp-metric">${label}</div>
        <div class="cmp-val">${av}</div>
        <div class="cmp-val">${bv} ${delta}</div>
      </div>`;
    });
    body.innerHTML = html;
  }

  // ── Wire report button into the toolbar ─────────────────────────
  function mountReportButton() {
    const tb = document.querySelector('.dash-toolbar');
    if (!tb || document.getElementById('bb-report-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'bb-report-btn';
    btn.className = 'btn btn-secondary btn-sm';
    btn.title = 'Generate a printable quarterly report';
    btn.innerHTML = '◰ Report';
    // place before export
    const exp = document.getElementById('export-btn');
    tb.insertBefore(btn, exp || null);
    btn.addEventListener('click', buildReport);
  }

  // Boot — stress section is created by dash-features.js; retry until present.
  function boot() {
    mountReportButton();
    let tries = 0;
    const iv = setInterval(() => {
      if (mountCompare() || ++tries > 40) clearInterval(iv);
    }, 150);
    // Re-render compare whenever the stress tab is opened
    document.addEventListener('click', e => {
      if (e.target.closest('.dash-tab[data-tab="stress"]')) setTimeout(renderCompare, 60);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.BaobabReport = { generate: buildReport };
})();
