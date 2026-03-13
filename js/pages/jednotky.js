/* ===== JEDNOTKY PAGE ===== */

Router.register('jednotky', function(el) {
  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Jednotky';
  var sub = document.createElement('p');
  sub.textContent = 'Přehled bytových a nebytových jednotek';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  var card = document.createElement('div');
  card.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Načítám jednotky\u2026';
  body.appendChild(loading);

  var user   = Auth.getUser();
  var isPriv = isPrivileged(user);

  function load() {
    body.replaceChildren(loading);
    loading.textContent = 'Načítám jednotky\u2026';
    loading.style.color = 'var(--text-light)';

    Api.apiGet('api/jednotky.php')
      .then(function(data) {
        body.removeChild(loading);
        if (!data.jednotky || !data.jednotky.length) {
          renderEmpty(body);
        } else {
          renderTable(body, data.jednotky, isPriv, load);
        }
      })
      .catch(function(e) {
        loading.textContent = 'Chyba: ' + (e.message || 'Nepodařilo se načíst jednotky.');
        loading.style.color = 'var(--danger)';
      });
  }

  load();
});

function renderEmpty(body) {
  var empty = document.createElement('div');
  empty.className = 'empty-state';
  var icon = document.createElement('div');
  icon.className  = 'icon';
  icon.textContent = '\uD83C\uDFE2';
  var msg = document.createElement('p');
  msg.textContent = 'Zatím nejsou importovány žádné jednotky. Správce portálu je může načíst přes Správu portálu → ČÚZK KN.';
  empty.appendChild(icon);
  empty.appendChild(msg);
  body.appendChild(empty);
}

function renderTable(body, jednotky, isPriv, reloadFn) {
  var svj = Auth.getSvj() || {};

  var plombyCount = jednotky.filter(function(j) { return j.plomba_aktivni; }).length;
  if (plombyCount && isPriv) {
    var warn = document.createElement('div');
    warn.className = 'info-box info-box-danger';
    warn.style.marginBottom = '14px';
    warn.textContent = '\u26A0\uFE0F Pozor: ' + plombyCount + ' jednotek má aktivní plombu v Katastru nemovitostí. Doporučujeme prověřit.';
    body.appendChild(warn);
  }

  // Akční tlačítka
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:12px;';

  var printBtn = document.createElement('button');
  printBtn.className = 'btn btn-secondary';
  printBtn.style.fontSize = '0.85rem';
  printBtn.textContent = '\uD83D\uDCF1 Tisknout QR kódy';
  printBtn.addEventListener('click', function() { jednotkyPrintQr(jednotky, svj); });
  actions.appendChild(printBtn);

  ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.fontSize = '0.82rem';
    btn.textContent = fmt === 'pdf' ? '\uD83D\uDCC3 Export PDF' : fmt === 'xlsx' ? '\uD83D\uDCCA Export XLSX' : '\uD83D\uDCC4 Export CSV';
    btn.addEventListener('click', function() {
      window.location.href = 'api/export.php?type=jednotky&format=' + fmt;
    });
    actions.appendChild(btn);
  });
  body.appendChild(actions);

  // Hlavička tabulky
  var cols = ['Č. j.', 'Vlastník', 'Využití / Stav', 'Podíl', 'LV', 'K.ú.', 'QR'];
  if (isPriv) cols.push('\u26A0\uFE0F', 'Upravit');

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  cols.forEach(function(c) {
    var th = document.createElement('th');
    if (c === '\u26A0\uFE0F') {
      var icon = document.createElement('span');
      icon.textContent = '\u26A0\uFE0F';
      icon.title = 'Plomba v KN — pro aktuální stav proveďte Aktualizaci z KN ve Správě portálu';
      icon.style.cssText = 'cursor:help;opacity:0.5;font-size:0.9em;';
      th.appendChild(icon);
    } else {
      th.textContent = c;
    }
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');
  jednotky.forEach(function(j) {
    var tr = document.createElement('tr');
    if (isPriv && j.plomba_aktivni) tr.style.background = 'var(--danger-bg, rgba(220,53,69,0.06))';

    var podil = (j.podil_citatel && j.podil_jmenovatel)
      ? j.podil_citatel + '\u202f/\u202f' + j.podil_jmenovatel : '\u2014';

    // Vlastník — preferuj registrovaného uživatele, pak ext
    var vlastnikJmeno = '';
    if (j.vlastnik_jmeno || j.vlastnik_prijmeni) {
      vlastnikJmeno = ((j.vlastnik_jmeno || '') + ' ' + (j.vlastnik_prijmeni || '')).trim();
    } else if (j.vlastnik_ext_jmeno || j.vlastnik_ext_prijmeni) {
      vlastnikJmeno = ((j.vlastnik_ext_jmeno || '') + ' ' + (j.vlastnik_ext_prijmeni || '')).trim();
    }

    // Využití + pronájem badge
    var vyuziti = j.zpusob_vyuziti || j.typ_jednotky || '\u2014';

    [
      j.cislo_jednotky,
      vlastnikJmeno || '\u2014',
      null, // renderujeme zvlášť (badge)
      podil,
      j.lv   || '\u2014',
      j.katastralni_uzemi || '\u2014',
    ].forEach(function(v, i) {
      if (v === null) return; // přeskočíme index 2 (Využití+stav), renderujeme níže
      var td = document.createElement('td');
      td.textContent = v;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });

    // Vložit Využití / Stav (index 2) na správné místo — rowChildren je [0,1], teď přidáme na pozici 2
    var tdVyuziti = document.createElement('td');
    tdVyuziti.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-light);white-space:nowrap;';
    var span = document.createElement('span');
    span.textContent = vyuziti;
    tdVyuziti.appendChild(span);
    if (j.pronajem) {
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Pronájem';
      badge.style.cssText = 'margin-left:6px;font-size:0.82rem;background:var(--warning,#f59e0b);color:#fff;';
      tdVyuziti.appendChild(badge);
    }
    tr.insertBefore(tdVyuziti, tr.children[2]);

    // QR tlačítko
    var tdQr = document.createElement('td');
    tdQr.style.cssText = 'padding:6px 12px;border-bottom:1px solid var(--border);';
    var qrBtn = document.createElement('button');
    qrBtn.className = 'btn btn-secondary';
    qrBtn.style.cssText = 'font-size:0.82rem;padding:4px 8px;min-height:32px;';
    qrBtn.textContent = 'QR';
    qrBtn.title = 'Zobrazit QR kód jednotky';
    qrBtn.addEventListener('click', function() { jednotkyShowQrModal(j, svj); });
    tdQr.appendChild(qrBtn);
    tr.appendChild(tdQr);

    // Plomba + Upravit — jen admin/výbor
    if (isPriv) {
      var tdPlomba = document.createElement('td');
      tdPlomba.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
      if (j.plomba_aktivni) {
        var plombaBadge = document.createElement('span');
        plombaBadge.className = 'badge badge-danger';
        plombaBadge.textContent = '\u26A0\uFE0F Plomba';
        plombaBadge.title = 'Na této jednotce je aktivní plomba v Katastru nemovitostí';
        tdPlomba.appendChild(plombaBadge);
      }
      tr.appendChild(tdPlomba);

      var tdEdit = document.createElement('td');
      tdEdit.style.cssText = 'padding:6px 12px;border-bottom:1px solid var(--border);';
      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary';
      editBtn.style.cssText = 'font-size:0.82rem;padding:4px 8px;min-height:32px;';
      editBtn.textContent = 'Upravit';
      editBtn.addEventListener('click', function() { showJednotkaModal(j, reloadFn); });
      tdEdit.appendChild(editBtn);
      tr.appendChild(tdEdit);
    }

    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;font-size:0.78rem;color:var(--text-light);';
  note.textContent = 'Zdroj: Katastr nemovitostí (ČÚZK API KN) \u00b7 ' + jednotky.length + ' jednotek';
  body.appendChild(note);
}

/* ===== MODAL: EDIT JEDNOTKY (vlastník, pronájem, nájemce, poznámka) ===== */

function showJednotkaModal(j, reloadFn) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:28px 28px 24px;' +
    'max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);max-height:90vh;overflow-y:auto;';

  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0 0 4px;font-size:1.05rem;';
  titleEl.textContent = 'Jednotka ' + (j.cislo_jednotky || '');
  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:18px;';
  sub.textContent = j.zpusob_vyuziti || j.typ_jednotky || '';
  modal.appendChild(titleEl);
  modal.appendChild(sub);

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.cssText = 'display:none;margin-bottom:12px;';
  modal.appendChild(errBox);

  // ===== SEKCE VLASTNÍK =====
  var ownerReady = false;
  var ownerGetData = function() { return {}; };

  var ownerWrap = document.createElement('div');
  ownerWrap.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px;';
  var ownerHdr = document.createElement('div');
  ownerHdr.style.cssText = 'font-weight:600;font-size:0.88rem;margin-bottom:10px;color:var(--text-light);' +
    'text-transform:uppercase;letter-spacing:0.05em;';
  ownerHdr.textContent = 'Vlastník jednotky';
  ownerWrap.appendChild(ownerHdr);
  var ownerBody = document.createElement('div');
  ownerBody.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
  ownerBody.textContent = 'Načítám\u2026';
  ownerWrap.appendChild(ownerBody);
  modal.appendChild(ownerWrap);

  // ===== SEKCE PRONÁJEM =====
  var pronajemWrap = document.createElement('div');
  pronajemWrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
  var pronajemChk = document.createElement('input');
  pronajemChk.type = 'checkbox'; pronajemChk.id = 'j-pronajem';
  pronajemChk.checked = !!j.pronajem;
  pronajemChk.style.cssText = 'width:18px;height:18px;cursor:pointer;';
  var pronajemLbl = document.createElement('label');
  pronajemLbl.htmlFor = 'j-pronajem'; pronajemLbl.textContent = 'Byt je pronajímán';
  pronajemLbl.style.cssText = 'font-weight:500;font-size:0.95rem;cursor:pointer;';
  pronajemWrap.appendChild(pronajemChk);
  pronajemWrap.appendChild(pronajemLbl);
  modal.appendChild(pronajemWrap);

  var najemceSection = document.createElement('div');
  najemceSection.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px;' +
    (j.pronajem ? '' : 'display:none;');
  var njHdr = document.createElement('div');
  njHdr.style.cssText = 'font-weight:600;font-size:0.88rem;margin-bottom:12px;color:var(--text-light);' +
    'text-transform:uppercase;letter-spacing:0.05em;';
  njHdr.textContent = 'Kontakt na nájemce';
  najemceSection.appendChild(njHdr);

  function makeField(lbl, type, id, val) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';
    var label = document.createElement('label');
    label.htmlFor = id; label.textContent = lbl;
    label.style.cssText = 'display:block;margin-bottom:3px;font-size:0.88rem;font-weight:500;';
    var inp = document.createElement('input');
    inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = val || '';
    wrap.appendChild(label); wrap.appendChild(inp);
    return { el: wrap, input: inp };
  }

  var njmeno    = makeField('Jméno nájemce',    'text',  'j-njmeno',    j.najemce_jmeno    || '');
  var nprijmeni = makeField('Příjmení nájemce', 'text',  'j-nprijmeni', j.najemce_prijmeni || '');
  var ntelefon  = makeField('Telefon nájemce',  'tel',   'j-ntelefon',  j.najemce_telefon  || '');
  var nemail    = makeField('E-mail nájemce',   'email', 'j-nemail',    j.najemce_email    || '');
  [njmeno, nprijmeni, ntelefon, nemail].forEach(function(f) { najemceSection.appendChild(f.el); });
  modal.appendChild(najemceSection);
  pronajemChk.addEventListener('change', function() {
    najemceSection.style.display = pronajemChk.checked ? '' : 'none';
  });

  var poznamka = makeField('Poznámka k jednotce', 'text', 'j-poznamka', j.poznamka || '');
  modal.appendChild(poznamka.el);

  // ===== TLAČÍTKA =====
  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:6px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary'; cancelBtn.textContent = 'Zrušit';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary'; saveBtn.textContent = 'Uložit';
  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    saveBtn.disabled = true;
    var payload = Object.assign({
      id:               j.id,
      pronajem:         pronajemChk.checked,
      najemce_jmeno:    njmeno.input.value.trim(),
      najemce_prijmeni: nprijmeni.input.value.trim(),
      najemce_telefon:  ntelefon.input.value.trim(),
      najemce_email:    nemail.input.value.trim(),
      poznamka:         poznamka.input.value.trim(),
    }, ownerGetData());
    Api.apiPost('api/jednotky.php?action=update', payload)
      .then(function() { document.body.removeChild(overlay); reloadFn(); showToast('Jednotka uložena.'); })
      .catch(function(e) { errBox.textContent = e.message || 'Chyba při ukládání.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });
  btns.appendChild(cancelBtn);
  btns.appendChild(saveBtn);
  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);

  // ===== NAČTENÍ VLASTNÍKŮ (async) =====
  Promise.all([
    Api.apiGet('api/admin.php?action=listUsers'),
    Api.apiGet('api/vlastnici_ext.php?action=list')
  ]).then(function(res) {
    var users = res[0].users       || [];
    var exts  = res[1].vlastnici_ext || [];
    ownerBody.replaceChildren();

    var initType = j.vlastnik_user_id ? 'user' : (j.vlastnik_ext_id ? 'ext' : 'none');

    function makeRadio(value, labelText) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
      var r = document.createElement('input');
      r.type = 'radio'; r.name = 'j-owner-type'; r.value = value;
      r.checked = (initType === value);
      r.style.cssText = 'width:16px;height:16px;cursor:pointer;flex-shrink:0;';
      var lbl = document.createElement('label');
      lbl.textContent = labelText;
      lbl.style.cssText = 'cursor:pointer;font-size:0.92rem;';
      lbl.addEventListener('click', function() { r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); });
      row.appendChild(r); row.appendChild(lbl);
      return row;
    }

    function makeSelect(opts, selectedId) {
      var sel = document.createElement('select');
      sel.className = 'form-input';
      sel.style.cssText = 'margin:4px 0 10px 24px;max-width:calc(100% - 24px);';
      var opt0 = document.createElement('option'); opt0.value = ''; opt0.textContent = '— vyberte —';
      sel.appendChild(opt0);
      opts.forEach(function(o) {
        var opt = document.createElement('option');
        opt.value = o.id; opt.textContent = o.label;
        if (String(o.id) === String(selectedId)) opt.selected = true;
        sel.appendChild(opt);
      });
      return sel;
    }

    ownerBody.appendChild(makeRadio('none', 'Bez přiřazeného vlastníka'));

    ownerBody.appendChild(makeRadio('user', 'Registrovaný člen portálu:'));
    var userSel = makeSelect(
      users.map(function(u) {
        return { id: u.id, label: ((u.prijmeni || '') + ' ' + (u.jmeno || '')).trim() +
          (u.cislo_jednotky ? ' (j.\u202f' + u.cislo_jednotky + ')' : '') };
      }),
      j.vlastnik_user_id
    );
    userSel.style.display = (initType === 'user') ? '' : 'none';
    ownerBody.appendChild(userSel);

    ownerBody.appendChild(makeRadio('ext', 'Neregistrovaný vlastník:'));
    var extSel = makeSelect(
      exts.map(function(e) {
        return { id: e.id, label: ((e.prijmeni || '') + ' ' + (e.jmeno || '')).trim() +
          (e.cislo_jednotky ? ' (j.\u202f' + e.cislo_jednotky + ')' : '') };
      }),
      j.vlastnik_ext_id
    );
    extSel.style.display = (initType === 'ext') ? '' : 'none';
    ownerBody.appendChild(extSel);

    var note = document.createElement('div');
    note.style.cssText = 'font-size:0.82rem;color:var(--text-muted);margin-top:4px;';
    note.textContent = 'Neregistrované vlastníky přidáte v Admin \u2192 Neregistrovaní vlastníci.';
    ownerBody.appendChild(note);

    ownerBody.addEventListener('change', function(e) {
      if (e.target.name !== 'j-owner-type') return;
      userSel.style.display = e.target.value === 'user' ? '' : 'none';
      extSel.style.display  = e.target.value === 'ext'  ? '' : 'none';
    });

    ownerReady = true;
    ownerGetData = function() {
      var checked = ownerBody.querySelector('input[name="j-owner-type"]:checked');
      var t = checked ? checked.value : 'none';
      return {
        owner_user_id: t === 'user' ? (parseInt(userSel.value) || null) : null,
        owner_ext_id:  t === 'ext'  ? (parseInt(extSel.value)  || null) : null,
      };
    };
  }).catch(function() {
    ownerBody.textContent = 'Nepodařilo se načíst vlastníky.';
  });
}

/* QR kódy → jednotky-qr.js */
