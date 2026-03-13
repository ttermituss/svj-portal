/* ===== SPRÁVA PORTÁLU — hlavní router + SVJ banner + sdílené helpery ===== */

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

  renderSvjBanner(el, user);
  renderOrCard(el, user);
  renderUsersCard(el, user);
  renderVlastniciExtCard(el, user);
  renderInvitesCard(el, user);
  renderKnCard(el, user);
  renderSfpiCard(el, user);

  renderGdriveStorageCard(el, user);

  if (user.role === 'admin') {
    renderIsdsCard(el, user);
    renderSystemCard(el);
  }
});

/* ===== BANNER: MOJE SVJ ===== */

function renderSvjBanner(el, user) {
  var svj = Auth.getSvj();
  if (!svj && !user.svj_id) return;

  var banner = document.createElement('div');
  banner.style.cssText = [
    'display:flex', 'align-items:center', 'gap:16px',
    'background:var(--bg-hover)', 'border:1px solid var(--border)',
    'border-radius:8px', 'padding:14px 18px', 'margin-bottom:24px',
    'flex-wrap:wrap',
  ].join(';');

  var icon = document.createElement('span');
  icon.textContent = '\uD83C\uDFE0';
  icon.style.cssText = 'font-size:1.4rem;flex-shrink:0;';
  banner.appendChild(icon);

  var info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  nameEl.textContent = svj ? svj.nazev : 'SVJ ID ' + user.svj_id;
  info.appendChild(nameEl);

  if (svj && svj.ico) {
    var icoEl = document.createElement('div');
    icoEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
    icoEl.textContent = 'I\u010cO: ' + svj.ico;
    info.appendChild(icoEl);
  }

  banner.appendChild(info);

  var roleLabels = { vlastnik: 'Vlastn\u00edk', vybor: '\u010clen v\u00fdboru', admin: 'Administr\u00e1tor' };
  var roleBadge = document.createElement('span');
  roleBadge.className = 'badge';
  roleBadge.textContent = roleLabels[user.role] || user.role;
  roleBadge.style.flexShrink = '0';
  banner.appendChild(roleBadge);

  el.appendChild(banner);
}

/* ===== KARTA: VÝBOR DLE OR ===== */

function renderOrCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Výbor dle Obchodního rejstříku');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Aktuální složení výboru dle zápisu v OR (ARES). Kliknutím na "Pozvat" vygenerujete pozvánkový odkaz.';
  body.appendChild(hint);

  var err      = makeAdminInfoBox(false);
  var resultWrap = document.createElement('div');
  body.appendChild(err);
  body.appendChild(resultWrap);

  var fetchBtn = document.createElement('button');
  fetchBtn.className = 'btn btn-secondary';
  fetchBtn.textContent = 'Načíst z OR / ARES';
  body.appendChild(fetchBtn);

  el.appendChild(card.card);

  fetchBtn.addEventListener('click', function() {
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Načítám\u2026';
    hideAdminBox(err);
    resultWrap.replaceChildren();

    Api.apiGet('api/svj.php?action=fetchOr')
      .then(function(data) { renderOrResult(resultWrap, data.or, err); })
      .catch(function(e)   { showAdminBox(err, e.message || 'Chyba při načítání z OR.'); })
      .finally(function()  { fetchBtn.disabled = false; fetchBtn.textContent = 'Aktualizovat z OR'; });
  });
}

function renderOrResult(wrap, or, errBox) {
  wrap.replaceChildren();

  var clenove = or.clenove || [];
  if (!clenove.length) {
    var info = document.createElement('div');
    info.className = 'info-box info-box-warning';
    info.style.margin = '0 0 12px';
    info.textContent = 'V OR nebyla nalezena data o statutárním orgánu. SVJ může mít zjednodušenou formu nebo data nejsou v ARES.';
    wrap.appendChild(info);
    return;
  }

  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:12px;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Jméno', 'Funkce', 'Akce'].forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  clenove.forEach(function(clen) {
    var tr = document.createElement('tr');

    var tdName = document.createElement('td');
    tdName.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);font-weight:500;';
    tdName.textContent = (clen.jmeno + ' ' + clen.prijmeni).trim();

    var tdFunkce = document.createElement('td');
    tdFunkce.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-light);';
    tdFunkce.textContent = clen.funkce || '\u2014';

    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';

    var invBtn = document.createElement('button');
    invBtn.className = 'btn btn-secondary btn-sm';
    invBtn.textContent = 'Pozvat jako Výbor';
    invBtn.addEventListener('click', function() {
      invBtn.disabled = true;
      Api.createInvite('vybor', 30)
        .then(function(data) {
          var base = window.location.origin + window.location.pathname;
          var url  = base + '?invite=' + data.token + '#registrace';
          copyToClipboard(url, function() {
            showToast('Pozvánka zkopírována pro ' + tdName.textContent);
          });
          // Zobrazit link inline
          var linkRow = document.createElement('div');
          linkRow.style.cssText = 'margin-top:4px;font-size:0.82rem;font-family:monospace;' +
            'color:var(--text-light);word-break:break-all;';
          linkRow.textContent = url;
          tdAkce.appendChild(linkRow);
        })
        .catch(function(e) { showToast(e.message || 'Chyba při vytváření pozvánky.', 'error'); })
        .finally(function() { invBtn.disabled = false; });
    });
    tdAkce.appendChild(invBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdFunkce);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  var note = document.createElement('div');
  note.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  note.textContent = 'Zdroj: ARES / Obchodní rejstřík \u00b7 Data mohou být zpožděná o 1\u20132 dny.';
  wrap.appendChild(note);
}

/* ===== KARTA: DATOVÁ SCHRÁNKA (ISDS) ===== */

function renderIsdsCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Datov\xe1 schr\xe1nka (ISDS)');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'ID datov\xe9 schr\xe1nky SVJ (ISDS). Umo\u017e\u0148uje ov\u011b\u0159en\xed aktivn\xed schr\xe1nky a p\u0159\xedm\xe9 odkazov\xe1n\xed na slu\u017ebu Moje Datov\xe1 Schr\xe1nka.';
  body.appendChild(hint);

  var statusWrap = document.createElement('div');
  statusWrap.style.marginBottom = '14px';
  body.appendChild(statusWrap);

  var err = makeAdminInfoBox(false);
  var ok  = makeAdminInfoBox(true);
  body.appendChild(err);
  body.appendChild(ok);

  var grp  = makeAdminField('ID datov\xe9 schr\xe1nky (nap\u0159. abc1234)', 'text', 'isds-id-input', '');
  grp.input.maxLength = 7;
  grp.input.placeholder = 'nap\u0159. abc1234';
  grp.input.style.maxWidth = '200px';
  body.appendChild(grp.el);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Ulo\u017eit';

  var linkBtn = document.createElement('a');
  linkBtn.className = 'btn btn-secondary';
  linkBtn.target = '_blank';
  linkBtn.rel = 'noopener noreferrer';
  linkBtn.textContent = '\uD83D\uDCEC Ov\u011b\u0159it schr\xe1nku';
  linkBtn.style.display = 'none';

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(linkBtn);
  body.appendChild(btnRow);
  el.appendChild(card.card);

  // Načtení aktuální hodnoty
  Api.apiGet('api/svj.php?action=getIsds')
    .then(function(data) {
      var id = data.isds_id || '';
      grp.input.value = id;
      isdsUpdateStatus(statusWrap, linkBtn, id);
    })
    .catch(function() {});

  saveBtn.addEventListener('click', function() {
    hideAdminBox(err); hideAdminBox(ok);
    saveBtn.disabled = true;
    var val = grp.input.value.trim();
    Api.apiPost('api/svj.php?action=updateIsds', { isds_id: val })
      .then(function() {
        showAdminBox(ok, 'ID datov\xe9 schr\xe1nky ulo\u017eeno.');
        isdsUpdateStatus(statusWrap, linkBtn, val);
      })
      .catch(function(e) { showAdminBox(err, e.message || 'Chyba p\u0159i ukl\xe1d\xe1n\xed.'); })
      .finally(function() { saveBtn.disabled = false; });
  });
}

function isdsUpdateStatus(wrap, linkBtn, id) {
  wrap.replaceChildren();
  if (!id) {
    var msg = document.createElement('div');
    msg.className = 'info-box info-box-warning';
    msg.style.margin = '0 0 8px';
    msg.textContent = 'Datov\xe1 schr\xe1nka nen\xed nastavena. SVJ je ze z\xe1kona povinno m\xedt aktivn\xed datovou schr\xe1nku.';
    wrap.appendChild(msg);
    linkBtn.style.display = 'none';
    return;
  }
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
  var badge = document.createElement('span');
  badge.className = 'badge badge-success';
  badge.textContent = '\uD83D\uDCEC ' + id;
  badge.style.fontSize = '0.95rem';
  row.appendChild(badge);
  wrap.appendChild(row);
  linkBtn.href = 'https://www.mojedatovaschranka.cz/sds/detail.do?login=' + encodeURIComponent(id);
  linkBtn.style.display = '';
}

/* ===== SDÍLENÉ HELPERY (používají admin-users, admin-invites, admin-settings) ===== */

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

/* showToast, showConfirmModal, copyToClipboard → js/ui.js */

function formatDatum(dateStr) {
  if (!dateStr) return '\u2014';
  var p = dateStr.split('-');
  return p.length === 3 ? p[2] + '. ' + p[1] + '. ' + p[0] : dateStr;
}
