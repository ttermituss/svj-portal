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

    var tdName = document.createElement('td');
    tdName.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;';
    tdName.textContent = (((u.jmeno || '') + ' ' + (u.prijmeni || '')).trim()) || '\u2014';
    if (isSelf) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'J\u00e1';
      badge.style.marginLeft = '6px';
      tdName.appendChild(badge);
    }

    var tdEmail = document.createElement('td');
    tdEmail.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    tdEmail.textContent = u.email;

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
          .then(function() { showToast('Role zm\u011bn\u011bna.'); })
          .catch(function(e) { showToast(e.message || 'Nepoda\u0159ilo se zm\u011bnit roli.', 'error'); reloadFn(); });
      });
      tdRole.appendChild(sel);
    } else {
      var rb = document.createElement('span');
      rb.className = 'badge' + (u.role === 'admin' ? ' badge-success' : '');
      rb.textContent = ROLE_LABELS[u.role] || u.role;
      tdRole.appendChild(rb);
    }

    var tdDate = document.createElement('td');
    tdDate.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;' +
                           'color:var(--text-light);font-size:0.85rem;';
    tdDate.textContent = u.created_at ? new Date(u.created_at).toLocaleDateString('cs-CZ') : '\u2014';

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
    tr.appendChild(tdRole);
    tr.appendChild(tdDate);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}
