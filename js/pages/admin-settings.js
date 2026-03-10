/* ===== SYSTÉMOVÁ NASTAVENÍ (jen admin) ===== */

var SECRET_KEYS = ['api_klic', 'smtp_heslo', 'cuzk_heslo', 'cuzk_api_klic'];

var SETTINGS_SECTIONS = {
  smtp: { prefix: 'smtp_',    title: 'E-mail (SMTP)' },
  ares: { prefix: 'ares_',    title: 'Integrace: ARES (automatické načítání dat SVJ)' },
  cuzk: { prefix: 'cuzk_',    title: 'Integrace: ČÚZK — Katastr nemovitostí (API KN)' },
  svj:  { prefix: 'svj_',     title: 'Základní informace o portálu' },
};

function renderSystemCard(el) {
  var card = makeAdminCard('Syst\u00e9mov\u00e1 nastaven\u00ed');
  var body = card.body;

  var err  = makeAdminInfoBox(false);
  var ok   = makeAdminInfoBox(true);
  var wrap = document.createElement('div');
  wrap.style.maxWidth = '540px';

  body.appendChild(err);
  body.appendChild(ok);
  body.appendChild(wrap);
  el.appendChild(card.card);

  Api.apiGet('api/admin.php?action=getSettings')
    .then(function(data) { renderSettingsForm(wrap, data.settings, err, ok); })
    .catch(function(e) { showAdminBox(err, e.message || 'Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed.'); });
}

function renderSettingsForm(wrap, settings, errBox, okBox) {
  wrap.replaceChildren();

  var form = document.createElement('form');
  var inputs = {};
  var lastSection = null;

  settings.forEach(function(s) {
    var section = getSectionTitle(s.key);
    if (section && section !== lastSection) {
      var sep = document.createElement('div');
      sep.style.cssText = 'margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--border);' +
                          'font-weight:600;font-size:0.82rem;color:var(--text-light);letter-spacing:.05em;';
      sep.textContent = section.toUpperCase();
      form.appendChild(sep);
      lastSection = section;
    }

    var isSecret   = SECRET_KEYS.indexOf(s.key) !== -1;
    var inputType  = isSecret ? 'password' : detectInputType(s.key);
    var grp        = makeAdminField(s.label, inputType, 'cfg-' + s.key, s.value || '');
    inputs[s.key]  = grp.input;

    if (isSecret) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = 'Zobrazit';
      toggle.style.cssText = 'margin-top:3px;font-size:0.8rem;background:none;border:none;' +
                             'color:var(--primary);cursor:pointer;padding:0;';
      toggle.addEventListener('click', function() {
        grp.input.type = grp.input.type === 'password' ? 'text' : 'password';
        toggle.textContent = grp.input.type === 'password' ? 'Zobrazit' : 'Skr\u00fdt';
      });
      grp.el.appendChild(toggle);
    }

    form.appendChild(grp.el);
  });

  var saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.marginTop = '8px';
  saveBtn.textContent = 'Ulo\u017eit nastaven\u00ed';
  form.appendChild(saveBtn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideAdminBox(errBox); hideAdminBox(okBox);
    saveBtn.disabled = true;

    Promise.all(settings.map(function(s) {
      return Api.apiPost('api/admin.php?action=updateSetting', { key: s.key, value: inputs[s.key].value });
    }))
      .then(function() { showAdminBox(okBox, 'Nastaven\u00ed ulo\u017eeno.'); })
      .catch(function(e) { showAdminBox(errBox, e.message || 'Chyba.'); })
      .finally(function() { saveBtn.disabled = false; });
  });

  wrap.appendChild(form);
}

function detectInputType(key) {
  if (key.indexOf('url') !== -1 || key.indexOf('web') !== -1) return 'url';
  if (key.indexOf('kontakt') !== -1 || key.indexOf('odesilatel') !== -1) return 'email';
  if (key.indexOf('port') !== -1) return 'number';
  return 'text';
}

function getSectionTitle(key) {
  var sections = Object.values(SETTINGS_SECTIONS);
  for (var i = 0; i < sections.length; i++) {
    if (key.indexOf(sections[i].prefix) === 0) return sections[i].title;
  }
  return null;
}
