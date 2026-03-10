/* ===== POZVÁNKY ===== */

function renderInvitesCard(el, currentUser) {
  var card = makeAdminCard('Pozvánky pro vlastníky');
  var body = card.body;

  var err = makeAdminInfoBox(false);
  var ok  = makeAdminInfoBox(true);
  body.appendChild(err);
  body.appendChild(ok);

  /* Formulář — vytvoření pozvánky */
  var createWrap = document.createElement('div');
  createWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px;';

  var roleWrap = document.createElement('div');
  var roleLabel = document.createElement('label');
  roleLabel.textContent = 'Role';
  roleLabel.style.cssText = 'display:block;font-size:0.85rem;font-weight:500;margin-bottom:4px;';
  var roleSelect = document.createElement('select');
  roleSelect.className = 'form-input';
  roleSelect.style.cssText = 'width:auto;padding:6px 10px;';
  var optV = document.createElement('option'); optV.value = 'vlastnik'; optV.textContent = 'Vlastn\u00edk';
  var optVybor = document.createElement('option'); optVybor.value = 'vybor'; optVybor.textContent = 'V\u00fdbor';
  roleSelect.appendChild(optV);
  if (currentUser.role === 'admin') roleSelect.appendChild(optVybor);
  roleWrap.appendChild(roleLabel);
  roleWrap.appendChild(roleSelect);

  var daysWrap = document.createElement('div');
  var daysLabel = document.createElement('label');
  daysLabel.textContent = 'Platnost (dn\u00ed)';
  daysLabel.style.cssText = 'display:block;font-size:0.85rem;font-weight:500;margin-bottom:4px;';
  var daysInput = document.createElement('input');
  daysInput.type = 'number'; daysInput.className = 'form-input';
  daysInput.style.cssText = 'width:80px;padding:6px 10px;';
  daysInput.value = '7'; daysInput.min = '1'; daysInput.max = '30';
  daysWrap.appendChild(daysLabel);
  daysWrap.appendChild(daysInput);

  var createBtn = document.createElement('button');
  createBtn.className = 'btn btn-primary';
  createBtn.style.cssText = 'align-self:flex-end;';
  createBtn.textContent = '+ Vytvo\u0159it pozv\u00e1nku';

  createWrap.appendChild(roleWrap);
  createWrap.appendChild(daysWrap);
  createWrap.appendChild(createBtn);
  body.appendChild(createWrap);

  /* Výsledný link po vytvoření */
  var linkBox = document.createElement('div');
  linkBox.style.cssText = 'display:none;margin-bottom:20px;padding:12px;background:var(--bg-hover);' +
    'border:1px solid var(--border);border-radius:6px;';
  body.appendChild(linkBox);

  /* Tabulka pozvánek */
  var tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';
  body.appendChild(tableWrap);

  el.appendChild(card.card);

  function loadList() {
    tableWrap.replaceChildren();
    if (!currentUser.svj_id) {
      var p = document.createElement('p');
      p.style.color = 'var(--text-light)';
      p.textContent = 'V\u00e1\u0161 \u00fa\u010det nen\u00ed p\u0159i\u0159azen k \u017e\u00e1dn\u00e9mu SVJ.';
      tableWrap.appendChild(p);
      createBtn.disabled = true;
      return;
    }
    Api.listInvites()
      .then(function(data) { renderInvitesTable(tableWrap, data.invitations, loadList); })
      .catch(function(e) { showAdminBox(err, e.message || 'Chyba p\u0159i na\u010d\u00edt\u00e1n\u00ed pozv\u00e1nek.'); });
  }

  createBtn.addEventListener('click', function() {
    hideAdminBox(err); hideAdminBox(ok);
    linkBox.style.display = 'none';
    createBtn.disabled = true; createBtn.textContent = '...';

    Api.createInvite(roleSelect.value, parseInt(daysInput.value) || 7)
      .then(function(data) {
        var base = window.location.origin + window.location.pathname;
        var inviteUrl = base + '?invite=' + data.token + '#registrace';

        linkBox.replaceChildren();
        var lTitle = document.createElement('div');
        lTitle.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:0.9rem;';
        lTitle.textContent = 'Pozv\u00e1nka vytvo\u0159ena! Sd\u00edlejte tento odkaz:';
        linkBox.appendChild(lTitle);

        var urlBox = document.createElement('div');
        urlBox.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
        var urlInput = document.createElement('input');
        urlInput.type = 'text'; urlInput.readOnly = true;
        urlInput.className = 'form-input';
        urlInput.style.cssText = 'font-family:monospace;font-size:0.8rem;flex:1;min-width:0;';
        urlInput.value = inviteUrl;
        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.textContent = 'Kop\u00edrovat';
        copyBtn.addEventListener('click', function() {
          copyToClipboard(inviteUrl, function() {
            copyBtn.textContent = '\u2713 Zkop\u00edrovan\u00f3';
            showToast('Odkaz zkop\u00edrovan do schr\u00e1nky');
            setTimeout(function() { copyBtn.textContent = 'Kop\u00edrovat'; }, 2500);
          });
        });
        urlBox.appendChild(urlInput);
        urlBox.appendChild(copyBtn);
        linkBox.appendChild(urlBox);

        var expNote = document.createElement('div');
        expNote.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:6px;';
        expNote.textContent = 'Platnost do: ' + new Date(data.expires_at).toLocaleDateString('cs-CZ');
        linkBox.appendChild(expNote);

        linkBox.style.display = 'block';
        loadList();
      })
      .catch(function(e) { showAdminBox(err, e.message || 'Chyba p\u0159i vytv\u00e1\u0159en\u00ed pozv\u00e1nky.'); })
      .finally(function() { createBtn.disabled = false; createBtn.textContent = '+ Vytvo\u0159it pozv\u00e1nku'; });
  });

  loadList();
}

function renderInvitesTable(wrap, invitations, reloadFn) {
  wrap.replaceChildren();

  if (!invitations || !invitations.length) {
    var p = document.createElement('p');
    p.style.color = 'var(--text-light)';
    p.textContent = '\u017d\u00e1dn\u00e9 pozv\u00e1nky.';
    wrap.appendChild(p);
    return;
  }

  var ROLE_LBL = { vlastnik: 'Vlastn\u00edk', vybor: 'V\u00fdbor' };

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.85rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Role', 'Stav', 'Platnost do', 'Vytvo\u0159il', 'Akce'].forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:6px 10px;border-bottom:2px solid var(--border);' +
      'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  invitations.forEach(function(inv) {
    var tr = document.createElement('tr');

    var tdRole = document.createElement('td');
    tdRole.style.cssText = 'padding:6px 10px;border-bottom:1px solid var(--border);';
    tdRole.textContent = ROLE_LBL[inv.role] || inv.role;

    var tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'padding:6px 10px;border-bottom:1px solid var(--border);';
    var badge = document.createElement('span');
    if (inv.used_at) {
      badge.className = 'badge badge-success';
      badge.textContent = 'Pou\u017eita';
    } else if (inv.expired) {
      badge.className = 'badge';
      badge.style.opacity = '0.6';
      badge.textContent = 'Vypr\u0161ela';
    } else {
      badge.className = 'badge';
      badge.textContent = 'Aktivn\u00ed';
    }
    tdStatus.appendChild(badge);

    var tdExp = document.createElement('td');
    tdExp.style.cssText = 'padding:6px 10px;border-bottom:1px solid var(--border);white-space:nowrap;color:var(--text-light);';
    tdExp.textContent = new Date(inv.expires_at).toLocaleDateString('cs-CZ');

    var tdBy = document.createElement('td');
    tdBy.style.cssText = 'padding:6px 10px;border-bottom:1px solid var(--border);';
    tdBy.textContent = inv.created_by_name || '\u2014';

    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:6px 10px;border-bottom:1px solid var(--border);';

    if (!inv.used_at && !inv.expired) {
      var revokeBtn = document.createElement('button');
      revokeBtn.className = 'btn btn-danger';
      revokeBtn.style.cssText = 'padding:3px 8px;font-size:0.78rem;';
      revokeBtn.textContent = 'Zru\u0161it';
      revokeBtn.addEventListener('click', function() {
        showConfirmModal('Zru\u0161it pozv\u00e1nku?', 'Pozv\u00e1nka bude nen\u00e1vratn\u011b zru\u0161ena.', function() {
          revokeBtn.disabled = true;
          Api.revokeInvite(inv.id)
            .then(reloadFn)
            .catch(function(e) { showToast(e.message || 'Nepoda\u0159ilo se zru\u0161it.', 'error'); revokeBtn.disabled = false; });
        });
      });
      tdAkce.appendChild(revokeBtn);
    } else {
      tdAkce.textContent = '\u2014';
    }

    tr.appendChild(tdRole);
    tr.appendChild(tdStatus);
    tr.appendChild(tdExp);
    tr.appendChild(tdBy);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
}
