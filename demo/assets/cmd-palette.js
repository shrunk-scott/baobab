/* Baobab — Command palette (⌘K) + global keyboard shortcuts.
 *
 *   ⌘K / Ctrl+K — open palette
 *   Esc — close palette
 *   1–9, 0 — jump to dashboard tab (when on dashboard)
 *   / — focus the palette filter
 *   ? — show shortcut cheatsheet
 *   E — export PDF   T — download template
 *
 * Commands are wired against whatever DOM controls exist on the page.
 * Missing controls = command silently no-ops, so this works across pages.
 */
(function () {
  'use strict';

  const TABS = [
    { id: 'overview',    label: 'Overview',         icon: '◐' },
    { id: 'assumptions', label: 'Assumptions',      icon: '⚙' },
    { id: 'income',      label: 'Income',           icon: '↗' },
    { id: 'tax',         label: 'Tax estimator',    icon: '%' },
    { id: 'expenses',    label: 'Expenditure',      icon: '−' },
    { id: 'cashflow',    label: 'Cashflow',         icon: '⇋' },
    { id: 'debt',        label: 'Debt schedule',    icon: '◇' },
    { id: 'rental',      label: 'Rental properties',icon: '⌂' },
    { id: 'goals',       label: 'Goals & super',    icon: '⊙' },
    { id: 'assets',      label: 'Assets & liabilities', icon: '∑' },
    { id: 'stress',      label: 'Stress test',      icon: '⚡' },
  ];

  function go(id) {
    const btn = document.querySelector(`.dash-tab[data-tab="${id}"]`);
    if (btn) btn.click();
    else if (location.pathname.endsWith('dashboard.html'))
      location.hash = '#' + id;
    else
      location.href = 'dashboard.html#' + id;
  }
  function clickId(id) { const e = document.getElementById(id); if (e) e.click(); }

  function buildCommands() {
    const cmds = [];
    TABS.forEach(t => cmds.push({
      group: 'Go to', key: 'go:' + t.id, title: t.label, hint: t.icon, run: () => go(t.id)
    }));
    cmds.push(
      { group: 'Actions', key: 'add-income',  title: 'Add income source',     hint: 'Income tab', run: () => { go('income'); setTimeout(() => clickId('add-income'), 100); } },
      { group: 'Actions', key: 'add-goal',    title: 'Add a savings goal',    hint: 'Goals tab',  run: () => { go('goals'); setTimeout(() => clickId('add-goal'), 100); } },
      { group: 'Actions', key: 'add-debt-i',  title: 'Add investment loan',   hint: 'Debt tab',   run: () => { go('debt'); setTimeout(() => document.querySelector('[data-add-debt="investment"]')?.click(), 100); } },
      { group: 'Actions', key: 'add-debt-p',  title: 'Add private loan',      hint: 'Debt tab',   run: () => { go('debt'); setTimeout(() => document.querySelector('[data-add-debt="private"]')?.click(), 100); } },
      { group: 'Actions', key: 'add-al',      title: 'Add A&L line',          hint: 'A&L tab',    run: () => { go('assets'); setTimeout(() => clickId('add-al'), 100); } },
      { group: 'File',    key: 'template-dl', title: 'Download template', hint: '↓ CSV',   run: () => clickId('template-dl-btn') },
      { group: 'File',    key: 'template-up', title: 'Upload template',   hint: '↑ CSV',   run: () => clickId('template-up-btn') },
      { group: 'File',    key: 'export',      title: 'Export PDF',        hint: '⇩ print',  run: () => clickId('export-btn') },
      { group: 'File',    key: 'reset',       title: 'Reset to demo data',    hint: '↺',         run: () => clickId('reset-btn') },
      { group: 'View',    key: 'palette-sage', title: 'Palette · Sage',       hint: 'theme',      run: () => clickPalette('sage') },
      { group: 'View',    key: 'palette-mineral', title: 'Palette · Mineral', hint: 'theme',      run: () => clickPalette('mineral') },
      { group: 'View',    key: 'palette-cloud', title: 'Palette · Cloud',     hint: 'theme',      run: () => clickPalette('cloud') },
      { group: 'View',    key: 'help',        title: 'Keyboard shortcuts',    hint: '?',          run: () => toggleHelp(true) },
    );
    return cmds;
  }

  function clickPalette(id) {
    const trig = document.querySelector('.bb-tweaks-trigger');
    if (trig && document.querySelector('.bb-tweaks-panel[hidden]')) trig.click();
    document.querySelector(`[data-palette="${id}"]`)?.click();
  }

  // ── Fuzzy match ─────────────────────────────────────────────────
  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    if (!q) return { score: 0, hit: [] };
    if (s.includes(q)) return { score: 1000 - s.indexOf(q), hit: [s.indexOf(q), q.length] };
    let qi = 0, last = -1, gaps = 0;
    const hits = [];
    for (let si = 0; si < s.length && qi < q.length; si++) {
      if (s[si] === q[qi]) {
        if (last !== -1 && si !== last + 1) gaps++;
        hits.push(si);
        last = si;
        qi++;
      }
    }
    if (qi < q.length) return null;
    return { score: 500 - gaps * 10 - hits[0], hit: null, hits };
  }

  // ── DOM ─────────────────────────────────────────────────────────
  let palEl, listEl, inputEl, cmds = [], visible = [], cursor = 0, open = false;

  function build() {
    if (palEl) return;
    palEl = document.createElement('div');
    palEl.className = 'cmd-palette';
    palEl.hidden = true;
    palEl.innerHTML = `
      <div class="cmd-backdrop" data-close></div>
      <div class="cmd-shell" role="dialog" aria-label="Command palette">
        <div class="cmd-head">
          <span class="cmd-kbd">⌘K</span>
          <input class="cmd-input" type="text" placeholder="Jump to a tab, add a row, change palette…" autocomplete="off" spellcheck="false">
          <span class="cmd-esc">esc</span>
        </div>
        <div class="cmd-list" role="listbox"></div>
        <div class="cmd-foot">
          <span><kbd>↑↓</kbd> nav</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(palEl);
    listEl = palEl.querySelector('.cmd-list');
    inputEl = palEl.querySelector('.cmd-input');
    palEl.querySelector('[data-close]').addEventListener('click', close);
    inputEl.addEventListener('input', () => { filter(inputEl.value); });
    inputEl.addEventListener('keydown', onKey);
    listEl.addEventListener('click', e => {
      const row = e.target.closest('.cmd-row');
      if (row) runIndex(+row.dataset.idx);
    });
    listEl.addEventListener('mousemove', e => {
      const row = e.target.closest('.cmd-row');
      if (row) setCursor(+row.dataset.idx);
    });
  }

  function setCursor(i) {
    cursor = Math.max(0, Math.min(visible.length - 1, i));
    listEl.querySelectorAll('.cmd-row').forEach((r, j) =>
      r.dataset.active = String(j === cursor)
    );
    const active = listEl.querySelector('.cmd-row[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function filter(q) {
    if (!cmds.length) cmds = buildCommands();
    const scored = cmds
      .map(c => ({ c, m: fuzzy(q, c.title) || (q ? null : { score: 0 }) }))
      .filter(x => x.m)
      .sort((a, b) => b.m.score - a.m.score);
    visible = scored.map(s => s.c);
    cursor = 0;
    let html = '';
    let lastGroup = null;
    visible.forEach((c, i) => {
      if (c.group !== lastGroup) {
        html += `<div class="cmd-group">${c.group}</div>`;
        lastGroup = c.group;
      }
      html += `<div class="cmd-row" data-idx="${i}" data-active="${i === 0}">
        <span class="cmd-row-title">${highlight(c.title, q)}</span>
        <span class="cmd-row-hint">${c.hint || ''}</span>
      </div>`;
    });
    if (!visible.length) html = `<div class="cmd-empty">No matches.</div>`;
    listEl.innerHTML = html;
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const t = text.toLowerCase(), qq = q.toLowerCase();
    let i = t.indexOf(qq);
    if (i >= 0) return escapeHtml(text.slice(0, i)) + '<mark>' + escapeHtml(text.slice(i, i + qq.length)) + '</mark>' + escapeHtml(text.slice(i + qq.length));
    return escapeHtml(text);
  }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function runIndex(i) {
    const c = visible[i];
    if (!c) return;
    close();
    setTimeout(() => c.run(), 50);
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runIndex(cursor); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function openPalette() {
    build();
    cmds = buildCommands();
    palEl.hidden = false;
    open = true;
    requestAnimationFrame(() => {
      palEl.classList.add('is-open');
      inputEl.value = '';
      inputEl.focus();
      filter('');
    });
  }
  function close() {
    if (!palEl || !open) return;
    palEl.classList.remove('is-open');
    open = false;
    setTimeout(() => { palEl.hidden = true; }, 180);
  }

  // ── Help cheatsheet ─────────────────────────────────────────────
  let helpEl;
  function toggleHelp(force) {
    if (!helpEl) {
      helpEl = document.createElement('div');
      helpEl.className = 'cmd-help';
      helpEl.hidden = true;
      helpEl.innerHTML = `
        <div class="cmd-backdrop" data-close></div>
        <div class="cmd-help-shell">
          <div class="cmd-help-head">
            <strong>Keyboard shortcuts</strong>
            <button class="cmd-help-close" aria-label="Close">×</button>
          </div>
          <dl class="cmd-help-grid">
            <dt><kbd>⌘</kbd>+<kbd>K</kbd></dt><dd>Open command palette</dd>
            <dt><kbd>/</kbd></dt><dd>Focus the search filter</dd>
            <dt><kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd></dt><dd>Jump to dashboard tab</dd>
            <dt><kbd>⌘</kbd>+<kbd>Z</kbd></dt><dd>Undo last edit</dd>
            <dt><kbd>T</kbd></dt><dd>Download template</dd>
            <dt><kbd>E</kbd></dt><dd>Export PDF</dd>
            <dt><kbd>?</kbd></dt><dd>This cheatsheet</dd>
            <dt><kbd>Esc</kbd></dt><dd>Close palette / dialog</dd>
          </dl>
        </div>`;
      document.body.appendChild(helpEl);
      helpEl.querySelector('.cmd-help-close').addEventListener('click', () => toggleHelp(false));
      helpEl.querySelector('[data-close]').addEventListener('click', () => toggleHelp(false));
    }
    const show = force == null ? helpEl.hidden : force;
    helpEl.hidden = !show;
  }

  // ── Global key shortcuts ────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    // ⌘K / Ctrl+K — always
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      open ? close() : openPalette();
      return;
    }
    if (open) return; // palette handles its own keys
    if (inField) return;

    // On the data-entry dashboard, bare keys must never hijack typing.
    const onDashboard = !!document.querySelector('.dash-app');

    // Tab quick-jump 1..9, 0 (=10) — only off the dashboard
    if (!onDashboard && /^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (TABS[idx]) { e.preventDefault(); go(TABS[idx].id); }
      return;
    }
    if (!onDashboard && e.key === '0' && TABS[9]) { e.preventDefault(); go(TABS[9].id); return; }
    if (e.key === '/') { e.preventDefault(); openPalette(); return; }
    if (e.key === '?') { e.preventDefault(); toggleHelp(); return; }
    if (!onDashboard && (e.key === 'e' || e.key === 'E')) { e.preventDefault(); clickId('export-btn'); return; }
    if (!onDashboard && (e.key === 't' || e.key === 'T')) { e.preventDefault(); clickId('template-dl-btn'); return; }
  });

  // Expose for other modules
  window.BaobabPalette = { open: openPalette, close, help: () => toggleHelp(true) };
})();
