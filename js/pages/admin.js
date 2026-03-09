/* ===== SPRÁVA PORTÁLU (admin / vybor) ===== */

Router.register('admin', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (user.role !== 'admin' && user.role !== 'vybor') {
    Router.navigate('home'); return;
  }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Správa portálu';
  var sub = document.createElement('p');
  sub.textContent = 'Uživatelé, role a systémová nastavení';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  renderUsersCard(el, user);

  if (user.role === 'admin') {
    renderSystemCard(el);
  }
});

/* ===== KARTA: SPRÁVA UŽIVATELŮ ===== */

function renderUsersCard(el, currentUser) {
  var card = makeAdminCard('Uživatelé a oprávnění');
  var body = card.body;

  var err      = makeAdminInfoBox(false);
  var tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';

  body.appendChild(err);
  body.appendChild(tableWrap);
  el.appendChild(card.card);

  function load() {
    tableWrap.replaceChildren();
    var loading = document.createElement('p');
    loading.style.color = 'var(--text-light)';
    loading.textContent = 'Načítám...';
    tableWrap.appendChild(loading);
    hideAdminBox(err);

    Api.apiGet('api/admin.php?action=listUsers')
      .then(function(data) { renderUsersTable(tableWrap, data.users, currentUser, load); })
      .catch(function(e) {
        tableWrap.replaceChildren();
        showAdminBox(err, e.message || 'Chyba při načítání.');
      });
  }

  load();
}

var ROLE_LABELS = { vlastnik: 'Vlastník', vybor: 'Výbor', admin: 'Admin' };

function renderUsersTable(wrap, users, me, reloadFn) {
  wrap.replaceChildren();

  if (!users || !users.length) {
    var p = document.createElement('p');
    p.style.color = 'var(--text-light)';
    p.textContent = 'Žádní uživatelé.';
    wrap.appendChild(p);
    return;
  }

  var isAdmin = me.role === 'admin';

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  // Hlavička
  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Jméno', 'E-mail', 'Role', 'Registrace', 'Akce'].forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');

  users.forEach(function(u) {
    var isSelf = u.id === me.id;
    var tr = document.createElement('tr');
    if (isSelf) tr.style.background = 'rgba(0,0,0,0.03)';

    // Jméno
    var tdName = document.createElement('td');
    tdName.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;';
    tdName.textContent = (((u.jmeno || '') + ' ' + (u.prijmeni || '')).trim()) || '—';
    if (isSelf) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Já';
      badge.style.marginLeft = '6px';
      tdName.appendChild(badge);
    }

    // E-mail
    var tdEmail = document.createElement('td');
    tdEmail.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    tdEmail.textContent = u.email;

    // Role
    var tdRole = document.createElement('td');
    tdRole.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';

    if (isAdmin && !isSelf) {
      var sel = document.createElement('select');
      sel.className = 'form-input';
      sel.style.cssText = 'padding:4px 8px;width:auto;';
      Object.keys(ROLE_LABELS).forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r;
        opt.textContent = ROLE_LABELS[r];
        if (r === u.role) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function() {
        Api.apiPost('api/admin.php?action=updateRole', { user_id: u.id, role: sel.value })
          .catch(function(e) { alert('Chyba: ' + (e.message || 'Nepodařilo se změnit roli.')); reloadFn(); });
      });
      tdRole.appendChild(sel);
    } else {
      var rb = document.createElement('span');
      rb.className = 'badge' + (u.role === 'admin' ? ' badge-success' : '');
      rb.textContent = ROLE_LABELS[u.role] || u.role;
      tdRole.appendChild(rb);
    }

    // Datum
    var tdDate = document.createElement('td');
    tdDate.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;' +
                           'color:var(--text-light);font-size:0.85rem;';
    tdDate.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString('cs-CZ') : '—';

    // Akce
    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';

    if (isAdmin && !isSelf) {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Smazat';
      delBtn.style.cssText = 'padding:4px 10px;font-size:0.8rem;';
      delBtn.addEventListener('click', function() {
        var label = tdName.textContent.replace('Já', '').trim() + ' (' + u.email + ')';
        if (!confirm('Opravdu smazat: ' + label + '?')) return;
        delBtn.disabled = true;
        Api.apiPost('api/admin.php?action=deleteUser', { user_id: u.id })
          .then(reloadFn)
          .catch(function(e) { alert('Chyba: ' + (e.message || 'Nepodařilo se smazat.')); delBtn.disabled = false; });
      });
      tdAkce.appendChild(delBtn);
    } else {
      tdAkce.textContent = '—';
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdDate);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

/* ===== KARTA: SYSTÉMOVÁ NASTAVENÍ (jen admin) ===== */

var SECRET_KEYS = ['api_klic'];

function renderSystemCard(el) {
  var card = makeAdminCard('Systémová nastavení');
  var body = card.body;

  var err  = makeAdminInfoBox(false);
  var ok   = makeAdminInfoBox(true);
  var wrap = document.createElement('div');
  wrap.style.maxWidth = '500px';

  body.appendChild(err);
  body.appendChild(ok);
  body.appendChild(wrap);
  el.appendChild(card.card);

  Api.apiGet('api/admin.php?action=getSettings')
    .then(function(data) { renderSettingsForm(wrap, data.settings, err, ok); })
    .catch(function(e) { showAdminBox(err, e.message || 'Chyba při načítání.'); });
}

function renderSettingsForm(wrap, settings, errBox, okBox) {
  wrap.replaceChildren();

  var form = document.createElement('form');
  var inputs = {};

  settings.forEach(function(s) {
    var isSecret = SECRET_KEYS.indexOf(s.key) !== -1;
    var inputType = isSecret ? 'password' : detectInputType(s.key);

    var grp = makeAdminField(s.label, inputType, 'cfg-' + s.key, s.value || '');
    inputs[s.key] = grp.input;

    if (isSecret) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = 'Zobrazit';
      toggle.style.cssText = 'margin-top:3px;font-size:0.8rem;background:none;border:none;' +
                             'color:var(--primary);cursor:pointer;padding:0;';
      toggle.addEventListener('click', function() {
        grp.input.type = grp.input.type === 'password' ? 'text' : 'password';
        toggle.textContent = grp.input.type === 'password' ? 'Zobrazit' : 'Skrýt';
      });
      grp.el.appendChild(toggle);
    }

    form.appendChild(grp.el);
  });

  var saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.marginTop = '8px';
  saveBtn.textContent = 'Uložit nastavení';
  form.appendChild(saveBtn);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideAdminBox(errBox); hideAdminBox(okBox);
    saveBtn.disabled = true;

    Promise.all(settings.map(function(s) {
      return Api.apiPost('api/admin.php?action=updateSetting', { key: s.key, value: inputs[s.key].value });
    }))
      .then(function() { showAdminBox(okBox, 'Nastavení uloženo.'); })
      .catch(function(e) { showAdminBox(errBox, e.message || 'Chyba.'); })
      .finally(function() { saveBtn.disabled = false; });
  });

  wrap.appendChild(form);
}

function detectInputType(key) {
  if (key.indexOf('url') !== -1 || key.indexOf('web') !== -1) return 'url';
  if (key.indexOf('kontakt') !== -1 || key.indexOf('email') !== -1 || key.indexOf('user') !== -1) return 'email';
  if (key.indexOf('host') !== -1) return 'text';
  return 'text';
}

/* ===== HELPERS (lokální, nesmí kolidovat s nastaveni.js) ===== */

function makeAdminCard(title) {
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

function makeAdminField(labelText, type, id, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '16px';
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

function makeAdminInfoBox(isOk) {
  var b = document.createElement('div');
  b.className = isOk ? 'info-box info-box-success' : 'info-box info-box-danger';
  b.style.cssText = 'display:none;margin-bottom:12px;';
  return b;
}

function showAdminBox(b, t) { b.textContent = t; b.style.display = ''; }
function hideAdminBox(b)    { b.style.display = 'none'; b.textContent = ''; }
