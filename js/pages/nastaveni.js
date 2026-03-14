/* ===== NASTAVENÍ UŽIVATELE ===== */

Router.register('nastaveni', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Nastavení účtu';
  var sub = document.createElement('p');
  sub.textContent = 'Správa vašeho profilu a přihlašovacích údajů';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // 2-sloupcový grid: Profil vlevo, Heslo vpravo
  var grid = document.createElement('div');
  grid.style.cssText = [
    'display:grid',
    'grid-template-columns:1fr 1fr',
    'gap:24px',
    'align-items:stretch',
  ].join(';');
  el.appendChild(grid);

  renderProfileCard(grid, user);
  renderPasswordCard(grid);

  // Notifikace karta — full width
  var notifWrap = document.createElement('div');
  notifWrap.style.cssText = 'grid-column:1/-1;';
  renderNotifPrefsCard(notifWrap);
  grid.appendChild(notifWrap);

  // Google integrace karta — full width
  var googleWrap = document.createElement('div');
  googleWrap.style.cssText = 'grid-column:1/-1;';
  renderGoogleCard(googleWrap);
  grid.appendChild(googleWrap);

  // Toast po úspěšném připojení Google
  var params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  if (params.get('google') === 'connected') {
    showToast('Google \u00fa\u010det byl \u00fasp\u011b\u0161n\u011b propojen.', 'success');
    history.replaceState(null, '', '/#nastaveni');
  }
  if (params.get('google_error')) {
    var errMap = {
      session_expired: 'Sezen\u00ed vypr\u0161elo, p\u0159ihlaste se znovu.',
      invalid_state: 'Neplatn\u00fd po\u017eadavek. Zkuste to znovu.',
      token_exchange_failed: 'P\u0159ipojen\u00ed selhalo. Zkuste to znovu.',
      access_denied: 'P\u0159\u00edstup byl odm\u00edtnut.',
      not_configured: 'Google OAuth nen\u00ed nastaven. Vypl\u0148te Client ID a Secret v Syst\u00e9mov\u00fdch nastaven\u00edch.',
      missing_params: 'Chyb\u011bj\u00edc\u00ed parametry z Google. Zkuste to znovu.',
    };
    showToast(errMap[params.get('google_error')] || 'Chyba p\u0159i p\u0159ipojov\u00e1n\u00ed Google \u00fa\u010dtu.', 'error');
    history.replaceState(null, '', '/#nastaveni');
  }

  // Responzivita — stacked na mobilu
  var mq = window.matchMedia('(max-width: 768px)');
  function applyMq(e) {
    grid.style.gridTemplateColumns = e.matches ? '1fr' : '1fr 1fr';
  }
  applyMq(mq);
  mq.addEventListener('change', applyMq);
});

/* ===== KARTA: PROFIL ===== */

function renderProfileCard(container, user) {
  var card = makeCard('Můj profil');
  var body = card.body;

  renderAvatarWidget(body, user);

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);

  var form = document.createElement('form');

  var jmenoGrp    = makeFormField('Jméno *',   'text',  user.jmeno    || '', { required: true });
  var prijmeniGrp = makeFormField('Příjmení',  'text',  user.prijmeni || '');
  var emailGrp    = makeFormField('E-mail *',  'email', user.email    || '', { required: true });
  var telefonGrp  = makeFormField('Telefon',   'tel',   user.telefon  || '', { placeholder: 'např. +420 777 123 456' });

  var btn = makeSubmitBtn('Uložit profil');

  form.appendChild(jmenoGrp.el);
  form.appendChild(prijmeniGrp.el);
  form.appendChild(emailGrp.el);
  form.appendChild(telefonGrp.el);
  form.appendChild(err);
  form.appendChild(ok);
  form.appendChild(btn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideBox(err); hideBox(ok);

    var jmeno    = jmenoGrp.input.value.trim();
    var prijmeni = prijmeniGrp.input.value.trim();
    var email    = emailGrp.input.value.trim();
    var telefon  = telefonGrp.input.value.trim();

    if (!jmeno) { showBox(err, 'Jméno nesmí být prázdné.'); return; }
    if (!email) { showBox(err, 'E-mail nesmí být prázdný.'); return; }

    btn.disabled = true;
    Api.apiPost('api/user.php?action=updateProfile', { jmeno: jmeno, prijmeni: prijmeni, email: email, telefon: telefon })
      .then(function() {
        showBox(ok, 'Profil byl uložen.');
        var u = Auth.getUser();
        if (u) { u.jmeno = jmeno; u.prijmeni = prijmeni; u.email = email; u.telefon = telefon; buildNavWithUser(); }
      })
      .catch(function(e) { showBox(err, e.message || 'Chyba při ukládání.'); })
      .finally(function() { btn.disabled = false; });
  });

  body.appendChild(form);
  container.appendChild(card.card);
}

/* ===== KARTA: HESLO ===== */

function renderPasswordCard(container) {
  var card = makeCard('Změna hesla');
  var body = card.body;

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);

  var form = document.createElement('form');

  var oldGrp  = makeFormField('Stávající heslo',           'password', '');
  var newGrp  = makeFormField('Nové heslo (min. 8 znaků)', 'password', '');
  var new2Grp = makeFormField('Nové heslo znovu',           'password', '');
  var btn     = makeSubmitBtn('Změnit heslo');

  form.appendChild(oldGrp.el);
  form.appendChild(newGrp.el);
  form.appendChild(new2Grp.el);
  form.appendChild(err);
  form.appendChild(ok);
  form.appendChild(btn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideBox(err); hideBox(ok);
    var oldPw  = oldGrp.input.value;
    var newPw  = newGrp.input.value;
    var newPw2 = new2Grp.input.value;
    if (!oldPw || !newPw || !newPw2) { showBox(err, 'Vyplňte všechna pole.'); return; }
    if (newPw.length < 8)            { showBox(err, 'Nové heslo musí mít alespoň 8 znaků.'); return; }
    if (newPw !== newPw2)            { showBox(err, 'Hesla se neshodují.'); return; }
    btn.disabled = true;
    Api.apiPost('api/user.php?action=changePassword', { old_password: oldPw, new_password: newPw })
      .then(function() { showBox(ok, 'Heslo bylo změněno.'); form.reset(); })
      .catch(function(e) { showBox(err, e.message || 'Chyba.'); })
      .finally(function() { btn.disabled = false; });
  });

  body.appendChild(form);
  container.appendChild(card.card);
}

/* ===== KARTA: NOTIFIKACE ===== */

function renderNotifPrefsCard(container) {
  var card = makeCard('Notifikace');
  var body = card.body;

  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 16px;';
  desc.textContent = 'Zvolte, kter\u00e9 notifikace chcete dost\u00e1vat v port\u00e1lu.';
  body.appendChild(desc);

  var prefs = [
    { key: 'notif_udalosti',  label: 'Ud\u00e1losti v kalend\u00e1\u0159i',  icon: '\uD83D\uDCC5' },
    { key: 'notif_zavady',    label: 'Hl\u00e1\u0161en\u00ed z\u00e1vad',     icon: '\u26A0\uFE0F' },
    { key: 'notif_hlasovani', label: 'Nov\u00e1 hlasov\u00e1n\u00ed',          icon: '\uD83D\uDDF3\uFE0F' },
    { key: 'notif_revize',    label: 'Bl\u00ed\u017e\u00edc\u00ed se revize',  icon: '\uD83D\uDD27' },
    { key: 'notif_fond',      label: 'Fond oprav',                           icon: '\uD83D\uDCB0' },
  ];

  var toggles = {};
  var loading = document.createElement('div');
  loading.style.cssText = 'text-align:center;padding:12px;color:var(--text-light);font-size:0.85rem;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  body.appendChild(loading);

  Api.apiGet('api/user.php?action=getNotifPrefs')
    .then(function(data) {
      loading.remove();
      prefs.forEach(function(p) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'
          + 'padding:10px 0;border-bottom:1px solid var(--border);';

        var left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:10px;';
        var iconEl = document.createElement('span');
        iconEl.style.fontSize = '1.1rem';
        iconEl.textContent = p.icon;
        left.appendChild(iconEl);
        var labelEl = document.createElement('span');
        labelEl.style.cssText = 'font-size:0.9rem;';
        labelEl.textContent = p.label;
        left.appendChild(labelEl);
        row.appendChild(left);

        // Toggle switch
        var toggle = document.createElement('label');
        toggle.style.cssText = 'position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', !!data[p.key] ? 'true' : 'false');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!data[p.key];
        cb.style.cssText = 'opacity:0;width:0;height:0;';
        cb.setAttribute('aria-hidden', 'true');
        cb.tabIndex = -1;
        toggle.tabIndex = 0;
        var slider = document.createElement('span');
        slider.style.cssText = 'position:absolute;inset:0;background:var(--border);border-radius:12px;transition:0.2s;';
        var knob = document.createElement('span');
        knob.style.cssText = 'position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;'
          + 'border-radius:50%;transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);';

        function syncToggle() {
          if (cb.checked) {
            slider.style.background = 'var(--accent)';
            knob.style.transform = 'translateX(20px)';
          } else {
            slider.style.background = 'var(--border)';
            knob.style.transform = 'translateX(0)';
          }
          toggle.setAttribute('aria-checked', cb.checked ? 'true' : 'false');
        }
        syncToggle();

        // Allow keyboard toggle via Space/Enter on the label
        toggle.addEventListener('keydown', function(e) {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
          }
        });

        cb.addEventListener('change', function() {
          syncToggle();
          var payload = {};
          payload[p.key] = cb.checked ? 1 : 0;
          Api.apiPost('api/user.php?action=updateNotifPrefs', payload)
            .then(function() { showToast('Nastaven\u00ed ulo\u017eeno.', 'success'); })
            .catch(function() { showToast('Chyba p\u0159i ukl\u00e1d\u00e1n\u00ed.', 'error'); cb.checked = !cb.checked; syncToggle(); });
        });

        slider.appendChild(knob);
        toggle.appendChild(cb);
        toggle.appendChild(slider);
        row.appendChild(toggle);

        toggles[p.key] = cb;
        body.appendChild(row);
      });
    })
    .catch(function() {
      loading.textContent = 'Chyba na\u010d\u00edt\u00e1n\u00ed nastaven\u00ed.';
      loading.style.color = 'var(--danger)';
    });

  container.appendChild(card.card);
}

/* ===== HELPERS ===== */

function makeCard(title) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'height:100%;display:flex;flex-direction:column;margin-top:0;';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.textContent = title;
  hdr.appendChild(h2);
  card.appendChild(hdr);
  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.flex = '1';
  card.appendChild(body);
  return { card: card, body: body };
}


function makeSubmitBtn(text) {
  var btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'btn btn-primary';
  btn.style.marginTop = '4px';
  btn.textContent = text;
  return btn;
}

function makeInfoBox(isOk) {
  var b = document.createElement('div');
  b.className = isOk ? 'info-box info-box-success' : 'info-box info-box-danger';
  b.style.cssText = 'display:none;margin-bottom:12px;';
  return b;
}

function showBox(b, t) { b.textContent = t; b.style.display = ''; }
function hideBox(b)    { b.style.display = 'none'; b.textContent = ''; }

/* ===== AVATAR WIDGET ===== */

function renderAvatarWidget(body, user) {
  var wrap = document.createElement('div');
  wrap.style.cssText = [
    'display:flex', 'flex-direction:column', 'align-items:center', 'gap:10px',
    'margin-bottom:20px', 'padding-bottom:20px',
    'border-bottom:1px solid var(--border-light)',
  ].join(';');

  // Klikatelný kruh s avatarem
  var circleWrap = document.createElement('div');
  circleWrap.style.cssText = 'position:relative;cursor:pointer;width:80px;height:80px;border-radius:50%;overflow:hidden;';

  var avatarEl = makeAvatarEl(Auth.getUser() || user, 80);
  circleWrap.appendChild(avatarEl);

  // Overlay „Změnit" při hoveru
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute', 'inset:0',
    'background:rgba(0,0,0,0.38)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'opacity:0', 'transition:opacity .15s',
    'color:#fff', 'font-size:0.82rem', 'font-weight:600', 'pointer-events:none',
  ].join(';');
  overlay.textContent = 'Změnit';
  circleWrap.appendChild(overlay);
  circleWrap.addEventListener('mouseenter', function() { overlay.style.opacity = '1'; });
  circleWrap.addEventListener('mouseleave', function() { overlay.style.opacity = '0'; });
  wrap.appendChild(circleWrap);

  // Skrytý file input
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
  fileInput.style.display = 'none';
  wrap.appendChild(fileInput);

  // Tlačítka
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;align-items:center;';

  var changeBtn = document.createElement('button');
  changeBtn.type = 'button';
  changeBtn.className = 'btn btn-secondary btn-sm';
  changeBtn.textContent = 'Změnit foto';

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-sm';
  removeBtn.style.color = 'var(--danger)';
  removeBtn.textContent = 'Odebrat';

  function syncRemoveBtn() {
    var u = Auth.getUser() || user;
    removeBtn.style.display = (u && u.avatar) ? '' : 'none';
  }
  syncRemoveBtn();

  btnRow.appendChild(changeBtn);
  btnRow.appendChild(removeBtn);
  wrap.appendChild(btnRow);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  hint.textContent = 'Max 2 MB \u00b7 JPEG, PNG, GIF, WebP';
  wrap.appendChild(hint);

  body.appendChild(wrap);

  // === Eventy ===
  function openPicker() { fileInput.click(); }
  circleWrap.addEventListener('click', openPicker);
  changeBtn.addEventListener('click', openPicker);

  fileInput.addEventListener('change', function() {
    if (!fileInput.files || !fileInput.files[0]) return;
    var fd = new FormData();
    fd.append('avatar', fileInput.files[0]);
    changeBtn.disabled = true;
    hint.textContent = 'Nahrávám\u2026';
    fetch('api/avatar.php?action=upload', { method: 'POST', credentials: 'include', body: fd })
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw { message: d.error ? d.error.message : 'Chyba nahrávání' };
          return d;
        });
      })
      .then(function(data) {
        var u = Auth.getUser();
        if (u) u.avatar = data.avatar;
        var newEl = makeAvatarEl(u, 80);
        circleWrap.replaceChild(newEl, avatarEl);
        avatarEl = newEl;
        syncRemoveBtn();
        buildNavWithUser();
        showToast('Profilový obrázek byl uložen.', 'success');
        handleGdriveFeedback(data);
      })
      .catch(function(e) { showToast(e.message || 'Chyba při nahrávání.', 'error'); })
      .finally(function() {
        changeBtn.disabled = false;
        hint.textContent = 'Max 2 MB \u00b7 JPEG, PNG, GIF, WebP';
        fileInput.value = '';
      });
  });

  removeBtn.addEventListener('click', function() {
    showConfirmModal('Odebrat avatar?', 'Profilový obrázek bude trvale smazán.', function() {
      removeBtn.disabled = true;
      fetch('api/avatar.php?action=delete', { method: 'POST', credentials: 'include' })
        .then(function(res) { return res.json(); })
        .then(function() {
          var u = Auth.getUser();
          if (u) u.avatar = null;
          var newEl = makeAvatarEl(u, 80);
          circleWrap.replaceChild(newEl, avatarEl);
          avatarEl = newEl;
          syncRemoveBtn();
          buildNavWithUser();
          showToast('Avatar byl odebrán.', 'success');
        })
        .catch(function() { showToast('Chyba při odebírání.', 'error'); })
        .finally(function() { removeBtn.disabled = false; });
    });
  });
}

/* renderGoogleCard() je v nastaveni-google.js */
