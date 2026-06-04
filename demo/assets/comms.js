/* Kudz — Calendar, Documents & Messaging.
 * Shared data + renderers for both the admin console and the client portal.
 * A page sets window.COMMS_CTX = 'admin' | 'client' before this loads (default client).
 * Renderers target container ids if present, so one file serves all pages.
 */
(function () {
  'use strict';
  const CTX = window.COMMS_CTX || 'client';
  const LS_MSG = 'kudz.messages.v1';

  // ── Mock events (FY26) ──────────────────────────────────────────
  const EVENTS = [
    { date: '2026-05-30', time: '14:00', dur: '60m', title: 'SMSF rebalance review', client: 'Ito', planner: 'Kudzai Mhishi', type: 'review', mode: 'Video' },
    { date: '2026-06-04', time: '10:30', dur: '45m', title: 'Div 293 strategy — pre-EOFY', client: 'Patel', planner: 'Kudzai Mhishi', type: 'tax', mode: 'Video' },
    { date: '2026-06-09', time: '09:00', dur: '90m', title: 'Onboarding · week 2 reconcile', client: 'Pomeroy', planner: 'P. Lee', type: 'onboarding', mode: 'In person' },
    { date: '2026-06-12', time: '15:30', dur: '30m', title: 'Quarterly check-in', client: 'Jones', planner: 'Kudzai Mhishi', type: 'review', mode: 'Video' },
    { date: '2026-06-18', time: '11:00', dur: '60m', title: 'Bucket company refresh', client: 'Macleod', planner: 'Kudzai Mhishi', type: 'tax', mode: 'Video' },
    { date: '2026-06-25', time: '13:00', dur: '60m', title: 'CGT pre-July planning', client: 'Ahmadi', planner: 'Kudzai Mhishi', type: 'tax', mode: 'In person' },
    { date: '2026-07-14', time: '10:00', dur: '60m', title: 'EOFY tax review', client: 'Jones', planner: 'Kudzai Mhishi', type: 'review', mode: 'Video' },
    { date: '2026-06-12', time: '08:00', dur: '15m', title: 'Document deadline · payslips', client: 'Jones', planner: '—', type: 'deadline', mode: 'Task' }
  ];

  // ── Mock documents ──────────────────────────────────────────────
  const DOCS = [
    { name: 'FY25 Tax Return — lodged.pdf', cat: 'Tax', size: '482 KB', date: '2026-05-28', by: 'Kudzai Mhishi', dir: 'in', client: 'Jones' },
    { name: 'Q2 Dividend statement.pdf', cat: 'Income', size: '210 KB', date: '2026-05-22', by: 'Lina Jones', dir: 'out', client: 'Jones' },
    { name: 'Property valuation — Coburg.pdf', cat: 'Property', size: '1.2 MB', date: '2026-05-15', by: 'Lina Jones', dir: 'out', client: 'Jones' },
    { name: 'Quarterly plan — Q3 FY26.pdf', cat: 'Reports', size: '640 KB', date: '2026-05-02', by: 'Kudzai Mhishi', dir: 'in', client: 'Jones' },
    { name: 'Engagement letter — FY26.pdf', cat: 'Admin', size: '88 KB', date: '2026-04-18', by: 'Kudzai Mhishi', dir: 'in', client: 'Jones' },
    { name: 'PAYG summary — Lina.pdf', cat: 'Tax', size: '156 KB', date: '2026-04-10', by: 'Lina Jones', dir: 'out', client: 'Jones' },
    { name: 'Loan statements — IP1 & IP2.zip', cat: 'Debt', size: '2.4 MB', date: '2026-03-29', by: 'Lina Jones', dir: 'out', client: 'Jones' },
    { name: 'Super contribution advice.pdf', cat: 'Super', size: '120 KB', date: '2026-03-12', by: 'Kudzai Mhishi', dir: 'in', client: 'Jones' }
  ];

  // ── Mock message threads ────────────────────────────────────────
  const THREADS = [
    { id: 'jones', who: 'Lina Jones', role: 'Jones family', avatar: 'LJ', unread: 0, last: 'Perfect, thank you Kudzai.', when: '9:32 AM',
      messages: [
        { from: 'them', text: 'Hi Kudzai — quick one. Our Q2 dividend came in at $42k, a bit higher than expected. Anything we should do before EOFY?', when: 'Yesterday 4:12 PM' },
        { from: 'me', text: "Good news. With that bump I'd lean toward topping up Lina's concessional super before 30 June — you've got ~$8.6k of cap left. Keeps you under the Div 293 line too.", when: 'Yesterday 5:01 PM' },
        { from: 'them', text: 'That makes sense. Can you model it in the portal so we can see the tax effect?', when: '9:20 AM' },
        { from: 'me', text: "Done — open the Tax tab and you'll see the updated estimate. Net saving is about $3,100 this year.", when: '9:28 AM' },
        { from: 'them', text: 'Perfect, thank you Kudzai.', when: '9:32 AM' }
      ] },
    { id: 'patel', who: 'Anika Patel', role: 'Patel family · Bespoke', avatar: 'AP', unread: 2, last: 'Sounds good — see you the 4th.', when: 'Tue',
      messages: [
        { from: 'them', text: 'Are we still on for the Div 293 session next week?', when: 'Tue 11:01 AM' },
        { from: 'me', text: 'Yes — 4 June, 10:30. I\'ll send the pre-read on the bucket company option.', when: 'Tue 11:40 AM' },
        { from: 'them', text: 'Sounds good — see you the 4th.', when: 'Tue 11:42 AM' }
      ] },
    { id: 'ito', who: 'Haruki Ito', role: 'Ito family · Bespoke', avatar: 'HI', unread: 0, last: 'Uploaded the SMSF statements.', when: 'Mon',
      messages: [
        { from: 'them', text: 'Uploaded the SMSF statements.', when: 'Mon 2:15 PM' },
        { from: 'me', text: 'Got them, thanks. Reviewing before Friday\'s rebalance call.', when: 'Mon 3:02 PM' }
      ] },
    { id: 'macleod', who: 'Fiona Macleod', role: 'Macleod family · Bespoke', avatar: 'FM', unread: 0, last: 'Thanks for the update.', when: 'May 24',
      messages: [
        { from: 'me', text: 'Bucket company refresh is scheduled for 18 June. No action needed from you before then.', when: 'May 24 10:00 AM' },
        { from: 'them', text: 'Thanks for the update.', when: 'May 24 10:14 AM' }
      ] }
  ];

  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function parse(d){ const [y,m,day]=d.split('-').map(Number); return new Date(y,m-1,day); }

  // ════════════ CALENDAR ════════════
  function renderCalendar(root) {
    let view = new Date('2026-06-01');
    const clientFilter = CTX === 'client' ? 'Jones' : null;
    function draw() {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1), startDow = first.getDay();
      const days = new Date(y, m+1, 0).getDate();
      const evs = EVENTS.filter(e => { const d=parse(e.date); return d.getFullYear()===y && d.getMonth()===m && (!clientFilter || e.client===clientFilter); });
      const evByDay = {}; evs.forEach(e => { const day = parse(e.date).getDate(); (evByDay[day]=evByDay[day]||[]).push(e); });

      let cells = '';
      for (let i=0;i<startDow;i++) cells += `<div class="cal-cell cal-empty"></div>`;
      for (let d=1; d<=days; d++) {
        const items = (evByDay[d]||[]).sort((a,b)=>a.time.localeCompare(b.time));
        const isToday = (y===2026 && m===4 && d===30);
        cells += `<div class="cal-cell ${isToday?'is-today':''}">
          <div class="cal-date">${d}</div>
          ${items.slice(0,3).map(e=>`<div class="cal-ev cal-${e.type}" title="${e.time} · ${e.title} · ${e.client}">${e.time} ${CTX==='admin'?e.client:e.title}</div>`).join('')}
          ${items.length>3?`<div class="cal-more">+${items.length-3} more</div>`:''}
        </div>`;
      }
      const upcoming = EVENTS.filter(e => (!clientFilter || e.client===clientFilter) && parse(e.date) >= new Date('2026-05-30'))
        .sort((a,b)=>parse(a.date)-parse(b.date)).slice(0,6);
      root.innerHTML = `
        <div class="cal-layout">
          <div class="cal-main">
            <div class="cal-head">
              <div class="cal-title">${monthName[m]} ${y}</div>
              <div class="cal-nav">
                <button class="btn btn-secondary btn-sm" data-cal="prev">←</button>
                <button class="btn btn-secondary btn-sm" data-cal="today">Today</button>
                <button class="btn btn-secondary btn-sm" data-cal="next">→</button>
              </div>
            </div>
            <div class="cal-grid cal-dow">${dayName.map(d=>`<div class="cal-dow-cell">${d}</div>`).join('')}</div>
            <div class="cal-grid cal-body">${cells}</div>
          </div>
          <aside class="cal-side">
            <div class="cal-side-h">Upcoming</div>
            ${upcoming.map(e=>`
              <div class="cal-up">
                <div class="cal-up-date"><span class="cu-d">${parse(e.date).getDate()}</span><span class="cu-m">${monthName[parse(e.date).getMonth()].slice(0,3)}</span></div>
                <div class="cal-up-body">
                  <div class="cal-up-title">${e.title}</div>
                  <div class="cal-up-meta">${e.time} · ${e.dur} · ${e.mode}${CTX==='admin'?' · '+e.client:''}</div>
                </div>
                <span class="cal-dot cal-${e.type}"></span>
              </div>`).join('')}
            <button class="btn btn-primary btn-sm" style="width:100%; margin-top:14px; justify-content:center;" id="cal-book">${CTX==='admin'?'+ Schedule meeting':'Request a meeting'}</button>
          </aside>
        </div>`;
      root.querySelector('[data-cal="prev"]').onclick = ()=>{ view=new Date(y,m-1,1); draw(); };
      root.querySelector('[data-cal="next"]').onclick = ()=>{ view=new Date(y,m+1,1); draw(); };
      root.querySelector('[data-cal="today"]').onclick = ()=>{ view=new Date('2026-06-01'); draw(); };
      root.querySelector('#cal-book').onclick = ()=> alert(CTX==='admin'?'Open scheduler':'Request sent to your planner.');
    }
    draw();
  }

  // ════════════ DOCUMENTS ════════════
  function renderDocuments(root) {
    const cats = ['All', ...Array.from(new Set(DOCS.map(d=>d.cat)))];
    let active = 'All', q = '';
    function draw() {
      const list = DOCS.filter(d => (active==='All'||d.cat===active) && d.name.toLowerCase().includes(q.toLowerCase()));
      root.innerHTML = `
        <div class="doc-toolbar">
          <div class="chips-bar" id="doc-cats" style="margin:0;">
            ${cats.map(c=>`<button class="chip-btn" data-cat="${c}" data-active="${c===active}">${c}</button>`).join('')}
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input class="t-panel-search" id="doc-search" type="search" placeholder="Search files…" value="${q}">
            <button class="btn btn-primary btn-sm" id="doc-upload">↑ Upload</button>
          </div>
        </div>
        <div class="doc-dropzone" id="doc-dz">
          <span class="doc-dz-ico">↓</span>
          <div><strong>Drop files to upload</strong><span>PDF, images, statements — shared securely with ${CTX==='admin'?'the client':'your planner'}.</span></div>
        </div>
        <div class="t-panel">
          <div class="t-row head" style="grid-template-columns: 2.4fr 1fr 0.8fr 1fr 0.8fr;"><span>Name</span><span>Category</span><span>Size</span><span>Added by</span><span class="t-cell-num">Date</span></div>
          ${list.map(d=>`
            <div class="t-row doc-row" style="grid-template-columns: 2.4fr 1fr 0.8fr 1fr 0.8fr;">
              <span class="primary-cell"><span class="doc-ico doc-${d.dir}">${d.dir==='in'?'↓':'↑'}</span><span class="doc-name">${d.name}</span></span>
              <span><span class="pill">${d.cat}</span></span>
              <span class="doc-size">${d.size}</span>
              <span class="doc-by">${d.by}</span>
              <span class="t-cell-num doc-date">${parse(d.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</span>
            </div>`).join('') || `<div class="empty-state"><strong>No documents.</strong></div>`}
        </div>`;
      root.querySelector('#doc-cats').onclick = (e)=>{ const b=e.target.closest('[data-cat]'); if(!b)return; active=b.dataset.cat; draw(); };
      root.querySelector('#doc-search').oninput = (e)=>{ q=e.target.value; draw(); const i=root.querySelector('#doc-search'); i.focus(); i.setSelectionRange(q.length,q.length); };
      root.querySelector('#doc-upload').onclick = ()=> alert('File picker — would upload securely.');
    }
    draw();
  }

  // ════════════ MESSAGING ════════════
  function renderMessages(root) {
    let activeId = THREADS[0].id;
    const stored = (()=>{ try { return JSON.parse(localStorage.getItem(LS_MSG)||'{}'); } catch(e){ return {}; } })();
    THREADS.forEach(t => { if (stored[t.id]) t.messages = t.messages.concat(stored[t.id]); });

    function draw() {
      const t = THREADS.find(x=>x.id===activeId);
      const showList = CTX === 'admin';
      root.innerHTML = `
        <div class="msg-layout ${showList?'':'msg-solo'}">
          ${showList ? `<div class="msg-list">
            <div class="msg-list-head"><input class="t-panel-search" id="msg-search" type="search" placeholder="Search people…"></div>
            ${THREADS.map(th=>`
              <button class="msg-thread ${th.id===activeId?'is-active':''}" data-thread="${th.id}">
                <span class="avatar">${th.avatar}</span>
                <span class="msg-thread-body">
                  <span class="msg-thread-top"><span class="msg-who">${th.who}</span><span class="msg-when">${th.when}</span></span>
                  <span class="msg-last">${th.last}</span>
                </span>
                ${th.unread?`<span class="msg-unread">${th.unread}</span>`:''}
              </button>`).join('')}
          </div>` : ''}
          <div class="msg-conv">
            <div class="msg-conv-head">
              <span class="avatar">${showList?t.avatar:'KM'}</span>
              <div><div class="msg-conv-who">${showList?t.who:'Kudzai Mhishi'}</div><div class="msg-conv-role">${showList?t.role:'Director · your planner'}</div></div>
              <span class="msg-conv-status"><span class="dot"></span>${showList?'Client':'Online'}</span>
            </div>
            <div class="msg-scroll" id="msg-scroll">
              ${t.messages.map(m=>`<div class="msg-bubble ${m.from==='me'?'me':'them'}"><div class="msg-text">${m.text}</div><div class="msg-time">${m.when}</div></div>`).join('')}
            </div>
            <div class="msg-compose">
              <input type="text" id="msg-input" placeholder="Write a message…" autocomplete="off">
              <button class="btn btn-primary btn-sm" id="msg-send">Send</button>
            </div>
          </div>
        </div>`;
      const scroll = root.querySelector('#msg-scroll'); if (scroll) scroll.scrollTop = scroll.scrollHeight;
      root.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>{ activeId=b.dataset.thread; const th=THREADS.find(x=>x.id===activeId); if(th)th.unread=0; draw(); });
      const send = () => {
        const inp = root.querySelector('#msg-input'); const txt = inp.value.trim(); if(!txt) return;
        t.messages.push({ from:'me', text: txt, when: 'Just now' });
        stored[activeId] = (stored[activeId]||[]).concat([{ from:'me', text: txt, when:'Just now' }]);
        try { localStorage.setItem(LS_MSG, JSON.stringify(stored)); } catch(e){}
        draw();
      };
      const sb = root.querySelector('#msg-send'); if (sb) sb.onclick = send;
      const inp = root.querySelector('#msg-input'); if (inp) inp.onkeydown = (e)=>{ if(e.key==='Enter') send(); };
    }
    draw();
  }

  // ── Boot: render whichever container exists ─────────────────────
  function boot() {
    const cal = document.getElementById('comms-calendar'); if (cal) renderCalendar(cal);
    const doc = document.getElementById('comms-documents'); if (doc) renderDocuments(doc);
    const msg = document.getElementById('comms-messages'); if (msg) renderMessages(msg);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
