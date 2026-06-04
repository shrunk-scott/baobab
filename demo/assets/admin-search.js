/* Kudz — Admin global search (⌘K / Ctrl+K). Searches clients, tasks,
 * sections and documents from AdminData. Mounts on any admin page. */
(function () {
  'use strict';
  if (!/admin/.test(location.pathname)) return;

  const SECTIONS = [
    { label: 'Overview', href: 'admin.html' },
    { label: 'Clients', href: 'admin-clients.html' },
    { label: 'Tasks', href: 'admin-tasks.html' },
    { label: 'Calendar', href: 'admin-calendar.html' },
    { label: 'Messages', href: 'admin-messages.html' },
    { label: 'Documents', href: 'admin-documents.html' }
  ];

  function index() {
    const D = window.AdminData || {};
    const items = [];
    (D.CLIENTS||[]).forEach(c => items.push({ group:'Clients', title: c.family + ' family', sub: c.primary + ' · ' + c.tier + ' · ' + c.planner, href: 'admin-client.html?id=' + c.id, icon:'◎' }));
    (D.TASKS||[]).forEach(t => items.push({ group:'Tasks', title: t.title, sub: 'due ' + t.due + ' · ' + t.planner, href: 'admin-tasks.html', icon:'☰' }));
    SECTIONS.forEach(s => items.push({ group:'Go to', title: s.label, sub: '', href: s.href, icon:'→' }));
    [['FY25 Tax Return','Tax'],['Q2 Dividend statement','Income'],['Property valuation — Coburg','Property'],['Engagement letter — FY26','Admin']]
      .forEach(([n,c]) => items.push({ group:'Documents', title: n, sub: c, href: 'admin-documents.html', icon:'▤' }));
    return items;
  }

  let el, input, list, items = [], visible = [], cursor = 0, open = false;
  function build() {
    if (el) return;
    el = document.createElement('div'); el.className = 'cmd-palette'; el.hidden = true;
    el.innerHTML = `<div class="cmd-backdrop" data-close></div>
      <div class="cmd-shell" role="dialog" aria-label="Search">
        <div class="cmd-head"><span class="cmd-kbd">⌘K</span><input class="cmd-input" type="text" placeholder="Search clients, tasks, documents…" autocomplete="off"><span class="cmd-esc">esc</span></div>
        <div class="cmd-list" role="listbox"></div>
        <div class="cmd-foot"><span><kbd>↑↓</kbd> nav</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>`;
    document.body.appendChild(el);
    input = el.querySelector('.cmd-input'); list = el.querySelector('.cmd-list');
    el.querySelector('[data-close]').onclick = close;
    input.addEventListener('input', () => filter(input.value));
    input.addEventListener('keydown', onKey);
    list.addEventListener('click', e => { const r = e.target.closest('.cmd-row'); if (r) run(+r.dataset.i); });
  }
  function filter(q) {
    q = (q||'').toLowerCase();
    visible = !q ? items.slice(0, 8) : items.filter(it => (it.title+' '+it.sub).toLowerCase().includes(q)).slice(0, 14);
    cursor = 0;
    let html = '', lastG = null;
    visible.forEach((it, i) => {
      if (it.group !== lastG) { html += `<div class="cmd-group">${it.group}</div>`; lastG = it.group; }
      html += `<div class="cmd-row" data-i="${i}" data-active="${i===0}"><span class="cmd-row-title">${it.icon? '<span style="color:var(--ink-3);margin-right:8px">'+it.icon+'</span>':''}${esc(it.title)}</span><span class="cmd-row-hint">${esc(it.sub)}</span></div>`;
    });
    if (!visible.length) html = `<div class="cmd-empty">No matches.</div>`;
    list.innerHTML = html;
  }
  function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function setCursor(i){ cursor = Math.max(0, Math.min(visible.length-1, i)); list.querySelectorAll('.cmd-row').forEach((r,j)=>r.dataset.active=String(j===cursor)); const a=list.querySelector('[data-active="true"]'); if(a)a.scrollIntoView({block:'nearest'}); }
  function run(i){ const it = visible[i]; if (it) { close(); location.href = it.href; } }
  function onKey(e){ if(e.key==='ArrowDown'){e.preventDefault();setCursor(cursor+1);} else if(e.key==='ArrowUp'){e.preventDefault();setCursor(cursor-1);} else if(e.key==='Enter'){e.preventDefault();run(cursor);} else if(e.key==='Escape'){e.preventDefault();close();} }
  function openIt(){ build(); items = index(); el.hidden = false; open = true; requestAnimationFrame(()=>{ el.classList.add('is-open'); input.value=''; input.focus(); filter(''); }); }
  function close(){ if(!el||!open)return; el.classList.remove('is-open'); open=false; setTimeout(()=>el.hidden=true,180); }

  window.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')) { e.preventDefault(); open?close():openIt(); }
    else if (e.key==='/' && !open) { const tag=(e.target.tagName||'').toLowerCase(); if(tag!=='input'&&tag!=='textarea'){ e.preventDefault(); openIt(); } }
  });
  window.AdminSearch = { open: openIt };
})();
