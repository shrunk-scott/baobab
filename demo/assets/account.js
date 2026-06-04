/* Kudz — Account settings: profile edit + password reset.
 * Persists profile to baobab.session (shared with site nav) + baobab.profile.
 */
(function () {
  'use strict';
  const root = document.getElementById('account-page');
  if (!root) return;
  const SESSION = 'baobab.session', PROFILE = 'baobab.profile';

  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch (e) { return null; } }
  function getProfile() {
    let p = {}; try { p = JSON.parse(localStorage.getItem(PROFILE) || '{}'); } catch (e) {}
    const s = getSession() || {};
    return {
      name: p.name || s.name || 'Lina Jones',
      email: p.email || s.email || 'lina@jonesfamilytrust.com.au',
      phone: p.phone || '0412 345 678',
      household: p.household || 'Jones family trust',
      address: p.address || '286 Albert Road, South Melbourne VIC 3205',
      comms: p.comms || 'email',
      twofa: p.twofa !== undefined ? p.twofa : true,
      avatar: p.avatar || s.avatar || ''
    };
  }
  function save(p) {
    localStorage.setItem(PROFILE, JSON.stringify(p));
    const s = getSession() || {};
    s.name = p.name; s.email = p.email; s.avatar = p.avatar || '';
    localStorage.setItem(SESSION, JSON.stringify(s));
  }

  function toast(msg, kind) {
    let host = document.getElementById('acc-toast');
    if (!host) { host = document.createElement('div'); host.id = 'acc-toast'; host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.style.cssText = `background:${kind==='error'?'var(--neg)':'var(--ink)'};color:#fff;padding:11px 18px;border-radius:999px;font-family:var(--font-mono);font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);`;
    t.textContent = msg; host.appendChild(t);
    setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; }, 2400);
    setTimeout(()=>t.remove(), 2800);
  }

  const p = getProfile();
  const initials = (p.name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('');

  root.innerHTML = `
    <div class="acc-hero">
      <button class="acc-avatar-btn" id="avatar-btn" title="Change profile photo" aria-label="Change profile photo">
        <span class="acc-avatar" id="acc-avatar">${p.avatar ? `<img src="${p.avatar}" alt="">` : initials}</span>
        <span class="acc-avatar-edit">✎</span>
      </button>
      <input type="file" id="avatar-input" accept="image/*" hidden>
      <div>
        <h1 id="acc-title">${p.name}</h1>
        <div class="acc-sub">${p.household} · client since FY24</div>
      </div>
    </div>

    <div class="acc-grid">
      <nav class="acc-nav">
        <a class="acc-navlink is-active" data-pane="profile">Profile</a>
        <a class="acc-navlink" data-pane="security">Security</a>
        <a class="acc-navlink" data-pane="prefs">Preferences</a>
      </nav>

      <div class="acc-panes">
        <!-- PROFILE -->
        <section class="acc-pane is-active" data-pane="profile">
          <div class="acc-card">
            <div class="acc-card-head"><h2>Profile</h2><span class="note">visible to your planner</span></div>
            <div class="acc-form">
              <label class="acc-field"><span>Full name</span><input class="field field-text" id="f-name" value="${p.name}"></label>
              <label class="acc-field"><span>Email address</span><input class="field field-text" id="f-email" type="email" value="${p.email}"></label>
              <label class="acc-field"><span>Phone</span><input class="field field-text" id="f-phone" value="${p.phone}"></label>
              <label class="acc-field"><span>Household / entity</span><input class="field field-text" id="f-household" value="${p.household}"></label>
              <label class="acc-field acc-field-wide"><span>Postal address</span><input class="field field-text" id="f-address" value="${p.address}"></label>
            </div>
            <div class="acc-actions">
              <button class="btn btn-primary btn-sm" id="save-profile">Save changes</button>
              <button class="btn btn-ghost btn-sm" id="reset-profile">Cancel</button>
            </div>
          </div>
        </section>

        <!-- SECURITY -->
        <section class="acc-pane" data-pane="security">
          <div class="acc-card">
            <div class="acc-card-head"><h2>Reset password</h2></div>
            <div class="acc-form">
              <label class="acc-field acc-field-wide"><span>Current password</span><input class="field" type="password" id="p-current" placeholder="••••••••••"></label>
              <label class="acc-field"><span>New password</span><input class="field" type="password" id="p-new" placeholder="At least 10 characters"></label>
              <label class="acc-field"><span>Confirm new password</span><input class="field" type="password" id="p-confirm" placeholder="Re-enter"></label>
            </div>
            <div class="acc-pwmeter"><div class="acc-pwmeter-bar" id="pw-bar"></div></div>
            <div class="acc-pwhint" id="pw-hint">Mix letters, numbers and symbols. We never store this in plain text.</div>
            <div class="acc-actions">
              <button class="btn btn-primary btn-sm" id="save-pw">Update password</button>
            </div>
          </div>
          <div class="acc-card">
            <div class="acc-card-head"><h2>Two-factor authentication</h2></div>
            <div class="acc-toggle-row">
              <div><div class="acc-toggle-title">Authenticator app</div><div class="acc-toggle-sub">Require a 6-digit code at sign-in.</div></div>
              <button class="acc-switch ${p.twofa?'is-on':''}" id="twofa-switch" role="switch" aria-checked="${p.twofa}"><span class="acc-switch-knob"></span></button>
            </div>
            <div class="acc-sessions">
              <div class="acc-session"><span class="dot" style="background:var(--pos)"></span> This device · Melbourne · <span class="muted">active now</span></div>
              <div class="acc-session"><span class="dot" style="background:var(--ink-4)"></span> iPhone · last seen 2 days ago <button class="acc-revoke">Revoke</button></div>
            </div>
          </div>
        </section>

        <!-- PREFERENCES -->
        <section class="acc-pane" data-pane="prefs">
          <div class="acc-card">
            <div class="acc-card-head"><h2>Communication preferences</h2></div>
            <div class="acc-radio-group" id="comms-group">
              ${[['email','Email','Updates and review reminders by email'],['sms','SMS','Time-sensitive reminders by text'],['none','Portal only','No external notifications']].map(([v,t,d])=>`
                <label class="acc-radio ${p.comms===v?'is-on':''}" data-v="${v}">
                  <input type="radio" name="comms" value="${v}" ${p.comms===v?'checked':''}>
                  <span class="acc-radio-body"><span class="acc-radio-title">${t}</span><span class="acc-radio-sub">${d}</span></span>
                </label>`).join('')}
            </div>
            <div class="acc-actions"><button class="btn btn-primary btn-sm" id="save-prefs">Save preferences</button></div>
          </div>
          <div class="acc-card acc-danger">
            <div class="acc-card-head"><h2>Close account</h2></div>
            <p class="acc-danger-note">Export your data first — closing removes portal access. Your planner will be notified.</p>
            <div class="acc-actions"><button class="btn btn-ghost btn-sm" id="close-acct">Request account closure</button></div>
          </div>
        </section>
      </div>
    </div>`;

  // Pane switching
  root.querySelectorAll('.acc-navlink').forEach(a => a.addEventListener('click', () => {
    root.querySelectorAll('.acc-navlink').forEach(x=>x.classList.toggle('is-active', x===a));
    root.querySelectorAll('.acc-pane').forEach(s=>s.classList.toggle('is-active', s.dataset.pane===a.dataset.pane));
  }));

  // Avatar upload
  const avBtn = root.querySelector('#avatar-btn');
  const avInput = root.querySelector('#avatar-input');
  const avSpan = root.querySelector('#acc-avatar');
  if (avBtn && avInput) {
    avBtn.addEventListener('click', () => avInput.click());
    avInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('Choose an image file', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        // Downscale to a square ~160px data URL to keep localStorage light.
        const img = new Image();
        img.onload = () => {
          const S = 160, c = document.createElement('canvas'); c.width = S; c.height = S;
          const ctx = c.getContext('2d');
          const side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, S, S);
          const url = c.toDataURL('image/jpeg', 0.85);
          avSpan.innerHTML = `<img src="${url}" alt="">`;
          const np = getProfile(); np.avatar = url; save(np);
          toast('Profile photo updated');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Save profile
  root.querySelector('#save-profile').addEventListener('click', () => {
    const np = { ...p,
      name: root.querySelector('#f-name').value.trim() || p.name,
      email: root.querySelector('#f-email').value.trim() || p.email,
      phone: root.querySelector('#f-phone').value.trim(),
      household: root.querySelector('#f-household').value.trim(),
      address: root.querySelector('#f-address').value.trim()
    };
    save(np);
    root.querySelector('#acc-title').textContent = np.name;
    toast('Profile saved');
  });
  root.querySelector('#reset-profile').addEventListener('click', () => location.reload());

  // Password strength
  const pwNew = root.querySelector('#p-new'), bar = root.querySelector('#pw-bar'), hint = root.querySelector('#pw-hint');
  pwNew.addEventListener('input', () => {
    const v = pwNew.value; let s = 0;
    if (v.length>=8) s++; if (v.length>=12) s++;
    if (/[0-9]/.test(v)&&/[a-z]/.test(v)&&/[A-Z]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)&&v.length>=10) s++;
    bar.style.width = (s/4*100)+'%';
    bar.style.background = s>=4?'var(--pos)':s>=2?'var(--accent)':'var(--neg)';
    hint.textContent = ['Too short','Weak','Okay','Strong','Excellent'][s] + ' — mix letters, numbers and symbols.';
  });
  root.querySelector('#save-pw').addEventListener('click', () => {
    const cur = root.querySelector('#p-current').value, nw = pwNew.value, cf = root.querySelector('#p-confirm').value;
    if (!cur) return toast('Enter your current password', 'error');
    if (nw.length < 10) return toast('New password too short', 'error');
    if (nw !== cf) return toast('Passwords do not match', 'error');
    root.querySelector('#p-current').value = ''; pwNew.value = ''; root.querySelector('#p-confirm').value = '';
    bar.style.width = '0'; hint.textContent = 'Password updated — you stay signed in on this device.';
    toast('Password updated');
  });

  // 2FA toggle
  const sw = root.querySelector('#twofa-switch');
  sw.addEventListener('click', () => {
    const on = !sw.classList.contains('is-on');
    sw.classList.toggle('is-on', on); sw.setAttribute('aria-checked', on);
    const np = getProfile(); np.twofa = on; save(np);
    toast(on ? 'Two-factor enabled' : 'Two-factor disabled');
  });

  // Comms radios
  root.querySelectorAll('#comms-group .acc-radio').forEach(r => r.addEventListener('click', () => {
    root.querySelectorAll('#comms-group .acc-radio').forEach(x=>x.classList.toggle('is-on', x===r));
  }));
  root.querySelector('#save-prefs').addEventListener('click', () => {
    const sel = root.querySelector('#comms-group input:checked');
    const np = getProfile(); np.comms = sel ? sel.value : 'email'; save(np);
    toast('Preferences saved');
  });
  root.querySelectorAll('.acc-revoke').forEach(b => b.addEventListener('click', () => { b.closest('.acc-session').remove(); toast('Session revoked'); }));
  root.querySelector('#close-acct').addEventListener('click', () => { if (confirm('Request account closure? Your planner will follow up to confirm.')) toast('Closure request sent'); });
})();
