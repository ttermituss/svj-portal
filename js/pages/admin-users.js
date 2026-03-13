/* ===== SPRÁVA UŽIVATELŮ ===== */

var ROLE_LABELS = { vlastnik: 'Vlastn\u00edk', vybor: 'V\u00fdbor', admin: 'Admin' };

function renderUsersCard(el, currentUser) {
  var card = makeAdminCard('Uživatelé a oprávnění');
  var body = card.body;

  var err       = makeAdminInfoBox(false);
  var tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';

  body.appendChild(err);
  body.appendChild(tableWrap);
  el.appendChild(card.card);

  var jednotkyCache = null;
  function loadJednotky(cb) {
    if (jednotkyCache) { cb(jednotkyCache); return; }
    Api.apiGet('api/jednotky.php')
      .then(function(d) { jednotkyCache = d.jednotky || []; cb(jednotkyCache); })
      .catch(function()  { cb([]); });
  }

  function load() {
    tableWrap.replaceChildren();
    var loading = document.createElement('p');
    loading.style.color = 'var(--text-light)';
    loading.textContent = 'Načítám...';
    tableWrap.appendChild(loading);
    hideAdminBox(err);

    Api.apiGet('api/admin.php?action=listUsers')
      .then(function(data) { renderUsersTable(tableWrap, data.users, currentUser, load, loadJednotky); })
      .catch(function(e) {
        tableWrap.replaceChildren();
        showAdminBox(err, e.message || 'Chyba při načítání.');
      });
  }

  load();
}

function renderUsersTable(wrap, users, me, reloadFn, loadJednotky) {
  wrap.replaceChildren();

  if (!users || !users.length) {
    var p = document.createElement('p');
    p.style.color = 'var(--text-light)';
    p.textContent = 'Žádní uživatelé.';
    wrap.appendChild(p);
    return;
  }

  var isAdmin = me.role === 'admin';
  var isPriv  = isPrivileged(me);

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Jméno', 'E-mail', 'Telefon', 'Jednotka', 'Role', 'Registrace', 'Akce'].forEach(function(col) {
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
    tdName.textContent = (((u.jmeno || '') + ' ' + (u.prijmeni || '')).trim()) || '\u2014';
    if (isSelf) {
      var badge = document.createElement('span');
      badge.className   = 'badge';
      badge.textContent = 'J\u00e1';
      badge.style.marginLeft = '6px';
      tdName.appendChild(badge);
    }

    // E-mail
    var tdEmail = document.createElement('td');
    tdEmail.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    tdEmail.textContent = u.email;

    // Telefon
    var tdTelefon = document.createElement('td');
    tdTelefon.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-light);white-space:nowrap;';
    tdTelefon.textContent = u.telefon || '\u2014';

    // Jednotka
    var tdJednotka = document.createElement('td');
    tdJednotka.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;';
    var unitSpan = document.createElement('span');
    unitSpan.style.cssText = 'color:var(--text-light);';
    unitSpan.textContent = u.cislo_jednotky || '\u2014';
    tdJednotka.appendChild(unitSpan);
    if (isPriv) {
      var assignBtn = document.createElement('button');
      assignBtn.className = 'btn btn-secondary';
      assignBtn.style.cssText = 'font-size:0.82rem;padding:5px 10px;margin-left:8px;min-height:26px;';
      assignBtn.textContent = u.cislo_jednotky ? 'Změnit' : 'Přiřadit';
      assignBtn.addEventListener('click', function() {
        loadJednotky(function(j) { showAssignUnitModal(u, j, reloadFn); });
      });
      tdJednotka.appendChild(assignBtn);
    }

    // Role
    var tdRole = document.createElement('td');
    tdRole.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    if (isAdmin && !isSelf) {
      var sel = document.createElement('select');
      sel.className = 'form-input';
      sel.style.cssText = 'padding:4px 8px;width:auto;';
      Object.keys(ROLE_LABELS).forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r; opt.textContent = ROLE_LABELS[r];
        if (r === u.role) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function() {
        Api.apiPost('api/admin.php?action=updateRole', { user_id: u.id, role: sel.value })
          .then(function() { showToast('Role zm\u011bn\u011bna.'); })
          .catch(function(e) { showToast(e.message || 'Nepoda\u0159ilo se zm\u011bnit roli.', 'error'); reloadFn(); });
      });
      tdRole.appendChild(sel);
    } else {
      var rb = document.createElement('span');
      rb.className  = 'badge' + (u.role === 'admin' ? ' badge-success' : '');
      rb.textContent = ROLE_LABELS[u.role] || u.role;
      tdRole.appendChild(rb);
    }

    // Datum registrace
    var tdDate = document.createElement('td');
    tdDate.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;' +
                           'color:var(--text-light);font-size:0.85rem;';
    tdDate.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString('cs-CZ') : '\u2014';

    // Akce (smazat)
    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    if (isAdmin && !isSelf) {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Smazat';
      delBtn.style.cssText = 'padding:4px 10px;font-size:0.8rem;';
      delBtn.addEventListener('click', function() {
        var label = tdName.textContent.replace('J\u00e1', '').trim() + ' (' + u.email + ')';
        showConfirmModal('Smazat uživatele?', label, function() {
          delBtn.disabled = true;
          Api.apiPost('api/admin.php?action=deleteUser', { user_id: u.id })
            .then(reloadFn)
            .catch(function(e) { showToast(e.message || 'Nepoda\u0159ilo se smazat.', 'error'); delBtn.disabled = false; });
        });
      });
      tdAkce.appendChild(delBtn);
    } else {
      tdAkce.textContent = '\u2014';
    }

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdTelefon);
    tr.appendChild(tdJednotka);
    tr.appendChild(tdRole);
    tr.appendChild(tdDate);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}

function showAssignUnitModal(u, jednotky, reloadFn) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:28px 28px 24px;' +
    'max-width:380px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);';

  var title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 6px;font-size:1.05rem;';
  title.textContent = 'Přiřadit jednotku';
  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:0.88rem;color:var(--text-light);margin-bottom:18px;';
  sub.textContent = ((u.jmeno || '') + ' ' + (u.prijmeni || '')).trim() || u.email;
  modal.appendChild(title);
  modal.appendChild(sub);

  var errBox = makeAdminInfoBox(false);
  modal.appendChild(errBox);

  var selWrap = document.createElement('div');
  selWrap.style.marginBottom = '18px';
  var selLbl = document.createElement('label');
  selLbl.htmlFor     = 'assign-unit-sel';
  selLbl.textContent = 'Jednotka';
  selLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var sel = document.createElement('select');
  sel.id = 'assign-unit-sel'; sel.className = 'form-input';

  var optNone = document.createElement('option');
  optNone.value = ''; optNone.textContent = '— zrušit přiřazení —';
  sel.appendChild(optNone);

  jednotky.forEach(function(j) {
    var opt = document.createElement('option');
    opt.value = j.id;
    opt.textContent = j.cislo_jednotky + (j.zpusob_vyuziti ? ' \u2014 ' + j.zpusob_vyuziti : '');
    if (u.jednotka_id && j.id === u.jednotka_id) opt.selected = true;
    sel.appendChild(opt);
  });
  selWrap.appendChild(selLbl);
  selWrap.appendChild(sel);
  modal.appendChild(selWrap);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

  var cancelBtn = document.createElement('button');
  cancelBtn.className   = 'btn btn-secondary';
  cancelBtn.textContent = 'Zrušit';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });

  var saveBtn = document.createElement('button');
  saveBtn.className   = 'btn btn-primary';
  saveBtn.textContent = 'Uložit';
  saveBtn.addEventListener('click', function() {
    hideAdminBox(errBox);
    saveBtn.disabled = true;
    Api.apiPost('api/admin.php?action=updateUserUnit', {
      user_id:     u.id,
      jednotka_id: sel.value || null,
    })
      .then(function() {
        document.body.removeChild(overlay);
        reloadFn();
        showToast('Jednotka přiřazena.');
      })
      .catch(function(e) { showAdminBox(errBox, e.message || 'Chyba.'); })
      .finally(function() { saveBtn.disabled = false; });
  });

  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
}
