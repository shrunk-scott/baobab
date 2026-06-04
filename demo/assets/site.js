/* Baobab Consulting Portal — shared site script
 * Mounts nav + footer, applies palette, owns global tweak state.
 */

(function () {
  // ── Global state (palette + density) — shared across pages via localStorage
  const LS_KEY = 'baobab.tweaks.v1';

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "sage",
    "density": "comfy"
  }/*EDITMODE-END*/;

  function loadTweaks() {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return { ...TWEAK_DEFAULTS, ...stored };
    } catch { return { ...TWEAK_DEFAULTS }; }
  }
  function saveTweaks(t) {
    localStorage.setItem(LS_KEY, JSON.stringify(t));
  }
  function applyTweaks(t) {
    document.documentElement.dataset.palette = t.palette;
    document.documentElement.dataset.density = t.density;
  }

  // Apply immediately so we don't FOUC the wrong palette
  let tweaks = loadTweaks();
  applyTweaks(tweaks);

  // ── Nav data
  const NAV = [
    { href: 'index.html',       label: 'Home' },
    { href: 'services.html',    label: 'Services' },
    { href: 'methodology.html', label: 'Methodology' },
    { href: 'pricing.html',     label: 'Pricing' },
    { href: 'about.html',       label: 'About' },
    { href: 'contact.html',     label: 'Contact' }
  ];

  function currentPage() {
    const f = location.pathname.split('/').pop() || 'index.html';
    return f.replace(/^$/, 'index.html');
  }

  // ── Session ───────────────────────────────────────────────────
  // Treat presence of baobab.session as "signed in". Viewing the
  // dashboard implies a session in this prototype, so the nav never
  // shows "Try the dashboard" while you're actually in the app.
  const SESSION_KEY = 'baobab.session';
  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s) return s;
    } catch (e) {}
    if (/dashboard\.html$/.test(location.pathname)) {
      return { name: 'Lina Jones', email: 'lina@jonesfamilytrust.com.au', implicit: true };
    }
    return null;
  }
  function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function initials(name) {
    return (name || '?')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(p => p[0].toUpperCase()).join('') || '?';
  }

  function renderNav(target) {
    const cur = currentPage();
    const session = getSession();
    const cta = session ? `
      <div class="user-menu" id="user-menu" data-open="false">
        <button class="user-pill" id="user-pill" aria-haspopup="menu" aria-expanded="false">
          <span class="user-avatar">${session.avatar ? `<img src="${session.avatar}" alt="">` : initials(session.name)}</span>
          <span class="user-name">${session.name || 'Account'}</span>
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 5l3 3 3-3"/></svg>
        </button>
        <div class="user-popover" role="menu">
          <div class="user-popover-head">
            <span class="user-avatar lg">${session.avatar ? `<img src="${session.avatar}" alt="">` : initials(session.name)}</span>
            <div>
              <div class="upn">${session.name || 'Account'}</div>
              <div class="upe">${session.email || ''}</div>
            </div>
          </div>
          <a role="menuitem" href="dashboard.html">Open dashboard →</a>
          <a role="menuitem" href="portal-messages.html">Messages</a>
          <a role="menuitem" href="portal-calendar.html">Calendar</a>
          <a role="menuitem" href="portal-documents.html">Documents</a>
          <a role="menuitem" href="account.html">Account settings</a>
          <a role="menuitem" href="contact.html">Get help</a>
          <div class="user-popover-sep"></div>
          <a role="menuitem" href="#" data-signout>Sign out</a>
        </div>
      </div>
    ` : `
      <a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>
      <a href="register.html" class="btn btn-secondary btn-sm">Create account</a>
      <a href="dashboard.html" class="btn btn-primary btn-sm">Try the dashboard <span aria-hidden="true">→</span></a>
    `;

    target.innerHTML = `
      <nav class="site-nav" aria-label="Primary">
        <div class="site-nav-inner">
          <a class="brand" href="index.html" aria-label="Baobab Consulting home">
            <img class="brand-logo" src="${(window.__resources && window.__resources.brandLogo) || 'assets/baobab-logo-transparent.png'}" alt="Baobab Consulting" />
          </a>
          <div class="nav-links" role="menubar">
            ${NAV.map(n => `<a role="menuitem" href="${n.href}" class="${cur === n.href ? 'is-active' : ''}">${n.label}</a>`).join('')}
          </div>
          <div class="nav-cta">
            ${cta}
          </div>
          <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false" type="button">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div class="nav-drawer" id="nav-drawer" hidden>
          <div class="nav-drawer-links">
            ${NAV.map(n => `<a href="${n.href}" class="${cur === n.href ? 'is-active' : ''}">${n.label}</a>`).join('')}
          </div>
          <div class="nav-drawer-cta">
            ${session ? `
              <div class="nav-drawer-user">
                <span class="user-avatar">${session.avatar ? `<img src="${session.avatar}" alt="">` : initials(session.name)}</span>
                <div>
                  <div class="upn">${session.name || 'Account'}</div>
                  <div class="upe">${session.email || ''}</div>
                </div>
              </div>
              <a class="btn btn-secondary" href="dashboard.html">Open dashboard →</a>
              <a class="btn btn-ghost" href="#" data-signout-drawer>Sign out</a>
            ` : `
              <a class="btn btn-ghost" href="login.html">Sign in</a>
              <a class="btn btn-secondary" href="register.html">Create account</a>
              <a class="btn btn-primary" href="dashboard.html">Try the dashboard →</a>
            `}
          </div>
        </div>
      </nav>`;

    // Hamburger toggle
    const ham = target.querySelector('#nav-hamburger');
    const drawer = target.querySelector('#nav-drawer');
    if (ham && drawer) {
      ham.addEventListener('click', () => {
        const open = ham.getAttribute('aria-expanded') === 'true';
        ham.setAttribute('aria-expanded', String(!open));
        drawer.hidden = open;
        document.body.style.overflow = !open ? 'hidden' : '';
      });
      // Close drawer on link click
      drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        ham.setAttribute('aria-expanded', 'false');
        drawer.hidden = true;
        document.body.style.overflow = '';
      }));
      // Drawer sign-out wiring
      const so = drawer.querySelector('[data-signout-drawer]');
      if (so) so.addEventListener('click', (e) => { e.preventDefault(); setSession(null); location.href = 'index.html'; });
    }

    // Wire popover
    if (session) {
      const menu = target.querySelector('#user-menu');
      const pill = target.querySelector('#user-pill');
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.dataset.open === 'true';
        menu.dataset.open = String(!open);
        pill.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) { menu.dataset.open = 'false'; pill.setAttribute('aria-expanded', 'false'); }
      });
      target.querySelector('[data-signout]').addEventListener('click', (e) => {
        e.preventDefault();
        setSession(null);
        // Leave any implicit-session page (e.g. dashboard) so it can't re-create one.
        location.href = 'index.html';
      });
    }
  }

  function renderFooter(target) {
    target.innerHTML = `
      <footer class="site-footer">
        <div class="site-footer-grid">
          <div>
            <div class="brand" style="margin-bottom:14px">
              <span class="brand-mark"></span>
              <span class="brand-text">
                <span class="b1">Baobab</span>
                <span class="b2">Consulting</span>
              </span>
            </div>
            <p style="max-width:340px; margin:0; color:var(--ink-3); line-height:1.55">
              A modern household CFO for Australian families. Tax, cashflow, debt and super — modelled and managed in one place.
            </p>
          </div>
          <div>
            <h5>Portal</h5>
            <ul>
              <li><a href="dashboard.html">Dashboard</a></li>
              <li><a href="dashboard.html#income">Income</a></li>
              <li><a href="dashboard.html#tax">Tax estimator</a></li>
              <li><a href="dashboard.html#expenses">Household</a></li>
              <li><a href="dashboard.html#debt">Debt</a></li>
              <li><a href="dashboard.html#goals">Goals &amp; super</a></li>
            </ul>
          </div>
          <div>
            <h5>Firm</h5>
            <ul>
              <li><a href="about.html">About</a></li>
              <li><a href="methodology.html">Methodology</a></li>
              <li><a href="services.html">Services</a></li>
              <li><a href="pricing.html">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Terms of use</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Disclaimer</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-meta">
          <span>© 2026 Baobab Group of Companies. AFSL planning &amp; tax modelling — not financial product advice.</span>
          <span>FY 2025–26 · v1.4</span>
        </div>
      </footer>`;
  }

  // ── Tweaks panel (palette + density) — bottom-right floating
  function buildTweaksPanel() {
    if (document.getElementById('bb-tweaks')) return;
    const root = document.createElement('div');
    root.id = 'bb-tweaks';
    root.innerHTML = `
      <button class="bb-tweaks-trigger" aria-label="Open theme tweaks" title="Theme">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M12 3a4 4 0 0 1 4 4M12 21a4 4 0 0 0 4-4"/>
        </svg>
      </button>
      <div class="bb-tweaks-panel" role="dialog" aria-label="Theme tweaks" hidden>
        <div class="bb-tweaks-head">
          <span class="label">Theme</span>
          <button class="bb-tweaks-close" aria-label="Close">×</button>
        </div>
        <div class="bb-tweaks-body">
          <div class="bb-tweaks-section">
            <div class="bb-tweaks-section-title">Palette</div>
            <div class="bb-tweaks-swatches">
              ${[
                { id: 'sage',     name: 'Sage',     desc: 'Warm advisor', cols: ['#F5F1E8','#3D6B47','#B98A2B','#1F2A1E'] },
                { id: 'mineral',  name: 'Mineral',  desc: 'Luxe dark',    cols: ['#1C1F23','#8FB69A','#D6A24B','#ECECE8'] },
                { id: 'cloud',    name: 'Cloud',    desc: 'Airy fintech', cols: ['#FBFAF7','#0F4D3A','#C7522A','#14171A'] }
              ].map(p => `
                <button class="bb-swatch" data-palette="${p.id}" data-active="${tweaks.palette === p.id}">
                  <span class="bb-swatch-strip">
                    ${p.cols.map(c => `<span style="background:${c}"></span>`).join('')}
                  </span>
                  <span class="bb-swatch-meta">
                    <span class="bb-swatch-name">${p.name}</span>
                    <span class="bb-swatch-desc">${p.desc}</span>
                  </span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="bb-tweaks-section">
            <div class="bb-tweaks-section-title">Density</div>
            <div class="bb-tweaks-seg" role="radiogroup">
              <button data-density="comfy"   data-active="${tweaks.density === 'comfy'}">Comfortable</button>
              <button data-density="compact" data-active="${tweaks.density === 'compact'}">Compact</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);

    const trigger = root.querySelector('.bb-tweaks-trigger');
    const panel = root.querySelector('.bb-tweaks-panel');
    const close = root.querySelector('.bb-tweaks-close');

    trigger.addEventListener('click', () => {
      const open = !panel.hidden;
      panel.hidden = open;
      trigger.setAttribute('aria-expanded', String(!open));
    });
    close.addEventListener('click', () => { panel.hidden = true; });

    root.querySelectorAll('[data-palette]').forEach(b => {
      b.addEventListener('click', () => {
        tweaks = { ...tweaks, palette: b.dataset.palette };
        saveTweaks(tweaks); applyTweaks(tweaks);
        root.querySelectorAll('[data-palette]').forEach(x => x.dataset.active = String(x.dataset.palette === tweaks.palette));
      });
    });
    root.querySelectorAll('[data-density]').forEach(b => {
      b.addEventListener('click', () => {
        tweaks = { ...tweaks, density: b.dataset.density };
        saveTweaks(tweaks); applyTweaks(tweaks);
        root.querySelectorAll('[data-density]').forEach(x => x.dataset.active = String(x.dataset.density === tweaks.density));
      });
    });
  }

  // ── Return-to-top floating button
  function buildScrollTop() {
    if (document.getElementById('bb-scrolltop')) return;
    const btn = document.createElement('button');
    btn.id = 'bb-scrolltop';
    btn.className = 'bb-scrolltop';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const onScroll = () => { btn.dataset.show = String(window.scrollY > 400); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Scroll cue — animated "scroll for more" hint on marketing pages
  function buildScrollCue() {
    const f = (location.pathname.split('/').pop() || 'index.html');
    const marketing = ['index.html', 'services.html', 'methodology.html', 'pricing.html', 'about.html', 'contact.html'];
    if (!marketing.includes(f)) return;
    if (document.getElementById('bb-scrollcue')) return;
    const cue = document.createElement('div');
    cue.id = 'bb-scrollcue';
    cue.className = 'bb-scrollcue';
    cue.setAttribute('aria-hidden', 'true');
    cue.innerHTML = `<span class="bb-scrollcue-label">Scroll</span>
      <span class="bb-scrollcue-track"><span class="bb-scrollcue-dot"></span></span>`;
    document.body.appendChild(cue);
    const onScroll = () => { cue.dataset.hide = String(window.scrollY > 120); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Boot
  function boot() {
    const navMount = document.getElementById('site-nav');
    if (navMount) renderNav(navMount);
    const footMount = document.getElementById('site-footer');
    if (footMount) renderFooter(footMount);
    buildScrollTop();
    buildScrollCue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Expose for pages that want to read current settings
  window.BaobabSite = {
    getTweaks: () => ({ ...tweaks }),
    getSession,
    setSession,
    signOut: () => { setSession(null); const nav = document.getElementById('site-nav'); if (nav) renderNav(nav); }
  };
})();
