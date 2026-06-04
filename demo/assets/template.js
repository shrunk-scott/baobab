/* Baobab — Upload template (download + upload)
 *
 * Generates a structured CSV mirroring the dashboard state, and parses
 * a filled-out CSV back into localStorage so the calculator re-populates.
 *
 * Round-trip key: column "Path" is a dot-path into state, e.g.
 *   income.0.trust, expenses.2.items.1.annual, debt.investment.0.balance
 */

(function () {
  'use strict';

  const LS_KEY = 'baobab.dashboard.v1';

  // ── Build the spec from current state ─────────────────────────
  function buildSpec(state) {
    const rows = [];
    const add = (section, path, label, hint) => {
      const value = getPath(state, path);
      rows.push({ section, path, label, value: value == null ? '' : value, hint: hint || '' });
    };

    // ── Assumptions ────────────────────────────────────────────
    add('Assumptions',      'familyName',  'Family name',                       'Surname or trust family');
    add('Assumptions',      'p1Name',      'Person 1 — name',                   'Primary');
    add('Assumptions',      'p2Name',      'Person 2 — name',                   'Spouse / partner');
    add('Assumptions',      'numDeps',     'Number of dependents',              'For tax offsets');
    add('Assumptions',      'trustName',   'Trust name',                        '');
    add('Assumptions',      'trustDist1',  'Trust dist. — Person 1 (%)',        'Must add to 100 with Person 2');
    add('Assumptions',      'trustDist2',  'Trust dist. — Person 2 (%)',        '');
    add('Assumptions',      'rbaRate',     'RBA cash rate (%)',                 'FY26: 4.35');
    add('Assumptions',      'invRate',     'Investment mortgage rate (%)',      '');
    add('Assumptions',      'pporRate',    'PPOR mortgage rate (%)',            '');
    add('Assumptions',      'cpi',         'Inflation / CPI (%)',               '');
    add('Assumptions',      'propGrowth',  'Property growth p.a. (%)',          '');
    add('Assumptions',      'shareReturn', 'Share return p.a. (%)',             '');
    add('Assumptions',      'sgcRate',     'Super guarantee rate (%)',          'FY26: 12');
    add('Assumptions',      'franking',    'Dividend franking rate (%)',        '100 = fully franked');

    // ── Income — match existing row count, supplement +2 ────────
    const incomeRows = (state.income || []).length;
    const incomeMax = Math.max(8, incomeRows);
    for (let i = 0; i < incomeMax; i++) {
      add('Income (monthly NET)', `income.${i}.src`,   `Source ${i+1} — name`,           i === 0 ? 'e.g. Trust distributions' : '');
      add('Income (monthly NET)', `income.${i}.trust`, `Source ${i+1} — trust amount`,   '$/month');
      add('Income (monthly NET)', `income.${i}.p1`,    `Source ${i+1} — Person 1 amount`,'$/month');
      add('Income (monthly NET)', `income.${i}.p2`,    `Source ${i+1} — Person 2 amount`,'$/month');
    }

    // ── Tax (gross, annual) ───────────────────────────────────
    ['p1', 'p2'].forEach(who => {
      const personLbl = who === 'p1' ? 'Person 1' : 'Person 2';
      add('Tax — ' + personLbl, `tax.${who}.salary`,     `${personLbl} — gross salary`,         '$ annual');
      add('Tax — ' + personLbl, `tax.${who}.consulting`, `${personLbl} — consulting income`,    '$ annual');
      add('Tax — ' + personLbl, `tax.${who}.rental`,     `${personLbl} — net rental P/L`,       '$ annual; loss = negative');
      add('Tax — ' + personLbl, `tax.${who}.dividends`,  `${personLbl} — dividend income`,      '$ annual');
      add('Tax — ' + personLbl, `tax.${who}.franking`,   `${personLbl} — franking credits`,     '');
      add('Tax — ' + personLbl, `tax.${who}.otherInc`,   `${personLbl} — other income`,         '');
      add('Tax — ' + personLbl, `tax.${who}.workDed`,    `${personLbl} — work-related deductions`, '');
      add('Tax — ' + personLbl, `tax.${who}.propDed`,    `${personLbl} — property deductions`,  '');
      add('Tax — ' + personLbl, `tax.${who}.ipDed`,      `${personLbl} — income-protection ded.`, '');
      add('Tax — ' + personLbl, `tax.${who}.otherDed`,   `${personLbl} — other deductions`,     '');
      add('Tax — ' + personLbl, `tax.${who}.payg`,       `${personLbl} — PAYG withheld`,        '');
      add('Tax — ' + personLbl, `tax.${who}.otherCredit`,`${personLbl} — other credits`,        '');
    });

    // ── Expenses — every existing item, annual only ───────────
    (state.expenses || []).forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        add('Expenses — ' + g.group, `expenses.${gi}.items.${ii}.name`,
            `Item ${ii+1} — name`, '');
        add('Expenses — ' + g.group, `expenses.${gi}.items.${ii}.annual`,
            `Item ${ii+1} — annual $`, '');
      });
    });

    // ── Debt — investment + private ───────────────────────────
    const debtInv = (state.debt && state.debt.investment) || [];
    const debtPrv = (state.debt && state.debt.private) || [];
    const debtInvMax = Math.max(4, debtInv.length);
    const debtPrvMax = Math.max(3, debtPrv.length);
    for (let i = 0; i < debtInvMax; i++) {
      add('Debt — Investment', `debt.investment.${i}.name`,    `Loan ${i+1} — name`, '');
      add('Debt — Investment', `debt.investment.${i}.balance`, `Loan ${i+1} — balance ($)`, '');
      add('Debt — Investment', `debt.investment.${i}.rate`,    `Loan ${i+1} — rate (%)`, '');
      add('Debt — Investment', `debt.investment.${i}.type`,    `Loan ${i+1} — type`, 'P&I or IO');
      add('Debt — Investment', `debt.investment.${i}.term`,    `Loan ${i+1} — term (yrs)`, '');
    }
    for (let i = 0; i < debtPrvMax; i++) {
      add('Debt — Private', `debt.private.${i}.name`,    `Loan ${i+1} — name`, '');
      add('Debt — Private', `debt.private.${i}.balance`, `Loan ${i+1} — balance ($)`, '');
      add('Debt — Private', `debt.private.${i}.rate`,    `Loan ${i+1} — rate (%)`, '');
      add('Debt — Private', `debt.private.${i}.type`,    `Loan ${i+1} — type`, 'P&I or IO');
      add('Debt — Private', `debt.private.${i}.term`,    `Loan ${i+1} — term (yrs)`, '');
    }

    // ── Rental — 4 properties ──────────────────────────────────
    const rentalMax = Math.max(4, (state.rental || []).length);
    for (let i = 0; i < rentalMax; i++) {
      add('Rental Property ' + (i+1), `rental.${i}.addr`,         `IP${i+1} — address`, '');
      add('Rental Property ' + (i+1), `rental.${i}.weeklyRent`,   `IP${i+1} — weekly rent`, '');
      add('Rental Property ' + (i+1), `rental.${i}.weeks`,        `IP${i+1} — weeks rented`, 'usually 52');
      add('Rental Property ' + (i+1), `rental.${i}.ownership`,    `IP${i+1} — your ownership %`, '50, 100, etc.');
      ['agent','rates','insurance','interest','maint','water'].forEach(k => {
        add('Rental Property ' + (i+1), `rental.${i}.expenses.${k}`, `IP${i+1} — ${k} ($ annual)`, '');
      });
    }

    // ── Goals ──────────────────────────────────────────────────
    const goalsMax = Math.max(8, (state.goals || []).length);
    for (let i = 0; i < goalsMax; i++) {
      add('Goals', `goals.${i}.name`,     `Goal ${i+1} — name`, '');
      add('Goals', `goals.${i}.target`,   `Goal ${i+1} — target $`, '');
      add('Goals', `goals.${i}.current`,  `Goal ${i+1} — current $`, '');
      add('Goals', `goals.${i}.deadline`, `Goal ${i+1} — deadline (YYYY-MM)`, '');
    }

    // ── Emergency + super ──────────────────────────────────────
    add('Emergency fund', 'emergencyTarget',  'Emergency fund — target $', '');
    add('Emergency fund', 'emergencyCurrent', 'Emergency fund — current $', '');

    add('Superannuation', 'superP1',         'Person 1 — current super balance', '');
    add('Superannuation', 'superP2',         'Person 2 — current super balance', '');
    add('Superannuation', 'ageP1',           'Person 1 — current age', '');
    add('Superannuation', 'ageP2',           'Person 2 — current age', '');
    add('Superannuation', 'retP1',           'Person 1 — target retirement age', '');
    add('Superannuation', 'retP2',           'Person 2 — target retirement age', '');
    add('Superannuation', 'superContrib1',   'Person 1 — annual super contributions', '');
    add('Superannuation', 'superContrib2',   'Person 2 — annual super contributions', '');
    add('Superannuation', 'superTarget1',    'Person 1 — target retirement super', '');
    add('Superannuation', 'superTarget2',    'Person 2 — target retirement super', '');

    // ── Assets & Liabilities ───────────────────────────────────
    const alMax = Math.max(10, (state.al || []).length);
    for (let i = 0; i < alMax; i++) {
      add('Assets & Liabilities', `al.${i}.class`, `Line ${i+1} — class`,
          i === 0 ? 'Property / Cash / Super / Shares / etc.' : '');
      add('Assets & Liabilities', `al.${i}.desc`,  `Line ${i+1} — description`, '');
      add('Assets & Liabilities', `al.${i}.owner`, `Line ${i+1} — owner`, 'Joint / Person 1 / Person 2 / Trust');
      add('Assets & Liabilities', `al.${i}.asset`, `Line ${i+1} — asset $`, '');
      add('Assets & Liabilities', `al.${i}.liab`,  `Line ${i+1} — liability $`, '');
    }

    return rows;
  }

  // ── CSV writer ─────────────────────────────────────────────────
  function csvEscape(v) {
    const s = (v == null ? '' : String(v));
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function buildCSV(state) {
    const header = ['Section','Path','Label','Value','Hint'];
    const lines = [];
    // Front-matter
    lines.push('# Baobab Household Upload Template — FY 2025–26');
    lines.push('# Edit ONLY column D ("Value"). Section / Path / Label / Hint are reference.');
    lines.push('# Save as CSV and upload via Dashboard → ↑ Upload.');
    lines.push('# Generated: ' + new Date().toISOString());
    lines.push('');
    lines.push(header.map(csvEscape).join(','));
    const rows = buildSpec(state);
    rows.forEach(r => {
      lines.push([r.section, r.path, r.label, r.value, r.hint].map(csvEscape).join(','));
    });
    return lines.join('\r\n');
  }

  // ── CSV parser ─────────────────────────────────────────────────
  function parseCSV(text) {
    // Skip leading comment lines starting with #
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i+1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    // Drop comments and empty
    return rows.filter(r => r.length && !(r.length === 1 && r[0] === '') && !(r[0] && r[0].startsWith('#')));
  }

  // ── Path utils ─────────────────────────────────────────────────
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const nk = parts[i+1];
      if (!(k in o) || o[k] == null) {
        o[k] = /^\d+$/.test(nk) ? [] : {};
      }
      o = o[k];
    }
    const last = parts[parts.length - 1];
    o[last] = value;
  }

  // ── Toast UI ──────────────────────────────────────────────────
  function toast(msg, kind) {
    let host = document.getElementById('bb-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'bb-toast-host';
      host.style.cssText = 'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:10px;';
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    const c = kind === 'error' ? '#B83A2B' : kind === 'success' ? '#2F7A45' : '#1F2A1E';
    t.style.cssText = `
      background: ${c}; color: #fff;
      padding: 12px 18px; border-radius: 999px;
      font-family: var(--font-mono, ui-monospace, monospace); font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      animation: bb-toast-in 0.25s ease;
      max-width: 480px;`;
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s ease'; }, 3500);
    setTimeout(() => t.remove(), 4000);
  }
  // Inject toast keyframes once
  if (!document.getElementById('bb-toast-keyframes')) {
    const s = document.createElement('style');
    s.id = 'bb-toast-keyframes';
    s.textContent = '@keyframes bb-toast-in { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }';
    document.head.appendChild(s);
  }

  // ── Wire up download ──────────────────────────────────────────
  function getState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function setState(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

  function downloadTemplate() {
    const state = getState();
    const csv = buildCSV(state);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fam = (state.familyName || 'household').toLowerCase().replace(/[^a-z0-9]/g, '');
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baobab-upload-${fam}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    toast('Template downloaded — fill in column D and upload back.', 'success');
  }

  function uploadTemplate(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      let rows;
      try { rows = parseCSV(text); }
      catch (err) { toast('Couldn\'t parse CSV: ' + err.message, 'error'); return; }
      if (!rows.length) { toast('CSV looks empty.', 'error'); return; }

      // Detect header row — find the row that contains both "Path" and "Value"
      let headerIdx = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const lower = rows[i].map(c => (c || '').trim().toLowerCase());
        if (lower.includes('path') && lower.includes('value')) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { toast('Couldn\'t find header row with "Path" and "Value" columns.', 'error'); return; }

      const header = rows[headerIdx].map(c => (c || '').trim().toLowerCase());
      const pathCol = header.indexOf('path');
      const valueCol = header.indexOf('value');

      const state = getState();
      let updated = 0;
      let skipped = 0;
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;
        const path = (row[pathCol] || '').trim();
        let value = (row[valueCol] != null ? String(row[valueCol]) : '').trim();
        if (!path) continue;

        // Coerce types: numeric where possible, leave strings alone
        if (value === '') { skipped++; continue; }
        if (/^-?\d+(\.\d+)?$/.test(value)) value = parseFloat(value);
        else if (/^p&i$|^io$|^joint$|^lina$|^tbc$|^person\s*1$|^person\s*2$|^trust$/i.test(value)) {
          // keep as string
        }
        try { setPath(state, path, value); updated++; }
        catch (err) { skipped++; }
      }

      setState(state);
      toast(`Imported ${updated} fields · skipped ${skipped} empty. Reloading…`, 'success');
      setTimeout(() => location.reload(), 900);
    };
    reader.onerror = () => toast('Couldn\'t read file.', 'error');
    reader.readAsText(file);
  }

  // ── DOM wiring ─────────────────────────────────────────────────
  function boot() {
    const dl = document.getElementById('template-dl-btn');
    const upBtn = document.getElementById('template-up-btn');
    const upInput = document.getElementById('template-up-input');

    if (dl) dl.addEventListener('click', downloadTemplate);
    if (upBtn && upInput) {
      upBtn.addEventListener('click', () => upInput.click());
      upInput.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (f) uploadTemplate(f);
        e.target.value = ''; // reset for re-upload
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
