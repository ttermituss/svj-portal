/* ===== LOGIN PAGE ===== */

Router.register('login', function(el) {
  var wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.alignItems = 'center';
  wrap.style.minHeight = '60vh';

  var card = document.createElement('div');
  card.className = 'card';
  card.style.width = '100%';
  card.style.maxWidth = '420px';

  // Header
  var header = document.createElement('div');
  header.className = 'card-header';
  header.style.textAlign = 'center';
  var h2 = document.createElement('h2');
  h2.textContent = 'Přihlášení';
  header.appendChild(h2);
  var desc = document.createElement('p');
  desc.style.color = 'var(--text-light)';
  desc.style.fontSize = '0.9rem';
  desc.textContent = 'Přihlaste se do SVJ Portálu';
  header.appendChild(desc);
  card.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.className = 'card-body';

  // Error box
  var errorBox = document.createElement('div');
  errorBox.className = 'info-box info-box-danger';
  errorBox.style.display = 'none';
  errorBox.style.marginBottom = '16px';
  body.appendChild(errorBox);

  // Email
  var emailField = makeFormField('E-mail', 'email', '', {
    required: true,
    placeholder: 'vas@email.cz'
  });
  emailField.input.autocomplete = 'email';
  emailField.input.style.marginBottom = '16px';
  body.appendChild(emailField.el);
  var emailInput = emailField.input;

  // Password
  var passField = makeFormField('Heslo', 'password', '', {
    required: true,
    placeholder: 'Zadejte heslo'
  });
  passField.input.autocomplete = 'current-password';
  passField.input.minLength = 8;
  passField.input.style.marginBottom = '20px';
  body.appendChild(passField.el);
  var passInput = passField.input;

  // Submit button
  var btn = document.createElement('button');
  btn.className = 'btn btn-primary btn-lg';
  btn.style.width = '100%';
  btn.textContent = 'Přihlásit se';
  body.appendChild(btn);

  // Register link
  var regLink = document.createElement('p');
  regLink.style.textAlign = 'center';
  regLink.style.marginTop = '16px';
  regLink.style.fontSize = '0.9rem';
  regLink.style.color = 'var(--text-light)';
  regLink.appendChild(document.createTextNode('Nemáte účet? '));
  var regA = document.createElement('a');
  regA.href = '#registrace';
  regA.style.color = 'var(--primary)';
  regA.textContent = 'Zaregistrujte se';
  regLink.appendChild(regA);
  body.appendChild(regLink);

  card.appendChild(body);
  wrap.appendChild(card);
  el.appendChild(wrap);

  // Focus
  emailInput.focus();

  // Handlers
  btn.addEventListener('click', doLogin);
  passInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
  emailInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') passInput.focus(); });

  function doLogin() {
    var email = emailInput.value.trim();
    var pass = passInput.value;

    if (!email || !pass) {
      showError('Vyplňte e-mail a heslo');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Přihlašuji...';
    errorBox.style.display = 'none';

    Auth.login(email, pass)
      .then(function() {
        Router.navigate('home');
        if (typeof buildNavWithUser === 'function') buildNavWithUser();
      })
      .catch(function(err) {
        showError(err.message || 'Neočekávaná chyba');
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Přihlásit se';
      });
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'flex';
  }
});
