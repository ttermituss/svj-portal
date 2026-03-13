/* ===== SPRÁVA NEREGISTROVANÝCH VLASTNÍKŮ ===== */

function renderVlastniciExtCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Neregistrovaní vlastníci');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Vlastníci bytů, kteří nejsou registrováni v portálu — evidence kontaktů a propojení s jednotkami.';
  body.appendChild(hint);

  var err  = makeAdminInfoBox(false);
  var wrap = document.createElement('div');
  body.appendChild(err);
  body.appendChild(wrap);

  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.style.marginTop = '12px';
  addBtn.textContent = '+ Přidat vlastníka';
  body.appendChild(addBtn);

  el.appendChild(card.card);

  var jednotkyCache = null;
  function loadJednotky(cb) {
    if (jednotkyCache) { cb(jednotkyCache); return; }
    Api.apiGet('api/jednotky.php')
      .then(function(d) { jednotkyCache = d.jednotky || []; cb(jednotkyCache); })
      .catch(function()  { cb([]); });
  }

  function load() {
    wrap.replaceChildren();
    hideAdminBox(err);
    var loading = document.createElement('p');
    loading.style.color = 'var(--text-light)';
    loading.textContent = 'Načítám...';
    wrap.appendChild(loading);

    Api.apiGet('api/vlastnici_ext.php?action=list')
      .then(function(data) {
        wrap.replaceChildren();
        renderExtTable(wrap, data.vlastnici_ext || [], load, loadJednotky);
      })
      .catch(function(e) {
        wrap.replaceChildren();
        showAdminBox(err, e.message || 'Chyba při načítání.');
      });
  }

  addBtn.addEventListener('click', function() {
    loadJednotky(function(j) { showExtModal(null, j, load); });
  });

  load();
}

function renderExtTable(wrap, list, reloadFn, loadJednotky) {
  if (!list.length) {
    var p = document.createElement('p');
    p.style.color = 'var(--text-light)';
    p.textContent = 'Žádní neregistrovaní vlastníci.';
    wrap.appendChild(p);
    return;
  }

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Jméno', 'Telefon', 'E-mail', 'Jednotka', 'Akce'].forEach(function(c) {
    var th = document.createElement('th');
    th.textContent = c;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');
  list.forEach(function(v) {
    var tr = document.createElement('tr');
    var fullName = (((v.jmeno || '') + ' ' + (v.prijmeni || '')).trim()) || '\u2014';

    [fullName, v.telefon || '\u2014', v.email || '\u2014', v.cislo_jednotky || '\u2014'].forEach(function(val, i) {
      var td = document.createElement('td');
      td.textContent = val;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });

    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;';

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.style.cssText = 'font-size:0.82rem;padding:4px 10px;margin-right:6px;';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      loadJednotky(function(j) { showExtModal(v, j, reloadFn); });
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.style.cssText = 'font-size:0.82rem;padding:4px 10px;';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat vlastníka?', fullName, function() {
        Api.apiPost('api/vlastnici_ext.php?action=delete', { id: v.id })
          .then(reloadFn)
          .catch(function(e) { showToast(e.message || 'Chyba při mazání.', 'error'); });
      });
    });

    tdAkce.appendChild(editBtn);
    tdAkce.appendChild(delBtn);
    tr.appendChild(tdAkce);
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  wrap.appendChild(tbl);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;font-size:0.82rem;color:var(--text-light);';
  note.textContent = list.length + ' záznam\u016f';
  wrap.appendChild(note);
}

function showExtModal(item, jednotky, reloadFn) {
  var isEdit  = !!item;
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:28px 28px 24px;' +
    'max-width:440px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;';

  var title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 18px;font-size:1.05rem;';
  title.textContent   = isEdit ? 'Upravit vlastníka' : 'Přidat vlastníka';
  modal.appendChild(title);

  var errBox = makeAdminInfoBox(false);
  modal.appendChild(errBox);

  var jmenoGrp    = makeAdminField('Jméno',     'text',  'ext-jmeno',    item ? (item.jmeno    || '') : '');
  var prijmeniGrp = makeAdminField('Příjmení',  'text',  'ext-prijmeni', item ? (item.prijmeni || '') : '');
  var telefonGrp  = makeAdminField('Telefon',   'tel',   'ext-telefon',  item ? (item.telefon  || '') : '');
  var emailGrp    = makeAdminField('E-mail',    'email', 'ext-email',    item ? (item.email    || '') : '');
  var poznamkaGrp = makeAdminField('Poznámka',  'text',  'ext-poznamka', item ? (item.poznamka || '') : '');

  // Přiřazení k jednotce
  var jidWrap = document.createElement('div');
  jidWrap.style.marginBottom = '16px';
  var jidLbl = document.createElement('label');
  jidLbl.htmlFor    = 'ext-jednotka';
  jidLbl.textContent = 'Přiřadit k jednotce';
  jidLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var jidSel = document.createElement('select');
  jidSel.id        = 'ext-jednotka';
  jidSel.className = 'form-input';

  var optNone = document.createElement('option');
  optNone.value       = '';
  optNone.textContent = '— nepřiřazeno —';
  jidSel.appendChild(optNone);

  jednotky.forEach(function(j) {
    var opt = document.createElement('option');
    opt.value       = j.id;
    opt.textContent = j.cislo_jednotky + (j.zpusob_vyuziti ? ' \u2014 ' + j.zpusob_vyuziti : '');
    if (item && item.jednotka_id && String(j.id) === String(item.jednotka_id)) opt.selected = true;
    jidSel.appendChild(opt);
  });
  jidWrap.appendChild(jidLbl);
  jidWrap.appendChild(jidSel);

  modal.appendChild(jmenoGrp.el);
  modal.appendChild(prijmeniGrp.el);
  modal.appendChild(telefonGrp.el);
  modal.appendChild(emailGrp.el);
  modal.appendChild(jidWrap);
  modal.appendChild(poznamkaGrp.el);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:6px;';

  var cancelBtn = document.createElement('button');
  cancelBtn.className   = 'btn btn-secondary';
  cancelBtn.textContent = 'Zrušit';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });

  var saveBtn = document.createElement('button');
  saveBtn.className   = 'btn btn-primary';
  saveBtn.textContent = isEdit ? 'Uložit' : 'Přidat';
  saveBtn.addEventListener('click', function() {
    hideAdminBox(errBox);
    var payload = {
      jmeno:       jmenoGrp.input.value.trim(),
      prijmeni:    prijmeniGrp.input.value.trim(),
      telefon:     telefonGrp.input.value.trim(),
      email:       emailGrp.input.value.trim(),
      jednotka_id: jidSel.value || null,
      poznamka:    poznamkaGrp.input.value.trim(),
    };
    if (!payload.jmeno && !payload.prijmeni) {
      showAdminBox(errBox, 'Vyplňte alespoň jméno nebo příjmení.');
      return;
    }
    if (isEdit) payload.id = item.id;
    saveBtn.disabled = true;
    Api.apiPost('api/vlastnici_ext.php?action=save', payload)
      .then(function() {
        document.body.removeChild(overlay);
        reloadFn();
        showToast(isEdit ? 'Vlastník upraven.' : 'Vlastník přidán.');
      })
      .catch(function(e) { showAdminBox(errBox, e.message || 'Chyba.'); })
      .finally(function() { saveBtn.disabled = false; });
  });

  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}
