/* ===== NASTAVENÍ UŽIVATELE ===== */

Router.register('nastaveni', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Nastavení účtu';
  var sub = document.createElement('p');
  sub.textContent = 'Správa vašeho profilu a přístupu';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  renderProfileCard(el, user);
  renderSvjCard(el, user);
  renderPasswordCard(el);
  if (user.role === 'admin') renderApiKeysCard(el);
});

/* ===== KARTA: PROFIL ===== */

function renderProfileCard(el, user) {
  var card = makeCard('Můj profil');
  var body = card.body;

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);

  var form = document.createElement('form');
  form.style.maxWidth = '420px';

  var jmenoGrp    = makeField('Jméno *',  'text',  'p-jmeno',    user.jmeno    || '');
  var prijmeniGrp = makeField('Příjmení', 'text',  'p-prijmeni', user.prijmeni || '');
  var emailGrp    = makeField('E-mail *', 'email', 'p-email',    user.email    || '');

  var btn = makeSubmitBtn('Uložit profil');

  form.appendChild(jmenoGrp.el);
  form.appendChild(prijmeniGrp.el);
  form.appendChild(emailGrp.el);
  form.appendChild(err);
  form.appendChild(ok);
  form.appendChild(btn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideBox(err); hideBox(ok);

    var jmeno    = jmenoGrp.input.value.trim();
    var prijmeni = prijmeniGrp.input.value.trim();
    var email    = emailGrp.input.value.trim();

    if (!jmeno)  { showBox(err, 'Jméno nesmí být prázdné.'); return; }
    if (!email)  { showBox(err, 'E-mail nesmí být prázdný.'); return; }

    btn.disabled = true;
    Api.apiPost('api/user.php?action=updateProfile', { jmeno: jmeno, prijmeni: prijmeni, email: email })
      .then(function() {
        showBox(ok, 'Profil byl uložen.');
        var u = Auth.getUser();
        if (u) { u.jmeno = jmeno; u.prijmeni = prijmeni; u.email = email; buildNavWithUser(); }
      })
      .catch(function(e) { showBox(err, e.message || 'Chyba při ukládání.'); })
      .finally(function() { btn.disabled = false; });
  });

  body.appendChild(form);
  el.appendChild(card.card);
}

/* ===== KARTA: SVJ ===== */

function renderSvjCard(el, user) {
  var card = makeCard('Propojená SVJ');
  var body = card.body;

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);

  // Aktuální stav
  var statusP = document.createElement('p');
  statusP.style.cssText = 'margin-bottom:16px;font-size:0.9rem;';
  if (user.svj_id) {
    var svj = Auth.getSvj();
    statusP.innerHTML = '<strong>Propojeno:</strong> ' +
      (svj ? (svj.nazev + ' <span style="color:var(--text-light)">(IČO: ' + svj.ico + ')</span>') : 'ID ' + user.svj_id);
  } else {
    statusP.style.color = 'var(--text-light)';
    statusP.textContent = 'Žádná SVJ není propojena.';
  }
  body.appendChild(statusP);

  // Formulář propojení
  var row = document.createElement('div');
  row.className = 'form-row';
  row.style.marginBottom = '8px';

  var icoInput = document.createElement('input');
  icoInput.type = 'text';
  icoInput.className = 'form-input';
  icoInput.placeholder = 'IČO (8 číslic)';
  icoInput.maxLength = 8;
  icoInput.style.fontFamily = 'monospace';

  var findBtn = document.createElement('button');
  findBtn.type = 'button';
  findBtn.className = 'btn btn-primary';
  findBtn.textContent = 'Vyhledat a propojit';

  row.appendChild(icoInput);
  row.appendChild(findBtn);
  body.appendChild(row);
  body.appendChild(err);
  body.appendChild(ok);

  // Odpojit (jen pokud je propojeno)
  if (user.svj_id) {
    var unlinkBtn = document.createElement('button');
    unlinkBtn.type = 'button';
    unlinkBtn.className = 'btn btn-secondary';
    unlinkBtn.style.marginTop = '8px';
    unlinkBtn.textContent = 'Odpojit SVJ';
    unlinkBtn.addEventListener('click', function() {
      if (!confirm('Opravdu odpojit SVJ?')) return;
      Api.apiPost('api/user.php?action=updateSvj', { svj_id: null })
        .then(function() { location.reload(); })
        .catch(function(e) { showBox(err, e.message || 'Chyba.'); });
    });
    body.appendChild(unlinkBtn);
  }

  findBtn.addEventListener('click', function() {
    var ico = icoInput.value.trim();
    if (!ico) { showBox(err, 'Zadejte IČO.'); return; }
    hideBox(err); hideBox(ok);
    findBtn.disabled = true;
    findBtn.textContent = 'Vyhledávám...';
    Api.lookupAres(ico)
      .then(function(data) {
        return Api.apiPost('api/user.php?action=updateSvj', { svj_id: data.svj_id })
          .then(function() {
            showBox(ok, 'Propojeno: ' + (data.obchodniJmeno || ico));
            setTimeout(function() { location.reload(); }, 1200);
          });
      })
      .catch(function(e) { showBox(err, e.message || 'SVJ nenalezeno.'); })
      .finally(function() { findBtn.disabled = false; findBtn.textContent = 'Vyhledat a propojit'; });
  });

  el.appendChild(card.card);
}

/* ===== KARTA: HESLO ===== */

function renderPasswordCard(el) {
  var card = makeCard('Změna hesla');
  var body = card.body;

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);

  var form = document.createElement('form');
  form.style.maxWidth = '420px';

  var oldGrp  = makeField('Stávající heslo',          'password', 'pw-old',  '');
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
    var oldPw = oldGrp.input.value;
    var newPw = newGrp.input.value;
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
  el.appendChild(card.card);
}

/* ===== HELPERS ===== */

function makeCard(title) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '24px';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.textContent = title;
  hdr.appendChild(h2);
  card.appendChild(hdr);
  var body = document.createElement('div');
  body.className = 'card-body';
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

/* ===== KARTA: API KLÍČE (pouze admin) ===== */

function renderApiKeysCard(el) {
  var card = makeCard('API klíče (admin)');
  var body = card.body;

  var note = document.createElement('p');
  note.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin-bottom:16px;';
  note.textContent = 'Klíče jsou uloženy šifrovaně v databázi. Plaintext se nikdy neposílá zpět.';
  body.appendChild(note);

  var err = makeInfoBox(false);
  var ok  = makeInfoBox(true);
  body.appendChild(err);
  body.appendChild(ok);

  var list = document.createElement('div');
  body.appendChild(list);

  Api.apiGet('api/settings.php?action=get')
    .then(function(data) {
      (data.settings || []).forEach(function(s) {
        list.appendChild(buildSettingRow(s, err, ok));
      });
    })
    .catch(function(e) { showBox(err, e.message || 'Chyba načítání nastavení.'); });

  el.appendChild(card.card);
}

function buildSettingRow(setting, err, ok) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:18px;border-bottom:1px solid var(--border);padding-bottom:14px;';

  var lbl = document.createElement('label');
  lbl.textContent = setting.label;
  lbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;font-size:0.9rem;';
  wrap.appendChild(lbl);

  var status = document.createElement('span');
  status.style.cssText = 'font-size:0.8rem;color:' + (setting.set ? 'var(--success)' : 'var(--danger)') + ';display:block;margin-bottom:8px;';
  status.textContent = setting.set ? ('Nastaveno: ' + setting.preview) : 'Není nastaveno';
  wrap.appendChild(status);

  var row = document.createElement('div');
  row.className = 'form-row';

  var input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-input';
  input.placeholder = setting.set ? 'Zadat nový klíč…' : 'Zadat klíč…';
  input.autocomplete = 'off';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary';
  btn.textContent = 'Uložit';

  row.appendChild(input);
  row.appendChild(btn);
  wrap.appendChild(row);

  btn.addEventListener('click', function() {
    var val = input.value.trim();
    if (!val) { showBox(err, 'Zadejte hodnotu.'); return; }
    btn.disabled = true;
    btn.textContent = 'Ukládám…';
    Api.apiPost('api/settings.php?action=set', { key: setting.key, value: val })
      .then(function() {
        showBox(ok, setting.label + ' byl úspěšně uložen.');
        input.value = '';
        status.textContent = 'Nastaveno: ********';
        status.style.color = 'var(--success)';
        setting.set = true;
      })
      .catch(function(e) { showBox(err, e.message || 'Chyba uložení.'); })
      .finally(function() { btn.disabled = false; btn.textContent = 'Uložit'; });
  });

  return wrap;
}

function showBox(b, t) { b.textContent = t; b.style.display = ''; }
function hideBox(b)    { b.style.display = 'none'; b.textContent = ''; }
