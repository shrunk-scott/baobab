/* Baobab — admin shell: nav, mock data, formatting helpers.
 * Mounts admin nav into #admin-nav. Exposes window.AdminData.
 */
(function () {
  'use strict';

  // ── Mock client roster ─────────────────────────────────────────
  const CLIENTS = [
    { id: 'jones',    family: 'Jones',     primary: 'Lina',     entities: 'Trust + 2 indiv',  tier: 'Family',   planner: 'K. Mhishi', netWorth: 2840000, mrr: 1200, status: 'active',   nextReview: '2026-07-14', flags: ['CGT-discount@30%'], lastActivity: '2h ago' },
    { id: 'patel',    family: 'Patel',     primary: 'Anika',    entities: 'SMSF + Co. + 2',   tier: 'Bespoke',  planner: 'K. Mhishi', netWorth: 6420000, mrr: 2800, status: 'active',   nextReview: '2026-06-04', flags: ['Div 293 watch'], lastActivity: '14m ago' },
    { id: 'nguyen',   family: 'Nguyen',    primary: 'Bao',      entities: 'Trust + 2 indiv',  tier: 'Family',   planner: 'D. Salas',  netWorth: 1980000, mrr: 1200, status: 'active',   nextReview: '2026-06-21', flags: [], lastActivity: '1d ago' },
    { id: 'whitlam',  family: 'Whitlam',   primary: 'Jocelyn',  entities: '2 indiv',          tier: 'Standard', planner: 'P. Lee',    netWorth: 1240000, mrr: 690,  status: 'active',   nextReview: '2026-09-02', flags: ['neg-gearing watch'], lastActivity: '3d ago' },
    { id: 'ito',      family: 'Ito',       primary: 'Haruki',   entities: 'SMSF + 2 indiv',   tier: 'Bespoke',  planner: 'K. Mhishi', netWorth: 9120000, mrr: 2800, status: 'review',   nextReview: '2026-05-30', flags: ['rebalance due'], lastActivity: '6h ago' },
    { id: 'okafor',   family: 'Okafor',    primary: 'Chukwudi', entities: '1 indiv',          tier: 'Standard', planner: 'P. Lee',    netWorth: 380000,  mrr: 690,  status: 'active',   nextReview: '2026-08-12', flags: [], lastActivity: '5d ago' },
    { id: 'macleod',  family: 'Macleod',   primary: 'Fiona',    entities: 'Trust + Co.',      tier: 'Bespoke',  planner: 'K. Mhishi', netWorth: 14200000, mrr: 3500, status: 'active',  nextReview: '2026-06-18', flags: [], lastActivity: '1h ago' },
    { id: 'singh',    family: 'Singh',     primary: 'Davinder', entities: 'Trust + 2 indiv',  tier: 'Family',   planner: 'D. Salas',  netWorth: 3120000, mrr: 1200, status: 'active',   nextReview: '2026-07-02', flags: [], lastActivity: '2d ago' },
    { id: 'pomeroy',  family: 'Pomeroy',   primary: 'Eden',     entities: '2 indiv',          tier: 'Standard', planner: 'P. Lee',    netWorth: 920000,  mrr: 690,  status: 'onboarding', nextReview: '2026-06-09', flags: ['intake wk 2'], lastActivity: '30m ago' },
    { id: 'ahmadi',   family: 'Ahmadi',    primary: 'Yasmin',   entities: 'SMSF + Co. + Trust', tier: 'Bespoke', planner: 'K. Mhishi', netWorth: 22400000, mrr: 4200, status: 'active',   nextReview: '2026-06-25', flags: ['Div 293', 'CGT pre-July'], lastActivity: '11m ago' },
    { id: 'kalmar',   family: 'Kalmar',    primary: 'Stefan',   entities: 'Trust + 2 indiv',  tier: 'Family',   planner: 'D. Salas',  netWorth: 1660000, mrr: 1200, status: 'paused',   nextReview: '—',          flags: ['paused since Mar'], lastActivity: '54d ago' },
    { id: 'wong',     family: 'Wong',      primary: 'Jia',      entities: '2 indiv + Co.',    tier: 'Family',   planner: 'D. Salas',  netWorth: 4080000, mrr: 1200, status: 'active',   nextReview: '2026-06-30', flags: [], lastActivity: '20h ago' }
  ];

  // ── Pipeline tasks (planner inbox) ─────────────────────────────
  const TASKS = [
    { id: 't1', client: 'ito',     title: 'SMSF rebalance — overweight property',   due: '2026-05-30', planner: 'K. Mhishi', prio: 'high',   tag: 'review' },
    { id: 't2', client: 'patel',   title: 'Div 293 strategy memo — pre-EOFY',        due: '2026-06-04', planner: 'K. Mhishi', prio: 'high',   tag: 'tax' },
    { id: 't3', client: 'ahmadi',  title: 'CGT pre-July sale — IP3 disposal plan',   due: '2026-06-10', planner: 'K. Mhishi', prio: 'high',   tag: 'tax' },
    { id: 't4', client: 'pomeroy', title: 'Onboarding — week 2 reconcile',           due: '2026-06-09', planner: 'P. Lee',   prio: 'medium', tag: 'onboarding' },
    { id: 't5', client: 'whitlam', title: 'Neg-gearing eligibility — IP1 review',    due: '2026-06-13', planner: 'P. Lee',   prio: 'medium', tag: 'tax' },
    { id: 't6', client: 'jones',   title: 'Q4 review prep — refresh portal data',    due: '2026-07-10', planner: 'K. Mhishi', prio: 'low',    tag: 'review' },
    { id: 't7', client: 'nguyen',  title: 'Refinance comparison — 3 lenders',        due: '2026-06-20', planner: 'P. Lee',   prio: 'medium', tag: 'debt' },
    { id: 't8', client: 'wong',    title: 'Trust distribution memo',                  due: '2026-06-28', planner: 'P. Lee',   prio: 'medium', tag: 'tax' },
    { id: 't9', client: 'macleod', title: 'Bucket company refresh',                   due: '2026-06-15', planner: 'K. Mhishi', prio: 'high',   tag: 'tax' }
  ];

  // ── Activity stream ────────────────────────────────────────────
  const ACTIVITY = [
    { t: '11m ago', who: 'Yasmin Ahmadi', action: 'updated', detail: 'A&L — added IP4 valuation $2.1m', client: 'ahmadi' },
    { t: '14m ago', who: 'Anika Patel',   action: 'opened',  detail: 'Tax Estimator — Q4', client: 'patel' },
    { t: '32m ago', who: 'P. Lee',        action: 'commented', detail: 'on Whitlam neg-gearing memo: "confirm pre-12-May date"', client: 'whitlam', byStaff: true },
    { t: '1h ago',  who: 'Fiona Macleod', action: 'uploaded', detail: 'tax_return_lodged_FY24.pdf', client: 'macleod' },
    { t: '2h ago',  who: 'Lina Jones',       action: 'updated',  detail: 'Income Planning — Q2 dividend confirmed $42k', client: 'jones' },
    { t: '4h ago',  who: 'K. Mhishi',     action: 'scheduled', detail: 'Ito SMSF review for 30 May 14:00', client: 'ito', byStaff: true },
    { t: '6h ago',  who: 'Haruki Ito',    action: 'opened',   detail: 'SMSF tab', client: 'ito' },
    { t: 'yesterday', who: 'Bao Nguyen',  action: 'completed', detail: 'goal: emergency fund — $48k reached', client: 'nguyen' }
  ];

  // ── Renderers ──────────────────────────────────────────────────
  const NAV = [
    { href: 'admin.html',          label: 'Overview',  key: 'overview', icon: '◐' },
    { href: 'admin-clients.html',  label: 'Clients',   key: 'clients',  icon: '◎' },
    { href: 'admin-tasks.html',    label: 'Tasks',     key: 'tasks',    icon: '☰' },
    { href: 'admin-calendar.html', label: 'Calendar',  key: 'calendar', icon: '▦' },
    { href: 'admin-messages.html', label: 'Messages',  key: 'messages', icon: '✉' },
    { href: 'admin-documents.html',label: 'Documents', key: 'docs',     icon: '▤' }
  ];

  function renderAdminNav(target) {
    target.innerHTML = `
      <nav class="site-nav admin-nav" aria-label="Admin">
        <div class="site-nav-inner">
          <a class="brand" href="admin.html" aria-label="Kudz admin">
            <img class="brand-logo" src="assets/baobab-logo-transparent.png" alt="Kudz" />
            <span class="admin-badge">Practice Console</span>
          </a>
          <div class="nav-cta">
            <button class="btn btn-secondary btn-sm" id="admin-search-btn" title="Search (⌘K)" aria-label="Search">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
              <span class="admin-search-hint">Search</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="admin-add" title="Add a client">+ Add client</button>
            <div class="user-menu" id="admin-user-menu" data-open="false">
              <button class="planner-pill" id="admin-user-pill" aria-haspopup="menu" aria-expanded="false">
                <span class="avatar avatar-sm">KM</span>
                <span class="who">Kudzai Mhishi · Director</span>
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 5l3 3 3-3"/></svg>
              </button>
              <div class="user-popover" role="menu">
                <div class="user-popover-head">
                  <span class="user-avatar lg">KM</span>
                  <div>
                    <div class="upn">Kudzai Mhishi</div>
                    <div class="upe">kudzai@kudz.com.au</div>
                  </div>
                </div>
                <a role="menuitem" href="account.html">Account settings</a>
                <a role="menuitem" href="admin.html">Practice overview</a>
                <div class="user-popover-sep"></div>
                <a role="menuitem" href="#" data-admin-signout>Sign out</a>
              </div>
            </div>
          </div>
        </div>
      </nav>`;
    const add = target.querySelector('#admin-add');
    if (add) add.addEventListener('click', () => alert('New client intake — would open the onboarding wizard.'));
    const sb = target.querySelector('#admin-search-btn');
    if (sb) sb.addEventListener('click', () => window.AdminSearch && window.AdminSearch.open());
    // User menu dropdown + sign out
    const menu = target.querySelector('#admin-user-menu');
    const pill = target.querySelector('#admin-user-pill');
    if (menu && pill) {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.dataset.open === 'true';
        menu.dataset.open = String(!open);
        pill.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) { menu.dataset.open = 'false'; pill.setAttribute('aria-expanded', 'false'); }
      });
      const so = menu.querySelector('[data-admin-signout]');
      if (so) so.addEventListener('click', (e) => {
        e.preventDefault();
        try { localStorage.removeItem('baobab.session'); localStorage.removeItem('kudz.role'); } catch (err) {}
        location.href = 'login.html';
      });
    }
  }

  function renderAdminSide(target) {
    const active = target.dataset.active || 'overview';
    const openTasks = (TASKS || []).length;
    target.innerHTML = `
      <aside class="admin-side">
        <nav class="admin-sidenav" aria-label="Sections">
          <div class="admin-sidenav-label">Practice</div>
          ${NAV.map(n => `<a href="${n.href}" class="admin-sidelink ${active===n.key?'is-active':''}"><span class="asl-ico">${n.icon}</span><span>${n.label}</span>${n.key==='tasks'?`<span class="asl-badge">${openTasks}</span>`:''}${n.key==='messages'?`<span class="asl-badge">2</span>`:''}</a>`).join('')}
        </nav>
        <div class="admin-side-foot">
          <div class="admin-side-card">
            <div class="asc-l">Practice health</div>
            <div class="asc-v">Strong</div>
            <div class="asc-bar"><div style="width:82%"></div></div>
            <div class="asc-note">82% of reviews on schedule</div>
          </div>
        </div>
      </aside>`;
  }

  // ── Formatting helpers ──────────────────────────────────────────
  function fmtShort(n) {
    if (!isFinite(n)) n = 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'm';
    if (a >= 1e3) return s + '$' + Math.round(a/1e3).toLocaleString('en-AU') + 'k';
    return s + '$' + Math.round(a).toLocaleString('en-AU');
  }
  function fmtMoney(n) { return (n<0?'−':'') + '$' + Math.round(Math.abs(n)).toLocaleString('en-AU'); }
  function initials(name) { return (name||'?').replace(/[^A-Za-z .]/g,'').split(/[ .]+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join(''); }
  function statusPill(s) {
    const map = { active: 'pill-active', review: 'pill-review', onboarding: 'pill-onboard', paused: 'pill-paused' };
    return `<span class="pill ${map[s]||''}"><span class="dot"></span>${s}</span>`;
  }
  function tierPill(t) {
    return `<span class="pill pill-tier-${t.toLowerCase()}">${t}</span>`;
  }
  const moneyMonths = (dateStr) => {
    if (!dateStr || dateStr === '—') return '—';
    const d = new Date(dateStr); if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  window.AdminUtil = { fmtShort, fmtMoney, initials, statusPill, tierPill, moneyMonths };

  function boot() {
    const navMount = document.getElementById('admin-nav');
    if (navMount) renderAdminNav(navMount);
    const sideMount = document.getElementById('admin-side');
    if (sideMount) renderAdminSide(sideMount);
    const footMount = document.getElementById('site-footer');
    if (footMount) {
      footMount.innerHTML = `
        <footer class="site-footer">
          <div class="footer-meta" style="border-top: 0; margin-top: 0;">
            <span>© 2026 Kudz Group of Companies · Practice Console v2.4</span>
            <span>Logged in as K. Mhishi · MFA OK · 2026-05-30 09:14 AEST</span>
          </div>
        </footer>`;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.AdminData = { CLIENTS, TASKS, ACTIVITY };
})();
