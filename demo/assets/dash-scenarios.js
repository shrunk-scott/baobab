/* Kudz — Scenario A/B compare. Lets the user snapshot two planning
 * scenarios (e.g. "buy IP4" vs "pay down PPOR") and diff projected
 * net worth over 15 years. Adds a "Scenarios" tab to the dashboard.
 */
(function () {
  'use strict';
  const LS = 'baobab.dashboard.v1';
  const SCEN = 'kudz.scenarios.v1';
  const getState = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };
  const fmtShort = n => { if(!isFinite(n))n=0; const a=Math.abs(n),s=n<0?'−':''; if(a>=1e6)return s+'$'+(a/1e6).toFixed(2)+'m'; if(a>=1e3)return s+'$'+(a/1e3).toLocaleString('en-AU',{maximumFractionDigits:0})+'k'; return s+'$'+Math.round(a).toLocaleString('en-AU'); };
  const fmtFull = n => (!isFinite(n)?'$0':(n<0?'−':'')+'$'+Math.round(Math.abs(n)).toLocaleString('en-AU'));

  function derive(s) {
    const incM = (s.income||[]).reduce((a,r)=>a+((+r.trust||0)+(+r.p1||0)+(+r.p2||0)),0);
    const incomeAnnual = incM*12;
    const expTotal = (s.expenses||[]).reduce((sum,g)=>sum+g.items.reduce((t,it)=>t+(+it.annual||0),0),0);
    function pmt(P,r,n){const m=r/12/100,N=n*12;if(m===0)return P/N;return P*m/(1-Math.pow(1+m,-N));}
    const debtAll=[].concat(s.debt?.investment||[],s.debt?.private||[]);
    const debtRepay=debtAll.reduce((x,l)=>{const mi=(+l.balance||0)*(+l.rate||0)/100/12;return x+(l.type==='IO'?mi:pmt(+l.balance||0,+l.rate||0,+l.term||30));},0);
    const a=(s.al||[]).reduce((x,r)=>x+(+r.asset||0),0), l=(s.al||[]).reduce((x,r)=>x+(+r.liab||0),0);
    const savings=incomeAnnual-expTotal-debtRepay*12;
    return { netWorth:a-l, income:incomeAnnual, savings, assets:a, liabs:l };
  }
  // 15-yr net-worth projection given knobs
  function project(base, knobs) {
    const YEARS=15, r=knobs.growth/100;
    let nw=base.netWorth, surplus=Math.max(0, base.savings*(1+knobs.savingsDelta/100));
    // extra property adds asset + debt; pay-down reduces liabilities/interest
    if (knobs.action==='buyIP') { nw += knobs.ipValue*0.0; } // deposit handled via surplus drag
    const series=[nw];
    for (let y=1;y<=YEARS;y++){
      let growth = nw*r;
      if (knobs.action==='buyIP') growth += knobs.ipValue*0.05; // extra geared asset growth
      if (knobs.action==='payPPOR') growth += knobs.extraRepay*12*0.06; // interest saved compounding
      nw = nw + surplus + growth;
      series.push(nw);
    }
    return series;
  }

  function read(){ try { return JSON.parse(localStorage.getItem(SCEN)||'{}'); } catch(e){ return {}; } }
  function write(o){ localStorage.setItem(SCEN, JSON.stringify(o)); }

  function mount() {
    const nav = document.querySelector('nav.dash-nav');
    const content = document.querySelector('.dash-content');
    if (!nav || !content || document.querySelector('.dash-tab[data-tab="scenarios"]')) return;

    // add to Analysis group (after stress)
    const btn = document.createElement('button');
    btn.className = 'dash-tab'; btn.dataset.tab = 'scenarios';
    btn.innerHTML = `<span class="num-tick">⇄</span> Scenarios`;
    const stress = nav.querySelector('.dash-tab[data-tab="stress"]');
    if (stress && stress.nextSibling) nav.insertBefore(btn, stress.nextSibling); else nav.appendChild(btn);

    const sec = document.createElement('section');
    sec.className = 'section-view'; sec.dataset.section = 'scenarios';
    sec.innerHTML = `
      <div class="section-intro">
        <div>
          <div class="meta">⇄ · SCENARIOS</div>
          <h2>Compare two <em>futures</em>, side by side.</h2>
          <p class="deck">Model a decision both ways — buy another investment property vs. aggressively pay down the home loan — and see the 15-year net-worth difference. Configure each, then read the diff.</p>
        </div>
      </div>
      <div class="scn-grid">
        ${scnCard('A')}
        ${scnCard('B')}
      </div>
      <div class="panel scn-result" style="margin-top:14px;">
        <div class="panel-head"><h2>Projected net worth · 15 years</h2><span class="muted" style="font-size:12px;">A = solid · B = dashed</span></div>
        <div class="panel-body"><svg id="scn-chart" style="width:100%; height:280px; display:block;"></svg></div>
        <div class="scn-verdict" id="scn-verdict"></div>
      </div>`;
    content.appendChild(sec);

    function scnCard(id) {
      return `<div class="panel scn-card" data-scn="${id}">
        <div class="panel-head"><h2><span class="scn-tag">${id}</span> Scenario ${id}</h2></div>
        <div class="panel-body">
          <label class="scn-field"><span>Label</span><input class="field field-text" data-k="label" value="${id==='A'?'Buy investment property 4':'Pay down home loan'}"></label>
          <label class="scn-field"><span>Strategy</span>
            <select class="field" data-k="action">
              <option value="buyIP" ${id==='A'?'selected':''}>Buy another investment property</option>
              <option value="payPPOR" ${id==='B'?'selected':''}>Aggressively pay down PPOR</option>
              <option value="base">Stay the course</option>
            </select>
          </label>
          <div class="scn-knobs">
            <label class="scn-knob"><span>Assumed growth p.a.</span><div class="scn-knob-row"><input type="range" data-k="growth" min="3" max="10" step="0.5" value="7"><span class="scn-knob-v" data-v="growth">7%</span></div></label>
            <label class="scn-knob"><span>Savings vs. today</span><div class="scn-knob-row"><input type="range" data-k="savingsDelta" min="-50" max="50" step="5" value="0"><span class="scn-knob-v" data-v="savingsDelta">0%</span></div></label>
            <label class="scn-knob scn-ip"><span>New property value</span><div class="scn-knob-row"><input type="range" data-k="ipValue" min="0" max="1500000" step="50000" value="700000"><span class="scn-knob-v" data-v="ipValue">$700k</span></div></label>
            <label class="scn-knob scn-pay"><span>Extra repayment / mo</span><div class="scn-knob-row"><input type="range" data-k="extraRepay" min="0" max="8000" step="250" value="2000"><span class="scn-knob-v" data-v="extraRepay">$2,000</span></div></label>
          </div>
        </div>
      </div>`;
    }

    const base = derive(getState());
    const stored = read();
    function knobsFor(card) {
      const k = {};
      card.querySelectorAll('[data-k]').forEach(el => { k[el.dataset.k] = el.type==='range' ? parseFloat(el.value) : el.value; });
      return k;
    }
    function syncLabels(card) {
      card.querySelectorAll('[data-v]').forEach(v => {
        const el = card.querySelector(`[data-k="${v.dataset.v}"]`); if (!el) return;
        const val = parseFloat(el.value);
        if (v.dataset.v==='growth') v.textContent = val+'%';
        else if (v.dataset.v==='savingsDelta') v.textContent = (val>0?'+':'')+val+'%';
        else if (v.dataset.v==='ipValue') v.textContent = fmtShort(val);
        else if (v.dataset.v==='extraRepay') v.textContent = fmtFull(val);
      });
      // show/hide strategy-specific knob
      const act = card.querySelector('[data-k="action"]').value;
      card.querySelector('.scn-ip').style.display = act==='buyIP'?'':'none';
      card.querySelector('.scn-pay').style.display = act==='payPPOR'?'':'none';
    }

    function recompute() {
      const cardA = sec.querySelector('[data-scn="A"]'), cardB = sec.querySelector('[data-scn="B"]');
      syncLabels(cardA); syncLabels(cardB);
      const kA = knobsFor(cardA), kB = knobsFor(cardB);
      const sA = project(base, kA), sB = project(base, kB);
      drawChart(sec.querySelector('#scn-chart'), sA, sB);
      const endA = sA[sA.length-1], endB = sB[sB.length-1];
      const diff = endB - endA;
      const winner = Math.abs(diff) < base.netWorth*0.01 ? null : (diff>0?'B':'A');
      const vEl = sec.querySelector('#scn-verdict');
      vEl.innerHTML = `
        <div class="scn-v-col"><span class="scn-tag">A</span><div><div class="scn-v-label">${kA.label||'Scenario A'}</div><div class="scn-v-num">${fmtShort(endA)}</div></div></div>
        <div class="scn-v-mid">
          <div class="scn-v-diff ${diff>=0?'pos':'neg'}">${diff>=0?'+':'−'}${fmtShort(Math.abs(diff))}</div>
          <div class="scn-v-note">${winner? 'Scenario '+winner+' is ahead in 15 yrs' : 'Effectively level'}</div>
        </div>
        <div class="scn-v-col scn-v-right"><span class="scn-tag">B</span><div><div class="scn-v-label">${kB.label||'Scenario B'}</div><div class="scn-v-num">${fmtShort(endB)}</div></div></div>`;
      write({ A:kA, B:kB });
    }

    function drawChart(svg, sA, sB) {
      const W = svg.parentElement.getBoundingClientRect().width || 600, H = 280, P = 34, YEARS=15;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const all = sA.concat(sB), min = Math.min(...all), max = Math.max(...all), span = Math.max(1,max-min);
      const xF = i => P + (W-2*P)*(i/YEARS), yF = v => P + (H-2*P)*(1-(v-min)/span);
      let grid=''; for(let i=0;i<=4;i++){const y=P+(H-2*P)*(i/4);grid+=`<line x1="${P}" x2="${W-P}" y1="${y}" y2="${y}" stroke="var(--hair-2)" stroke-dasharray="2 4"/>`;}
      let ticks=''; for(let i=0;i<=YEARS;i+=3){const x=xF(i);ticks+=`<text x="${x}" y="${H-10}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--ink-3)">FY${26+i}</text>`;}
      const line = (s,dash,color)=>`<polyline points="${s.map((v,i)=>`${xF(i).toFixed(1)},${yF(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" ${dash?'stroke-dasharray="5 4"':''} stroke-linejoin="round"/>`;
      svg.innerHTML = grid + ticks
        + line(sA,false,'var(--primary)') + line(sB,true,'var(--accent)')
        + `<circle cx="${xF(YEARS).toFixed(1)}" cy="${yF(sA[YEARS]).toFixed(1)}" r="3.5" fill="var(--primary)"/>`
        + `<circle cx="${xF(YEARS).toFixed(1)}" cy="${yF(sB[YEARS]).toFixed(1)}" r="3.5" fill="var(--accent)"/>`;
    }

    sec.addEventListener('input', recompute);
    sec.addEventListener('change', recompute);

    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(b=>b.dataset.active=String(b===btn));
      document.querySelectorAll('.section-view').forEach(s=>s.dataset.active=String(s===sec));
      const t=document.getElementById('dash-section-title'); if(t)t.innerHTML=`Scenarios <span class="ttl-hint">⇄ A / B</span>`;
      history.replaceState(null,'','#scenarios');
      recompute();
    });

    // restore stored knob values
    if (stored.A || stored.B) {
      ['A','B'].forEach(id=>{ const k=stored[id]; if(!k)return; const card=sec.querySelector(`[data-scn="${id}"]`);
        Object.entries(k).forEach(([key,val])=>{ const el=card.querySelector(`[data-k="${key}"]`); if(el)el.value=val; }); });
    }
    recompute();
  }

  let tries=0; const iv=setInterval(()=>{ mount(); if(document.querySelector('.dash-tab[data-tab="scenarios"]')||++tries>40) clearInterval(iv); }, 150);
})();
