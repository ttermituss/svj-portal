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

  var jmenoGrp    = makeField('Jméno *',   'text',  'p-jmeno',    user.jmeno    || '');
  var prijmeniGrp = makeField('Příjmení',  'text',  'p-prijmeni', user.prijmeni || '');
  var emailGrp    = makeField('E-mail *',  'email', 'p-email',    user.email    || '');
  var telefonGrp  = makeField('Telefon',   'tel',   'p-telefon',  user.telefon  || '');
  telefonGrp.input.placeholder = 'např. +420 777 123 456';

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

  var oldGrp  = makeField('Stávající heslo',           'password', 'pw-old',  '');
  var newGrp  = makeField('Nové heslo (min. 8 znaků)', 'password', 'pw-new',  '');
  var new2Grp = makeField('Nové heslo znovu',           'password', 'pw-new2', '');
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

function makeField(labelText, type, id, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var inp = document.createElement('input');
  inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = value;
  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return { el: wrap, input: inp };
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
    'color:#fff', 'font-size:0.72rem', 'font-weight:600', 'pointer-events:none',
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
  hint.style.cssText = 'font-size:0.78rem;color:var(--text-light);';
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
