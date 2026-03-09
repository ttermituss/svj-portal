/* ===== REGISTRACE PAGE ===== */

Router.register('registrace', function(el) {
  // Přihlášený uživatel sem nepatří
  if (Auth.isLoggedIn()) {
    Router.navigate('home');
    return;
  }

  var currentSvjId = null;
  var svjName = null;

  /* ---- Wrapper ---- */
  var wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.alignItems = 'flex-start';
  wrap.style.minHeight = '60vh';
  wrap.style.padding = '32px 0';

  var card = document.createElement('div');
  card.className = 'card';
  card.style.width = '100%';
  card.style.maxWidth = '480px';

  /* ---- Header ---- */
  var header = document.createElement('div');
  header.className = 'card-header';
  header.style.textAlign = 'center';
  var h2 = document.createElement('h2');
  h2.textContent = 'Registrace';
  header.appendChild(h2);
  var desc = document.createElement('p');
  desc.style.color = 'var(--text-light)';
  desc.style.fontSize = '0.9rem';
  desc.textContent = 'Vytvořte si účet do SVJ Portálu';
  header.appendChild(desc);
  card.appendChild(header);

  /* ---- Body ---- */
  var body = document.createElement('div');
  body.className = 'card-body';

  /* Error */
  var errorBox = document.createElement('div');
  errorBox.className = 'info-box info-box-danger';
  errorBox.style.display = 'none';
  errorBox.style.marginBottom = '16px';
  body.appendChild(errorBox);

  /* Pomocná funkce pro pole */
  function addField(labelText, type, placeholder, opts) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';
    var lbl = document.createElement('label');
    lbl.textContent = labelText;
    lbl.style.display = 'block';
    lbl.style.marginBottom = '4px';
    lbl.style.fontWeight = '500';
    wrap.appendChild(lbl);
    var inp = document.createElement('input');
    inp.type = type;
    inp.className = 'form-input';
    inp.placeholder = placeholder;
    if (opts) Object.keys(opts).forEach(function(k) { inp[k] = opts[k]; });
    wrap.appendChild(inp);
    body.appendChild(wrap);
    return inp;
  }

  /* ---- Základní údaje ---- */
  var jmenoInput    = addField('Jméno *',       'text',     'Jan',              { autocomplete: 'given-name',   required: true, maxLength: 100 });
  var prijmeniInput = addField('Příjmení',       'text',     'Novák',            { autocomplete: 'family-name',  maxLength: 100 });
  var emailInput    = addField('E-mail *',       'email',    'vas@email.cz',     { autocomplete: 'email',        required: true, maxLength: 255 });
  var passInput     = addField('Heslo *',        'password', 'Alespoň 8 znaků',  { autocomplete: 'new-password', required: true, minLength: 8,  maxLength: 128 });
  var pass2Input    = addField('Heslo znovu *',  'password', 'Zopakujte heslo',  { autocomplete: 'new-password', required: true, minLength: 8,  maxLength: 128 });

  /* ---- Volitelné SVJ ---- */
  var svjSection = document.createElement('div');
  svjSection.style.marginTop = '20px';
  svjSection.style.paddingTop = '16px';
  svjSection.style.borderTop = '1px solid var(--border)';

  var svjLabel = document.createElement('p');
  svjLabel.style.fontWeight = '500';
  svjLabel.style.marginBottom = '4px';
  svjLabel.textContent = 'IČO vaší SVJ (volitelné)';
  svjSection.appendChild(svjLabel);

  var svjHint = document.createElement('p');
  svjHint.style.fontSize = '0.82rem';
  svjHint.style.color = 'var(--text-light)';
  svjHint.style.marginBottom = '8px';
  svjHint.textContent = 'Propojte účet s vaší SVJ. Údaje načteme automaticky z ARES.';
  svjSection.appendChild(svjHint);

  var icoRow = document.createElement('div');
  icoRow.className = 'form-row';

  var icoInput = document.createElement('input');
  icoInput.type = 'text';
  icoInput.className = 'form-input';
  icoInput.placeholder = 'např. 27838749';
  icoInput.maxLength = 8;
  icoInput.style.fontFamily = 'monospace';
  icoInput.style.letterSpacing = '0.05em';
  icoRow.appendChild(icoInput);

  var icoBtn = document.createElement('button');
  icoBtn.className = 'btn btn-secondary';
  icoBtn.type = 'button';
  icoBtn.textContent = 'Ověřit';
  icoRow.appendChild(icoBtn);
  svjSection.appendChild(icoRow);

  /* SVJ result badge */
  var svjResult = document.createElement('div');
  svjResult.style.marginTop = '8px';
  svjResult.style.display = 'none';
  svjSection.appendChild(svjResult);

  body.appendChild(svjSection);

  /* ---- Submit ---- */
  var sep = document.createElement('div');
  sep.style.height = '16px';
  body.appendChild(sep);

  var regBtn = document.createElement('button');
  regBtn.className = 'btn btn-primary btn-lg';
  regBtn.style.width = '100%';
  regBtn.type = 'button';
  regBtn.textContent = 'Zaregistrovat se';
  body.appendChild(regBtn);

  /* Login link */
  var loginLink = document.createElement('p');
  loginLink.style.textAlign = 'center';
  loginLink.style.marginTop = '16px';
  loginLink.style.fontSize = '0.9rem';
  loginLink.style.color = 'var(--text-light)';
  loginLink.appendChild(document.createTextNode('Již máte účet? '));
  var loginA = document.createElement('a');
  loginA.href = '#login';
  loginA.style.color = 'var(--primary)';
  loginA.textContent = 'Přihlaste se';
  loginLink.appendChild(loginA);
  body.appendChild(loginLink);

  card.appendChild(body);
  wrap.appendChild(card);
  el.appendChild(wrap);

  /* ---- Focus ---- */
  jmenoInput.focus();

  /* ---- IČO lookup ---- */
  icoBtn.addEventListener('click', doIcoLookup);
  icoInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doIcoLookup(); } });
  icoInput.addEventListener('input', function() {
    if (!icoInput.value.trim()) {
      svjResult.style.display = 'none';
      currentSvjId = null;
      svjName = null;
    }
  });

  function doIcoLookup() {
    var ico = icoInput.value.trim();
    if (!ico) return;

    icoBtn.disabled = true;
    icoBtn.textContent = '...';
    svjResult.style.display = 'none';
    currentSvjId = null;
    svjName = null;

    Api.lookupAres(ico)
      .then(function(data) {
        if (data.error) {
          showSvjError(data.error.message || 'SVJ nenalezeno');
          return;
        }
        currentSvjId = data.svj_id || null;
        svjName = data.obchodniJmeno || null;
        showSvjOk(svjName || ico);
      })
      .catch(function(err) {
        showSvjError(err.message || 'Chyba při vyhledávání');
      })
      .finally(function() {
        icoBtn.disabled = false;
        icoBtn.textContent = 'Ověřit';
      });
  }

  function showSvjOk(name) {
    svjResult.className = 'info-box info-box-success';
    svjResult.textContent = '\u2713 ' + name;
    svjResult.style.display = 'flex';
  }

  function showSvjError(msg) {
    svjResult.className = 'info-box info-box-danger';
    svjResult.textContent = msg;
    svjResult.style.display = 'flex';
    currentSvjId = null;
  }

  /* ---- Registrace ---- */
  regBtn.addEventListener('click', doRegister);
  pass2Input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegister(); });

  function doRegister() {
    errorBox.style.display = 'none';

    var jmeno    = jmenoInput.value.trim();
    var prijmeni = prijmeniInput.value.trim();
    var email    = emailInput.value.trim();
    var pass     = passInput.value;
    var pass2    = pass2Input.value;
    var ico      = icoInput.value.trim();

    if (!jmeno)           { showError('Zadejte jméno');              return; }
    if (!email)           { showError('Zadejte e-mail');             return; }
    if (pass.length < 8)  { showError('Heslo musí mít alespoň 8 znaků'); return; }
    if (pass !== pass2)   { showError('Hesla se neshodují');         return; }

    /* Pokud je vyplněno IČO ale nebylo ověřeno → ověřit nejprve */
    if (ico && !currentSvjId) {
      showError('Ověřte IČO vaší SVJ (klikněte na tlačítko Ověřit)');
      icoInput.focus();
      return;
    }

    regBtn.disabled = true;
    regBtn.textContent = 'Registruji...';

    Auth.register({
      email:    email,
      password: pass,
      jmeno:    jmeno,
      prijmeni: prijmeni,
      svj_id:   currentSvjId,
    })
    .then(function() {
      buildNavWithUser();
      Router.navigate('home');
    })
    .catch(function(err) {
      showError(err.message || 'Chyba při registraci');
    })
    .finally(function() {
      regBtn.disabled = false;
      regBtn.textContent = 'Zaregistrovat se';
    });
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'flex';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
