/* ===== REGISTRACE PAGE ===== */

Router.register('registrace', function(el) {
  if (Auth.isLoggedIn()) { Router.navigate('home'); return; }

  // Zkontrolovat token v URL (?invite=TOKEN)
  var urlToken = new URLSearchParams(window.location.search).get('invite') || '';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;justify-content:center;align-items:flex-start;min-height:60vh;padding:32px 0;';

  var card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'width:100%;max-width:500px;';

  /* ---- Header ---- */
  var header = document.createElement('div');
  header.className = 'card-header';
  header.style.textAlign = 'center';
  var h2 = document.createElement('h2');
  h2.textContent = 'Registrace';
  header.appendChild(h2);
  card.appendChild(header);

  /* ---- Tabs ---- */
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;border-bottom:2px solid var(--border);';

  function makeTab(label, active) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.cssText = 'flex:1;padding:12px;border:none;background:none;cursor:pointer;' +
      'font-size:0.95rem;font-weight:500;color:var(--text-light);transition:color .15s;' +
      'border-bottom:3px solid transparent;margin-bottom:-2px;';
    if (active) {
      btn.style.color = 'var(--primary)';
      btn.style.borderBottomColor = 'var(--primary)';
    }
    return btn;
  }

  var startOnInvite = !!urlToken;
  var tabAdmin  = makeTab('Zakládám SVJ', !startOnInvite);
  var tabInvite = makeTab('Mám pozvánku', startOnInvite);
  tabBar.appendChild(tabAdmin);
  tabBar.appendChild(tabInvite);
  card.appendChild(tabBar);

  /* ---- Body ---- */
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);

  wrap.appendChild(card);
  el.appendChild(wrap);

  /* ---- Tab switching ---- */
  function setActiveTab(btn) {
    [tabAdmin, tabInvite].forEach(function(t) {
      t.style.color = 'var(--text-light)';
      t.style.borderBottomColor = 'transparent';
    });
    btn.style.color = 'var(--primary)';
    btn.style.borderBottomColor = 'var(--primary)';
  }

  tabAdmin.addEventListener('click', function() { setActiveTab(tabAdmin); renderAdminFlow(); });
  tabInvite.addEventListener('click', function() { setActiveTab(tabInvite); renderInviteFlow(''); });

  if (startOnInvite) { renderInviteFlow(urlToken); } else { renderAdminFlow(); }

  /* ========================================================
   * FLOW A — Zakládám SVJ (registrace správce / výboru)
   * ====================================================== */
  function renderAdminFlow() {
    body.replaceChildren();

    var desc = makeDesc('Zakládáte SVJ portál pro váš dům. Zadejte IČO a údaje načteme z ARES — ostatní vlastníky pak pozvete přes pozvánkový odkaz.');
    body.appendChild(desc);

    var errorBox = makeErrorBox();
    body.appendChild(errorBox);

    /* IČO */
    var icoWrap = document.createElement('div');
    icoWrap.style.marginBottom = '16px';
    var icoLabel = document.createElement('label');
    icoLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;';
    icoLabel.textContent = 'IČO vaší SVJ *';
    icoWrap.appendChild(icoLabel);

    var icoRow = document.createElement('div');
    icoRow.className = 'form-row';
    var icoInput = document.createElement('input');
    icoInput.type = 'text';
    icoInput.className = 'form-input';
    icoInput.placeholder = 'např. 27838749';
    icoInput.maxLength = 8;
    icoInput.style.fontFamily = 'monospace';
    var icoBtn = document.createElement('button');
    icoBtn.className = 'btn btn-secondary';
    icoBtn.type = 'button';
    icoBtn.textContent = 'Ověřit v ARES';
    icoRow.appendChild(icoInput);
    icoRow.appendChild(icoBtn);
    icoWrap.appendChild(icoRow);

    var icoResult = document.createElement('div');
    icoResult.style.cssText = 'margin-top:8px;display:none;';
    icoWrap.appendChild(icoResult);
    body.appendChild(icoWrap);

    var currentSvjId = null;
    var currentIco   = null;

    var jmenoInput    = addField(body, 'Jméno *',       'text',     'Jan',             { autocomplete: 'given-name',   required: true,  maxLength: 100 });
    var prijmeniInput = addField(body, 'Příjmení',       'text',     'Novák',           { autocomplete: 'family-name',  maxLength: 100 });
    var emailInput    = addField(body, 'E-mail *',       'email',    'vas@email.cz',    { autocomplete: 'email',        required: true,  maxLength: 255 });
    var passInput     = addField(body, 'Heslo *',        'password', 'Alespoň 8 znaků', { autocomplete: 'new-password', required: true,  minLength: 8,  maxLength: 128 });
    var pass2Input    = addField(body, 'Heslo znovu *',  'password', 'Zopakujte heslo', { autocomplete: 'new-password', required: true,  minLength: 8,  maxLength: 128 });

    var regBtn = makeSubmitBtn('Zaregistrovat SVJ portál');
    body.appendChild(regBtn);
    body.appendChild(makeLoginLink());

    icoBtn.addEventListener('click', doIcoLookup);
    icoInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doIcoLookup(); } });
    icoInput.addEventListener('input', function() {
      if (!icoInput.value.trim()) { icoResult.style.display = 'none'; currentSvjId = null; }
    });

    function doIcoLookup() {
      var ico = icoInput.value.trim();
      if (!ico) return;
      icoBtn.disabled = true; icoBtn.textContent = '...';
      icoResult.style.display = 'none'; currentSvjId = null;

      Api.lookupAres(ico)
        .then(function(data) {
          currentSvjId = data.svj_id || null;
          currentIco   = ico;
          icoResult.className = 'info-box info-box-success';
          icoResult.textContent = '\u2713 ' + (data.obchodniJmeno || ico);
          icoResult.style.display = 'flex';
        })
        .catch(function(err) {
          icoResult.className = 'info-box info-box-danger';
          icoResult.textContent = err.message || 'SVJ nenalezeno';
          icoResult.style.display = 'flex';
        })
        .finally(function() { icoBtn.disabled = false; icoBtn.textContent = 'Ověřit v ARES'; });
    }

    regBtn.addEventListener('click', doRegisterAdmin);
    pass2Input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegisterAdmin(); });

    function doRegisterAdmin() {
      hideError(errorBox);
      if (!icoInput.value.trim()) { showError(errorBox, 'Zadejte IČO vaší SVJ'); return; }
      if (!currentSvjId)          { showError(errorBox, 'Nejprve ověřte IČO tlačítkem Ověřit v ARES'); icoInput.focus(); return; }
      if (!jmenoInput.value.trim()) { showError(errorBox, 'Zadejte jméno'); return; }
      if (!emailInput.value.trim()) { showError(errorBox, 'Zadejte e-mail'); return; }
      if (passInput.value.length < 8)          { showError(errorBox, 'Heslo musí mít alespoň 8 znaků'); return; }
      if (passInput.value !== pass2Input.value) { showError(errorBox, 'Hesla se neshodují'); return; }

      regBtn.disabled = true; regBtn.textContent = 'Registruji...';

      fetch('api/auth.php?action=registerAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ico:      currentIco,
          email:    emailInput.value.trim(),
          password: passInput.value,
          jmeno:    jmenoInput.value.trim(),
          prijmeni: prijmeniInput.value.trim(),
        }),
      })
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba registrace');
          return d;
        });
      })
      .then(function(data) {
        Auth._setUser(data.user);
        buildNavWithUser();
        Router.navigate('home');
      })
      .catch(function(err) { showError(errorBox, err.message || 'Chyba při registraci'); })
      .finally(function() { regBtn.disabled = false; regBtn.textContent = 'Zaregistrovat SVJ portál'; });
    }

    icoInput.focus();
  }

  /* ========================================================
   * FLOW B — Mám pozvánku (registrace vlastníka)
   * ====================================================== */
  function renderInviteFlow(prefillToken) {
    body.replaceChildren();

    var desc = makeDesc('Dostali jste pozvánku od správce vašeho domu. Zadejte pozvánkový kód nebo použijte odkaz z e-mailu.');
    body.appendChild(desc);

    var errorBox = makeErrorBox();
    body.appendChild(errorBox);

    var svjInfoBox = document.createElement('div');
    svjInfoBox.className = 'info-box info-box-success';
    svjInfoBox.style.cssText = 'display:none;margin-bottom:16px;';
    body.appendChild(svjInfoBox);

    /* Token pole */
    var tokenWrap = document.createElement('div');
    tokenWrap.style.marginBottom = '16px';
    var tokenLabel = document.createElement('label');
    tokenLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;';
    tokenLabel.textContent = 'Pozvánkový kód *';
    tokenWrap.appendChild(tokenLabel);

    var tokenRow = document.createElement('div');
    tokenRow.className = 'form-row';
    var tokenInput = document.createElement('input');
    tokenInput.type = 'text';
    tokenInput.className = 'form-input';
    tokenInput.placeholder = 'Kód z e-mailu nebo nástěnky';
    tokenInput.maxLength = 64;
    tokenInput.style.fontFamily = 'monospace';
    if (prefillToken) tokenInput.value = prefillToken;
    var tokenBtn = document.createElement('button');
    tokenBtn.className = 'btn btn-secondary';
    tokenBtn.type = 'button';
    tokenBtn.textContent = 'Ověřit';
    tokenRow.appendChild(tokenInput);
    tokenRow.appendChild(tokenBtn);
    tokenWrap.appendChild(tokenRow);
    body.appendChild(tokenWrap);

    /* Formulář — skrytý do ověření tokenu */
    var formWrap = document.createElement('div');
    formWrap.style.display = 'none';
    var jmenoInput    = addField(formWrap, 'Jméno *',       'text',     'Jan',             { autocomplete: 'given-name',   required: true,  maxLength: 100 });
    var prijmeniInput = addField(formWrap, 'Příjmení',       'text',     'Novák',           { autocomplete: 'family-name',  maxLength: 100 });
    var emailInput    = addField(formWrap, 'E-mail *',       'email',    'vas@email.cz',    { autocomplete: 'email',        required: true,  maxLength: 255 });
    var passInput     = addField(formWrap, 'Heslo *',        'password', 'Alespoň 8 znaků', { autocomplete: 'new-password', required: true,  minLength: 8,  maxLength: 128 });
    var pass2Input    = addField(formWrap, 'Heslo znovu *',  'password', 'Zopakujte heslo', { autocomplete: 'new-password', required: true,  minLength: 8,  maxLength: 128 });
    body.appendChild(formWrap);

    var regBtn = makeSubmitBtn('Dokončit registraci');
    regBtn.style.display = 'none';
    body.appendChild(regBtn);
    body.appendChild(makeLoginLink());

    var validatedToken = null;

    if (prefillToken) { doTokenValidate(prefillToken); }

    tokenBtn.addEventListener('click', function() { doTokenValidate(tokenInput.value.trim()); });
    tokenInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doTokenValidate(tokenInput.value.trim()); }
    });

    function doTokenValidate(token) {
      if (!token) { showError(errorBox, 'Zadejte pozvánkový kód'); return; }
      tokenBtn.disabled = true; tokenBtn.textContent = '...';
      hideError(errorBox);
      svjInfoBox.style.display = 'none';
      validatedToken = null;
      formWrap.style.display = 'none';
      regBtn.style.display = 'none';

      Api.validateInvite(token)
        .then(function(data) {
          validatedToken = token;
          var roleLabel = data.role === 'vybor' ? 'člen výboru' : 'vlastník';
          svjInfoBox.textContent = '\u2713 ' + data.svj.nazev +
            (data.svj.obec ? ', ' + data.svj.obec : '') + ' \u00b7 role: ' + roleLabel;
          svjInfoBox.style.display = 'flex';
          formWrap.style.display = '';
          regBtn.style.display = '';
          jmenoInput.focus();
        })
        .catch(function(err) { showError(errorBox, err.message || 'Neplatná pozvánka'); })
        .finally(function() { tokenBtn.disabled = false; tokenBtn.textContent = 'Ověřit'; });
    }

    regBtn.addEventListener('click', doRegisterInvite);
    pass2Input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegisterInvite(); });

    function doRegisterInvite() {
      hideError(errorBox);
      if (!validatedToken)              { showError(errorBox, 'Nejprve ověřte pozvánkový kód'); return; }
      if (!jmenoInput.value.trim())     { showError(errorBox, 'Zadejte jméno'); return; }
      if (!emailInput.value.trim())     { showError(errorBox, 'Zadejte e-mail'); return; }
      if (passInput.value.length < 8)   { showError(errorBox, 'Heslo musí mít alespoň 8 znaků'); return; }
      if (passInput.value !== pass2Input.value) { showError(errorBox, 'Hesla se neshodují'); return; }

      regBtn.disabled = true; regBtn.textContent = 'Registruji...';

      Auth.register({
        email:        emailInput.value.trim(),
        password:     passInput.value,
        jmeno:        jmenoInput.value.trim(),
        prijmeni:     prijmeniInput.value.trim(),
        invite_token: validatedToken,
      })
      .then(function() { buildNavWithUser(); Router.navigate('home'); })
      .catch(function(err) { showError(errorBox, err.message || 'Chyba při registraci'); })
      .finally(function() { regBtn.disabled = false; regBtn.textContent = 'Dokončit registraci'; });
    }

    if (!prefillToken) tokenInput.focus();
  }

  /* ---- Sdílené helpery ---- */
  function addField(container, labelText, type, placeholder, opts) {
    var w = document.createElement('div');
    w.style.marginBottom = '12px';
    var lbl = document.createElement('label');
    lbl.textContent = labelText;
    lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;';
    w.appendChild(lbl);
    var inp = document.createElement('input');
    inp.type = type; inp.className = 'form-input'; inp.placeholder = placeholder;
    if (opts) Object.keys(opts).forEach(function(k) { inp[k] = opts[k]; });
    w.appendChild(inp);
    container.appendChild(w);
    return inp;
  }

  function makeDesc(text) {
    var p = document.createElement('p');
    p.style.cssText = 'color:var(--text-light);font-size:0.88rem;margin-bottom:16px;';
    p.textContent = text;
    return p;
  }
  function makeErrorBox() {
    var b = document.createElement('div');
    b.className = 'info-box info-box-danger';
    b.style.cssText = 'display:none;margin-bottom:16px;';
    return b;
  }
  function showError(box, msg) { box.textContent = msg; box.style.display = 'flex'; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function hideError(box)      { box.style.display = 'none'; box.textContent = ''; }
  function makeSubmitBtn(label) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-lg';
    btn.style.cssText = 'width:100%;margin-top:8px;';
    btn.type = 'button'; btn.textContent = label;
    return btn;
  }
  function makeLoginLink() {
    var p = document.createElement('p');
    p.style.cssText = 'text-align:center;margin-top:16px;font-size:0.9rem;color:var(--text-light);';
    p.appendChild(document.createTextNode('Již máte účet? '));
    var a = document.createElement('a'); a.href = '#login'; a.style.color = 'var(--primary)'; a.textContent = 'Přihlaste se';
    p.appendChild(a);
    return p;
  }
});
