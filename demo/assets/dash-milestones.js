/* Kudz — Net-worth milestones + client notifications inbox.
 * Loaded on the dashboard after dash-fx.js / dashboard.js.
 */
(function () {
  'use strict';
  const LS = 'baobab.dashboard.v1';
  const MILE_KEY = 'baobab.milestones.v1';
  const NOTIF_SEEN = 'kudz.client.notif.seen.v1';

  const fmtShort = n => {
    if (!isFinite(n)) n = 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'm';
    if (a >= 1e3) return s + '$' + (a/1e3).toLocaleString('en-AU',{maximumFractionDigits:0}) + 'k';
    return s + '$' + Math.round(a).toLocaleString('en-AU');
  };

  // ── Milestones ──────────────────────────────────────────────────
  const TIERS = [
    { v: 500000,  label: 'Half a million' },
    { v: 1000000, label: 'First million' },
    { v: 2000000, label: '$2M net worth' },
    { v: 3000000, label: '$3M net worth' },
    { v: 5000000, label: '$5M net worth' },
    { v: 10000000,label: '$10M net worth' }
  ];
  function reached() { try { return JSON.parse(localStorage.getItem(MILE_KEY) || '[]'); } catch (e) { return []; } }
  function markReached(arr) { localStorage.setItem(MILE_KEY, JSON.stringify(arr)); }

  function currentNetWorth() {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || '{}');
      const a = (s.al||[]).reduce((x,r)=>x+(+r.asset||0),0);
      const l = (s.al||[]).reduce((x,r)=>x+(+r.liab||0),0);
      return a - l;
    } catch (e) { return 0; }
  }

  function celebrate(tier) {
    // Confetti from BaobabFX if available, else a local burst.
    const cx = window.innerWidth/2, cy = window.innerHeight*0.4;
    if (window.BaobabFX && window.BaobabFX.fireConfetti) {
      window.BaobabFX.fireConfetti(cx, cy);
      setTimeout(()=>window.BaobabFX.fireConfetti(cx-120, cy+30), 180);
      setTimeout(()=>window.BaobabFX.fireConfetti(cx+120, cy+30), 320);
    }
    const m = document.createElement('div');
    m.className = 'mile-pop';
    m.innerHTML = `
      <div class="mile-pop-card">
        <div class="mile-pop-badge">★</div>
        <div class="mile-pop-label">Milestone reached</div>
        <div class="mile-pop-title">${tier.label}</div>
        <div class="mile-pop-sub">Net worth just crossed ${fmtShort(tier.v)}. Logged to your timeline.</div>
        <button class="btn btn-primary btn-sm mile-pop-close">Wonderful</button>
      </div>`;
    document.body.appendChild(m);
    requestAnimationFrame(()=>m.classList.add('is-open'));
    const close = ()=>{ m.classList.remove('is-open'); setTimeout(()=>m.remove(),250); };
    m.querySelector('.mile-pop-close').onclick = close;
    m.addEventListener('click', e=>{ if(e.target===m) close(); });
    setTimeout(close, 6000);
  }

  function checkMilestones() {
    const nw = currentNetWorth();
    const done = reached();
    let changed = false;
    TIERS.forEach(t => {
      if (nw >= t.v && !done.includes(t.v)) {
        done.push(t.v); changed = true;
        // Only celebrate the highest newly-crossed tier to avoid a cascade on first load.
      }
    });
    if (changed) {
      const newlyHit = TIERS.filter(t => nw >= t.v && !reached().includes(t.v));
      markReached(done);
      // Celebrate the top one
      const top = TIERS.filter(t => nw >= t.v).pop();
      if (top && sessionStorage.getItem('mile-shown-'+top.v) !== '1') {
        sessionStorage.setItem('mile-shown-'+top.v, '1');
        setTimeout(()=>celebrate(top), 600);
      }
    }
  }
  // Seed on first ever load so we don't fire for already-passed tiers,
  // but DO fire when the user newly crosses one by editing.
  (function seed(){
    if (localStorage.getItem(MILE_KEY) === null) {
      const nw = currentNetWorth();
      markReached(TIERS.filter(t => nw >= t.v).map(t => t.v));
    }
  })();
  // Watch for edits that change net worth.
  let lastNW = currentNetWorth();
  const root = document.querySelector('.dash-content') || document.body;
  new MutationObserver(() => {
    const nw = currentNetWorth();
    if (Math.abs(nw - lastNW) > 1) { lastNW = nw; checkMilestones(); }
  }).observe(root, { subtree: true, childList: true, characterData: true });
  document.addEventListener('input', () => setTimeout(checkMilestones, 200));

  // ── Client notifications inbox ──────────────────────────────────
  const NOTIFS = [
    { id: 'c-tax',   ago: '2h',  from: 'Kudzai Mhishi', kind: 'planner', title: 'Tax estimate updated', body: 'I refreshed your FY26 estimate after the Q2 dividend — net saving about $3,100 if you top up super before 30 June.', cta: { label: 'Open Tax', tab: 'tax' } },
    { id: 'c-review',ago: '1d',  from: 'Kudz', kind: 'event', title: 'Q4 review in 3 days', body: 'Your quarterly review with Kudzai is on 14 Jul, 10:00 AM. Add it to your calendar.', cta: { label: 'View calendar', href: 'portal-calendar.html' } },
    { id: 'c-doc',   ago: '4d',  from: 'Kudzai Mhishi', kind: 'doc', title: 'FY25 return shared', body: 'Your lodged FY25 tax return is in your documents.', cta: { label: 'View documents', href: 'portal-documents.html' } },
    { id: 'c-goal',  ago: '1wk', from: 'Kudz', kind: 'insight', title: 'Holiday goal 43% funded', body: "You're slightly behind pace — lifting the monthly contribution by $230 keeps you on track for December.", cta: { label: 'View goals', tab: 'goals' } }
  ];
  function seenList() { try { return JSON.parse(localStorage.getItem(NOTIF_SEEN) || '[]'); } catch (e) { return []; } }

  function mountBell() {
    const tb = document.querySelector('.dash-toolbar');
    if (!tb || document.getElementById('kudz-bell')) return;
    // Remove the generic bell mounted by dash-features.js so we show ONE
    // bell with client-appropriate notifications.
    document.getElementById('bb-bell')?.remove();
    document.querySelectorAll('.bb-bell-panel').forEach(p => { if (p.id !== 'kudz-bell-panel') p.remove(); });
    const unseen = NOTIFS.filter(n => !seenList().includes(n.id)).length;
    const bell = document.createElement('button');
    bell.id = 'kudz-bell';
    bell.className = 'btn btn-secondary btn-sm bb-bell';
    bell.setAttribute('aria-label', 'Notifications');
    bell.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 6.5a4.5 4.5 0 1 1 9 0v3l1 2H2.5l1-2v-3z"/><path d="M6 13.5a2 2 0 0 0 4 0"/></svg><span class="bb-bell-badge" data-count="${unseen}">${unseen}</span>`;
    tb.insertBefore(bell, tb.firstChild);

    const panel = document.createElement('div');
    panel.className = 'bb-bell-panel'; panel.id = 'kudz-bell-panel'; panel.hidden = true;
    document.body.appendChild(panel);
    function render() {
      const seen = seenList();
      panel.innerHTML = `
        <div class="bb-bell-head"><strong>Inbox</strong><span class="bb-bell-sub">${NOTIFS.length} items</span><button class="bb-bell-mark">Mark all read</button></div>
        <div class="bb-bell-list">
          ${NOTIFS.map(n=>`<div class="bb-bell-item" data-unseen="${!seen.includes(n.id)}">
            <span class="bb-bell-mark-dot"></span>
            <div class="bb-bell-body">
              <div class="bb-bell-meta"><span class="bb-bell-from">${n.from}</span><span class="bb-bell-ago">${n.ago}</span></div>
              <div class="bb-bell-title">${n.title}</div>
              <div class="bb-bell-text">${n.body}</div>
              <button class="bb-bell-cta" data-tab="${n.cta.tab||''}" data-href="${n.cta.href||''}">${n.cta.label} →</button>
            </div></div>`).join('')}
        </div>
        <a class="bb-bell-foot" href="portal-messages.html">Message Kudzai →</a>`;
    }
    render();
    function close(){ panel.classList.remove('is-open'); setTimeout(()=>panel.hidden=true,180); }
    function position(){ const r = bell.getBoundingClientRect(); panel.style.top=(r.bottom+8)+'px'; panel.style.right=(window.innerWidth-r.right)+'px'; }
    bell.onclick = e => {
      e.stopPropagation();
      if (!panel.hidden) { close(); return; }
      position(); panel.hidden = false; requestAnimationFrame(()=>panel.classList.add('is-open'));
      localStorage.setItem(NOTIF_SEEN, JSON.stringify(NOTIFS.map(n=>n.id)));
      bell.querySelector('.bb-bell-badge').dataset.count='0';
      bell.querySelector('.bb-bell-badge').textContent='0';
    };
    document.addEventListener('click', e=>{ if(!panel.hidden && !panel.contains(e.target) && !bell.contains(e.target)) close(); });
    panel.addEventListener('click', e=>{
      const cta = e.target.closest('.bb-bell-cta');
      if (cta) {
        if (cta.dataset.tab) { document.querySelector(`.dash-tab[data-tab="${cta.dataset.tab}"]`)?.click(); close(); }
        else if (cta.dataset.href) location.href = cta.dataset.href;
      }
      if (e.target.closest('.bb-bell-mark')) { localStorage.setItem(NOTIF_SEEN, JSON.stringify(NOTIFS.map(n=>n.id))); render(); }
    });
    window.addEventListener('resize', ()=>{ if(!panel.hidden) position(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBell);
  else mountBell();
})();
