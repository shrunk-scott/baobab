/* Kudz — Practice console pages (overview + client detail).
 * Reads window.AdminData + window.AdminUtil from admin.js.
 */
(function () {
  'use strict';
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(function () {
    const D = window.AdminData, U = window.AdminUtil;
    if (!D || !U) return;
    const { CLIENTS, TASKS, ACTIVITY } = D;
    const { fmtShort, fmtMoney, initials, statusPill, tierPill, moneyMonths } = U;
    const clientById = id => CLIENTS.find(c => c.id === id);

    // ════════════ OVERVIEW PAGE ════════════
    const ov = document.getElementById('admin-overview');
    if (ov) {
      // Hero summary line (kept in sync with data)
      const heroSub = ov.querySelector('#admin-hero-sub');
      if (heroSub) {
        const dueThisMonth = CLIENTS.filter(c => c.nextReview !== '—' && new Date(c.nextReview) <= new Date('2026-06-30')).length;
        heroSub.textContent = `${CLIENTS.length} households · ${dueThisMonth} reviews due this month · ${TASKS.length} open tasks across the practice.`;
      }
      // KPIs
      const aum = CLIENTS.reduce((s,c)=>s+c.netWorth,0);
      const mrr = CLIENTS.reduce((s,c)=>s+c.mrr,0);
      const active = CLIENTS.filter(c=>c.status==='active').length;
      const reviewsDue = CLIENTS.filter(c => c.nextReview !== '—' && new Date(c.nextReview) <= new Date('2026-06-30')).length;
      const kpis = [
        { l: 'Households', v: CLIENTS.length, d: `${active} active · ${CLIENTS.length-active} other`, spark: [6,7,7,8,9,10,11,12] },
        { l: 'Assets under advice', v: fmtShort(aum), d: '▲ +4.2% QoQ', spark: [5,5,6,6,7,8,8,9] },
        { l: 'Recurring revenue', v: fmtShort(mrr)+'/mo', d: `${fmtShort(mrr*12)} annualised`, spark: [4,5,5,6,6,7,8,9] },
        { l: 'Reviews due', v: reviewsDue, d: 'before 30 Jun', spark: [2,3,2,4,3,5,4,6] }
      ];
      const sparkSvg = (pts) => {
        const max = Math.max(...pts), min = Math.min(...pts), sp = Math.max(1,max-min);
        const d = pts.map((v,i)=>`${(i/(pts.length-1)*80).toFixed(1)},${(28-(v-min)/sp*24).toFixed(1)}`).join(' ');
        return `<svg class="spark" viewBox="0 0 80 30" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="var(--primary)" stroke-width="1.6"/></svg>`;
      };
      ov.querySelector('#admin-kpis').innerHTML = kpis.map(k => `
        <div class="kpi-card">
          <div class="l">${k.l}</div>
          <div class="v">${k.v}</div>
          <div class="d">${k.d}</div>
          ${sparkSvg(k.spark)}
        </div>`).join('');

      // Tasks (this week) — sorted by due
      const tasksSorted = [...TASKS].sort((a,b)=>new Date(a.due)-new Date(b.due));
      ov.querySelector('#admin-tasks').innerHTML = tasksSorted.slice(0,6).map(t => {
        const c = clientById(t.client) || {};
        return `<div class="t-row" data-go="${t.client}" style="grid-template-columns: 1fr auto auto;">
          <div class="primary-cell">
            <span class="avatar avatar-sm muted-bg">${initials(c.family||'?')}</span>
            <div class="meta-text"><span>${t.title}</span><span class="sub">${c.family} family · ${t.planner}</span></div>
          </div>
          <span class="pill pill-prio-${t.prio}">${t.prio}</span>
          <span class="t-due">${moneyMonths(t.due)}</span>
        </div>`;
      }).join('');

      // Activity
      ov.querySelector('#admin-activity').innerHTML = ACTIVITY.map(a => `
        <li>
          <div class="dot-col"><span class="ico ${a.byStaff?'staff':''}">${a.byStaff?initials(a.who):'•'}</span></div>
          <div class="body"><strong>${a.who}</strong> <span class="detail">${a.action} ${a.detail}</span><span class="client-tag">${(clientById(a.client)||{}).family||''}</span></div>
          <span class="when">${a.t}</span>
        </li>`).join('');

      // Client roster table
      renderRoster(ov.querySelector('#admin-roster'), CLIENTS);

      // Filter chips
      const chips = ov.querySelector('#admin-filters');
      if (chips) {
        chips.addEventListener('click', e => {
          const b = e.target.closest('.chip-btn'); if (!b) return;
          chips.querySelectorAll('.chip-btn').forEach(x=>x.dataset.active='false');
          b.dataset.active = 'true';
          const f = b.dataset.filter;
          const list = f === 'all' ? CLIENTS
            : f === 'review' ? CLIENTS.filter(c=>c.status==='review'||c.status==='onboarding')
            : CLIENTS.filter(c=>c.tier.toLowerCase()===f);
          renderRoster(ov.querySelector('#admin-roster'), list);
        });
      }
      // Search
      const search = ov.querySelector('#admin-search');
      if (search) search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        renderRoster(ov.querySelector('#admin-roster'), CLIENTS.filter(c => (c.family+' '+c.primary+' '+c.planner).toLowerCase().includes(q)));
      });
    }

    function renderRoster(host, list) {
      if (!host) return;
      const head = `<div class="t-row head" style="grid-template-columns: 2fr 1fr 1.4fr 1fr 1fr 1fr;">
        <span>Household</span><span>Tier</span><span class="t-cell-num">Net worth</span><span>Planner</span><span>Next review</span><span>Status</span></div>`;
      const rows = list.map(c => `
        <a class="t-row" href="admin-client.html?c=${c.id}" style="grid-template-columns: 2fr 1fr 1.4fr 1fr 1fr 1fr;">
          <div class="primary-cell">
            <span class="avatar avatar-sm">${initials(c.family)}</span>
            <div class="meta-text"><span>${c.family} family</span><span class="sub">${c.primary} · ${c.entities}</span></div>
          </div>
          <span>${tierPill(c.tier)}</span>
          <span class="t-cell-num">${fmtShort(c.netWorth)}</span>
          <span class="t-planner">${c.planner}</span>
          <span class="t-review">${moneyMonths(c.nextReview)}</span>
          <span>${statusPill(c.status)}</span>
        </a>`).join('');
      host.innerHTML = head + (rows || `<div class="empty-state"><strong>No matches.</strong></div>`);
    }

    // ════════════ CLIENTS PAGE ════════════
    const cp = document.getElementById('admin-clients-page');
    if (cp) {
      // Stat band
      const aum = CLIENTS.reduce((s,c)=>s+c.netWorth,0);
      const mrr = CLIENTS.reduce((s,c)=>s+c.mrr,0);
      const byTier = t => CLIENTS.filter(c=>c.tier===t).length;
      const stats = [
        ['Total households', CLIENTS.length, `${CLIENTS.filter(c=>c.status==='active').length} active`],
        ['Assets under advice', fmtShort(aum), 'across the book'],
        ['Recurring revenue', fmtShort(mrr)+'/mo', fmtShort(mrr*12)+' p.a.'],
        ['Tier mix', `${byTier('Bespoke')}·${byTier('Family')}·${byTier('Standard')}`, 'Bespoke · Family · Standard']
      ];
      cp.querySelector('#ac-stats').innerHTML = stats.map(([l,v,d])=>`<div class="kpi-card"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

      let current = [...CLIENTS];
      let sortDesc = true;
      const host = cp.querySelector('#admin-roster');
      const apply = () => {
        let list = [...current].sort((a,b)=> sortDesc ? b.netWorth-a.netWorth : a.netWorth-b.netWorth);
        renderRoster(host, list);
      };
      apply();
      const chips = cp.querySelector('#admin-filters');
      chips.addEventListener('click', e => {
        const b = e.target.closest('.chip-btn'); if (!b) return;
        chips.querySelectorAll('.chip-btn').forEach(x=>x.dataset.active='false');
        b.dataset.active='true';
        const f = b.dataset.filter;
        current = f==='all' ? [...CLIENTS]
          : f==='review' ? CLIENTS.filter(c=>c.status==='review'||c.status==='onboarding')
          : CLIENTS.filter(c=>c.tier.toLowerCase()===f);
        apply();
      });
      const search = cp.querySelector('#admin-search');
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        current = CLIENTS.filter(c => (c.family+' '+c.primary+' '+c.planner).toLowerCase().includes(q));
        apply();
      });
      const sortBtn = cp.querySelector('#ac-sort');
      sortBtn.addEventListener('click', () => { sortDesc = !sortDesc; sortBtn.textContent = 'Sort: Net worth ' + (sortDesc?'↓':'↑'); apply(); });
    }

    // ════════════ TASKS PAGE ════════════
    const tp = document.getElementById('admin-tasks-page');
    if (tp) {
      const stats = [
        ['Open tasks', TASKS.length, 'across the practice'],
        ['High priority', TASKS.filter(t=>t.prio==='high').length, 'need attention'],
        ['Due this week', TASKS.filter(t=>new Date(t.due)<=new Date('2026-06-06')).length, 'by 6 Jun'],
        ['Yours', TASKS.filter(t=>t.planner==='K. Mhishi').length, 'assigned to you']
      ];
      tp.querySelector('#at-stats').innerHTML = stats.map(([l,v,d])=>`<div class="kpi-card"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

      const board = tp.querySelector('#at-board');
      let plannerFilter = 'all';
      const soon = (due) => new Date(due) <= new Date('2026-06-06');
      const renderBoard = () => {
        const cols = [['high','High priority'],['medium','Medium'],['low','Low / scheduled']];
        board.innerHTML = cols.map(([key,label]) => {
          const items = TASKS.filter(t=>t.prio===key && (plannerFilter==='all'||t.planner===plannerFilter));
          return `<div class="at-col" data-col="${key}">
            <div class="at-col-head"><span class="ttl"><span class="dot"></span>${label}</span><span class="ct">${items.length}</span></div>
            <div class="at-list">
              ${items.length ? items.map(t => {
                const c = clientById(t.client)||{};
                return `<div class="at-card" data-go="${t.client}">
                  <div class="at-top"><span class="at-tag">${t.tag}</span><span class="at-due ${soon(t.due)?'soon':''}">${moneyMonths(t.due)}</span></div>
                  <div class="at-title">${t.title}</div>
                  <div class="at-foot">
                    <span class="avatar avatar-sm">${initials(c.family||'?')}</span>
                    <span class="at-client">${c.family} family</span>
                    <span class="at-planner">${t.planner}</span>
                  </div>
                </div>`;
              }).join('') : `<div class="empty-state" style="padding:18px;"><span class="note">Nothing here.</span></div>`}
            </div>
          </div>`;
        }).join('');
        board.querySelectorAll('.at-card[data-go]').forEach(card => card.addEventListener('click', () => location.href='admin-client.html?c='+card.dataset.go));
      };
      renderBoard();
      const chips = tp.querySelector('#at-filters');
      chips.addEventListener('click', e => {
        const b = e.target.closest('.chip-btn'); if (!b) return;
        chips.querySelectorAll('.chip-btn').forEach(x=>x.dataset.active='false');
        b.dataset.active='true'; plannerFilter = b.dataset.planner; renderBoard();
      });
      const add = tp.querySelector('#at-add');
      if (add) add.addEventListener('click', () => alert('New task — would open a task composer.'));
    }

    // ════════════ CLIENT DETAIL PAGE ════════════
    const cd = document.getElementById('admin-client');
    if (cd) {
      const id = new URLSearchParams(location.search).get('c') || 'jones';
      const c = clientById(id) || CLIENTS[0];
      document.title = `${c.family} family · Kudz Admin`;

      cd.querySelector('#cd-name').textContent = `${c.family} family`;
      cd.querySelector('#cd-sub').innerHTML = `${c.primary} · ${c.entities} · <strong>${c.planner}</strong>`;
      cd.querySelector('#cd-avatar').textContent = initials(c.family);
      cd.querySelector('#cd-status').innerHTML = statusPill(c.status) + ' ' + tierPill(c.tier);

      // Mini stats
      const liab = Math.round(c.netWorth * 0.34);
      cd.querySelector('#cd-mini').innerHTML = [
        ['Net worth', fmtShort(c.netWorth)],
        ['Est. liabilities', fmtShort(liab)],
        ['Fee', fmtShort(c.mrr)+'/mo'],
        ['Next review', moneyMonths(c.nextReview)]
      ].map(([l,v])=>`<div><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');

      // Flags
      const flagWrap = cd.querySelector('#cd-flags');
      if (c.flags && c.flags.length) flagWrap.innerHTML = c.flags.map(f=>`<span class="flag">${f}</span>`).join('');
      else flagWrap.innerHTML = `<span class="note">No open flags.</span>`;

      // Client tasks
      const ctasks = TASKS.filter(t=>t.client===c.id);
      cd.querySelector('#cd-tasks').innerHTML = ctasks.length ? ctasks.map(t=>`
        <div class="t-row" style="grid-template-columns: 1fr auto auto;">
          <div class="primary-cell"><div class="meta-text"><span>${t.title}</span><span class="sub">${t.planner} · ${t.tag}</span></div></div>
          <span class="pill pill-prio-${t.prio}">${t.prio}</span>
          <span class="t-due">${moneyMonths(t.due)}</span>
        </div>`).join('') : `<div class="empty-state" style="padding:20px;"><strong>No open tasks.</strong></div>`;

      // Client activity
      const cact = ACTIVITY.filter(a=>a.client===c.id);
      cd.querySelector('#cd-activity').innerHTML = (cact.length?cact:ACTIVITY.slice(0,4)).map(a=>`
        <li><div class="dot-col"><span class="ico ${a.byStaff?'staff':''}">${a.byStaff?initials(a.who):'•'}</span></div>
        <div class="body"><strong>${a.who}</strong> <span class="detail">${a.action} ${a.detail}</span></div>
        <span class="when">${a.t}</span></li>`).join('');

      // Schedule snapshot cards (synthesised from net worth)
      const nw = c.netWorth;
      const cards = [
        { n: '03 · Income', t: 'Annual income', v: fmtShort(Math.round(nw*0.11)), f: 'net to bank' },
        { n: '04 · Tax', t: 'Est. tax due', v: fmtShort(Math.round(nw*0.018)), f: 'FY26' },
        { n: '07 · Debt', t: 'Total debt', v: fmtShort(Math.round(nw*0.34)), f: 'inv + private' },
        { n: '09 · Super', t: 'Combined super', v: fmtShort(Math.round(nw*0.22)), f: 'projected' }
      ];
      cd.querySelector('#cd-schedules').innerHTML = cards.map(s=>`
        <div class="schedule-card">
          <div class="sc-head"><span class="sc-num">${s.n}</span></div>
          <div class="sc-title">${s.t}</div>
          <div class="sc-figure">${s.v}</div>
          <div class="sc-foot"><span>${s.f}</span><span>→</span></div>
        </div>`).join('');

      // Open portal button
      const openBtn = cd.querySelector('#cd-open-portal');
      if (openBtn) openBtn.addEventListener('click', () => { location.href = 'dashboard.html'; });
    }
  });
})();
