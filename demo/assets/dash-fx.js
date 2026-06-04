/* Baobab — Dashboard micro-interactions.
 *
 *   - Number tween on KPI bindings (transition values smoothly)
 *   - Cell flash on user edit + cascading downstream highlight
 *   - Undo snackbar (Cmd+Z restores last change)
 *   - Confetti on goal completion (≥ 100%)
 *   - Optional sound effects (off by default)
 *   - Toast helper used by template.js
 *
 * Wires onto the existing dashboard.js by observing DOM mutations on
 * [data-bind] elements and listening to input events on edit cells.
 */
(function () {
  'use strict';

  // ── Number tween ────────────────────────────────────────────────
  const tweenState = new WeakMap();
  function parseNumeric(text) {
    // Extract sign + leading digits to get a number, preserve the rest as template.
    const t = String(text).trim();
    const m = t.match(/^(.*?)([−-]?)\$?([\d.,]+)([kmKM]?)(.*)$/);
    if (!m) return null;
    const [, pre, sign, digits, unit, post] = m;
    const n = parseFloat(digits.replace(/,/g, ''));
    if (isNaN(n)) return null;
    const mult = unit.toLowerCase() === 'k' ? 1000 : unit.toLowerCase() === 'm' ? 1_000_000 : 1;
    return { value: (sign ? -1 : 1) * n * mult, pre, sign, unit, post, raw: t };
  }
  function formatTween(template, fromV, toV, frac) {
    const cur = fromV + (toV - fromV) * frac;
    const a = Math.abs(cur);
    let outDigits, outUnit;
    if (template.unit) {
      outUnit = template.unit;
      const div = template.unit.toLowerCase() === 'm' ? 1_000_000 : 1000;
      outDigits = (cur / div).toFixed(2).replace(/\.?0+$/, '');
    } else {
      outUnit = '';
      outDigits = Math.round(a).toLocaleString('en-AU');
    }
    const isDollar = template.raw.includes('$');
    const negStr = cur < 0 ? '−' : '';
    return template.pre.replace(/[\u2212-]/g, '').replace(/\$/g, '') + negStr + (isDollar ? '$' : '') + outDigits + outUnit + template.post;
  }
  function tweenTo(el, newText) {
    const oldText = el.dataset.lastText || el.textContent;
    if (oldText === newText) return;
    el.dataset.lastText = newText;
    const oldP = parseNumeric(oldText);
    const newP = parseNumeric(newText);
    if (!oldP || !newP || oldP.value === newP.value) {
      el.textContent = newText;
      return;
    }
    // cancel pending tween
    if (tweenState.get(el)) cancelAnimationFrame(tweenState.get(el));
    const dur = 380;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = formatTween(newP, oldP.value, newP.value, e);
      if (t < 1) tweenState.set(el, requestAnimationFrame(step));
      else { tweenState.delete(el); el.textContent = newText; }
    }
    tweenState.set(el, requestAnimationFrame(step));
  }

  // Watch every [data-bind] for textContent changes and tween instead.
  const tweenTargets = new WeakSet();
  function attachTween() {
    document.querySelectorAll('[data-bind]').forEach(el => {
      if (tweenTargets.has(el)) return;
      tweenTargets.add(el);
      el.dataset.lastText = el.textContent;
    });
  }
  // MutationObserver on the dashboard content — intercepts setText calls.
  const root = document.querySelector('.dash-content') || document.body;
  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.type !== 'characterData' && m.type !== 'childList') return;
      const target = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (!target) return;
      const el = target.closest && target.closest('[data-bind]');
      if (!el || el.dataset.notween === '1') return;
      // Re-tween if the new text differs from the last seen
      const t = el.textContent;
      if (t !== el.dataset.lastText) tweenTo(el, t);
    });
  });
  // Attach once DOM is loaded
  if (root) {
    attachTween();
    // Number tween disabled: it conflicted with the abbreviated money
    // formatter (e.g. "$47.64k") and could get stuck mid-tween. Bindings
    // now update instantly via dashboard.js's setText.
  }

  // ── Cell flash on edit + downstream ─────────────────────────────
  const flashTimers = new WeakMap();
  function flash(el, kind) {
    if (!el) return;
    el.classList.remove('bb-flash-edit', 'bb-flash-derived');
    void el.offsetWidth; // restart animation
    el.classList.add(kind === 'derived' ? 'bb-flash-derived' : 'bb-flash-edit');
    clearTimeout(flashTimers.get(el));
    flashTimers.set(el, setTimeout(() => el.classList.remove('bb-flash-edit', 'bb-flash-derived'), 900));
  }
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.matches('input, select, textarea')) return;
    // Highlight the row/cell that was just edited
    const cell = t.closest('td, .form-row, .goal-row, .v2-knob, .field-block') || t;
    flash(cell, 'edit');
    // Mark downstream KPI bindings — flash them on next rerender
    document.querySelectorAll('[data-bind]').forEach(b => b.dataset.derivedFlash = '1');
    // Snapshot for undo
    snapshotForUndo();
  });
  // When KPI text actually changes, also flash if marked
  new MutationObserver(muts => {
    muts.forEach(m => {
      const target = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      const el = target && target.closest && target.closest('[data-bind]');
      if (!el) return;
      if (el.dataset.derivedFlash === '1') {
        flash(el, 'derived');
        delete el.dataset.derivedFlash;
      }
    });
  }).observe(root, { subtree: true, childList: true, characterData: true });

  // ── Undo snackbar + Cmd/Ctrl+Z ──────────────────────────────────
  const LS = 'baobab.dashboard.v1';
  let undoStack = [];
  let undoTimer = null;
  function snapshotForUndo() {
    try {
      const cur = localStorage.getItem(LS);
      if (!cur) return;
      const last = undoStack[undoStack.length - 1];
      if (last && last === cur) return;
      undoStack.push(cur);
      if (undoStack.length > 30) undoStack.shift();
      showUndoToast();
    } catch (e) {}
  }
  function undo() {
    // Pop two: current + previous
    if (undoStack.length < 2) return;
    undoStack.pop(); // discard most recent (the post-change state)
    const prev = undoStack.pop();
    if (!prev) return;
    localStorage.setItem(LS, prev);
    location.reload();
  }
  let undoToastEl;
  function showUndoToast() {
    if (!undoToastEl) {
      undoToastEl = document.createElement('div');
      undoToastEl.className = 'bb-undo-toast';
      undoToastEl.innerHTML = `<span>Edited · <kbd>⌘Z</kbd> to undo</span><button class="bb-undo-btn">Undo</button>`;
      document.body.appendChild(undoToastEl);
      undoToastEl.querySelector('.bb-undo-btn').addEventListener('click', undo);
    }
    undoToastEl.classList.add('is-open');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => undoToastEl.classList.remove('is-open'), 4200);
  }
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      const tag = (e.target.tagName || '').toLowerCase();
      // Allow native undo inside text fields, but only if undo stack is empty or shift held
      if (tag === 'input' || tag === 'textarea') return;
      e.preventDefault();
      undo();
    }
  });
  // Snapshot the initial state once on boot
  setTimeout(snapshotForUndo, 200);

  // ── Confetti on goal completion ─────────────────────────────────
  const seenComplete = new WeakSet();
  function fireConfetti(x, y) {
    if (!playSounds.canMotion) return;
    const N = 28;
    const host = document.createElement('div');
    host.className = 'bb-confetti';
    host.style.left = x + 'px'; host.style.top = y + 'px';
    document.body.appendChild(host);
    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3D6B47',
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B98A2B',
      '#6CC79A', '#E87D5A', '#D4A547'
    ];
    for (let i = 0; i < N; i++) {
      const p = document.createElement('span');
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.3;
      const dist = 60 + Math.random() * 70;
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      p.style.setProperty('--r',  Math.round(Math.random() * 720 - 360) + 'deg');
      host.appendChild(p);
    }
    setTimeout(() => host.remove(), 1400);
    playSounds.play('confetti');
  }
  // Watch goal-bar progress; when one hits 100% for the first time, fire
  function checkGoals() {
    document.querySelectorAll('.goal-row').forEach(row => {
      if (seenComplete.has(row)) return;
      const inner = row.querySelector('.goal-bar > div');
      if (!inner) return;
      const w = parseFloat(inner.style.width || '0');
      if (w >= 99.5) {
        seenComplete.add(row);
        const r = row.getBoundingClientRect();
        fireConfetti(r.left + r.width / 2, r.top + r.height / 2);
      }
    });
  }
  new MutationObserver(checkGoals).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  setTimeout(checkGoals, 500);

  // ── Sound toggle ────────────────────────────────────────────────
  // Stored in the existing baobab.tweaks store; sounds default off.
  const playSounds = {
    enabled: false,
    canMotion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    sounds: {},
    ctx: null,
    init() {
      try {
        const t = JSON.parse(localStorage.getItem('baobab.tweaks.v1') || '{}');
        this.enabled = !!t.sounds;
      } catch (e) {}
    },
    play(name) {
      if (!this.enabled) return;
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
      const ctx = this.ctx;
      // Tiny synthesised blip per event — no audio assets needed.
      const freq = { tab: 480, save: 620, confetti: 880, error: 220 }[name] || 500;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain).connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  };
  playSounds.init();
  window.BaobabFX = { playSounds, fireConfetti, snapshotForUndo, undo };

  // Hook tab clicks for sound
  document.addEventListener('click', e => {
    if (e.target.closest('.dash-tab')) playSounds.play('tab');
  });
})();
