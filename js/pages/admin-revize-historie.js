/* ===== Revize — historie (archiv předchozích revizí) ===== */

var REV_VYSLEDKY = [
  { value: 'ok',            label: 'Bez z\xe1vad',     icon: '\u2705', color: 'var(--accent)' },
  { value: 'zavady',        label: 'Se z\xe1vadami',   icon: '\u26A0\uFE0F', color: 'var(--warning-dark, #f08600)' },
  { value: 'nezpusobile',   label: 'Nezp\u016fsobil\xe9', icon: '\u274C', color: 'var(--danger)' },
];

function revVysledekInfo(val) {
  var v = REV_VYSLEDKY.find(function(x) { return x.value === val; });
  return v || REV_VYSLEDKY[0];
}

/* ── Modal s historií revize ──────────────────────── */
function revHistShowModal(rev, user, onClose) {
  var isPriv = user.role === 'admin' || user.role === 'vybor';

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:24px;' +
    'max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25);';

  // Titulek
  var title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 4px;font-size:1.15rem;';
  title.textContent = revizeTypIcon(rev.typ) + ' ' + rev.nazev + ' \u2014 historie';
  modal.appendChild(title);

  var sub = document.createElement('p');
  sub.style.cssText = 'margin:0 0 16px;font-size:0.85rem;color:var(--text-light);';
  sub.textContent = 'Archiv v\u0161ech proveden\xfdch reviz\xed tohoto typu.';
  modal.appendChild(sub);

  // Přidat záznam (admin/výbor)
  if (isPriv) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.style.marginBottom = '16px';
    addBtn.textContent = '+ P\u0159idat z\xe1znam';
    addBtn.addEventListener('click', function() {
      revHistShowForm(modal, rev, null, user, function() {
        revHistReload(listWrap, rev, user);
      });
    });
    modal.appendChild(addBtn);
  }

  var listWrap = document.createElement('div');
  modal.appendChild(listWrap);

  // Close
  var closeRow = document.createElement('div');
  closeRow.style.cssText = 'display:flex;justify-content:flex-end;margin-top:16px;';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Zav\u0159\xedt';
  closeBtn.addEventListener('click', function() {
    overlay.remove();
    if (onClose) onClose();
  });
  closeRow.appendChild(closeBtn);
  modal.appendChild(closeRow);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); }
  });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  revHistReload(listWrap, rev, user);
}

function revHistReload(listWrap, rev, user) {
  listWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/revize.php?action=historieList&revize_id=' + rev.id)
    .then(function(data) {
      listWrap.replaceChildren();
      var items = data.historie || [];
      if (!items.length) {
        var empty = document.createElement('p');
        empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
        empty.textContent = 'Zat\xedm \u017e\xe1dn\xe9 z\xe1znamy v historii.';
        listWrap.appendChild(empty);
        return;
      }
      items.forEach(function(h) {
        listWrap.appendChild(revHistMakeRow(h, rev, user, listWrap));
      });
    })
    .catch(function() {
      listWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba.';
      listWrap.appendChild(err);
    });
}

function revHistMakeRow(h, rev, user, listWrap) {
  var isPriv = user.role === 'admin' || user.role === 'vybor';
  var vysl = revVysledekInfo(h.vysledek);

  var row = document.createElement('div');
  row.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);';

  // Hlavní řádek: datum + výsledek badge
  var top = document.createElement('div');
  top.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

  var datumEl = document.createElement('span');
  datumEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  datumEl.textContent = formatDatum(h.datum_revize);
  top.appendChild(datumEl);

  var badge = document.createElement('span');
  badge.style.cssText = 'display:inline-block;padding:4px 10px;border-radius:12px;' +
    'font-size:0.82rem;font-weight:600;color:#fff;background:' + vysl.color + ';';
  badge.textContent = vysl.icon + ' ' + vysl.label;
  top.appendChild(badge);

  row.appendChild(top);

  // Detaily
  var details = document.createElement('div');
  details.style.cssText = 'font-size:0.83rem;color:var(--text-light);margin-top:4px;';
  var parts = [];
  if (h.kontakt_nazev) parts.push('\uD83D\uDCDE ' + h.kontakt_nazev);
  if (h.naklady && parseFloat(h.naklady) > 0) {
    parts.push('\uD83D\uDCB0 ' + parseFloat(h.naklady).toLocaleString('cs-CZ') + ' K\u010d');
  }
  if (parts.length) {
    details.textContent = parts.join(' \u00b7 ');
    row.appendChild(details);
  }

  if (h.poznamka) {
    var poz = document.createElement('div');
    poz.style.cssText = 'font-size:0.82rem;color:var(--text-muted);margin-top:3px;font-style:italic;';
    poz.textContent = h.poznamka;
    row.appendChild(poz);
  }

  // Akce
  var akce = document.createElement('div');
  akce.style.cssText = 'display:flex;gap:6px;margin-top:6px;';

  if (h.soubor_nazev) {
    var dl = document.createElement('a');
    dl.className = 'btn btn-secondary btn-sm';
    dl.textContent = '\uD83D\uDCC4 ' + h.soubor_nazev;
    dl.href = 'api/revize.php?action=historieDownload&id=' + h.id;
    dl.target = '_blank';
    akce.appendChild(dl);
  }

  if (isPriv) {
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      revHistShowForm(row.closest('.modal-overlay') ? row.parentElement.parentElement : document.body,
        rev, h, user, function() { revHistReload(listWrap, rev, user); });
    });
    akce.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat z\xe1znam?', 'Z\xe1znam z ' + formatDatum(h.datum_revize) + ' bude odstran\u011bn.', function() {
        Api.apiPost('api/revize.php?action=historieDelete&id=' + h.id, {})
          .then(function() {
            showToast('Z\xe1znam smaz\xe1n');
            revHistReload(listWrap, rev, user);
          })
          .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
      });
    });
    akce.appendChild(delBtn);
  }

  if (akce.childNodes.length) row.appendChild(akce);

  // Závady z revize — show when vysledek is zavady or nezpusobile
  if (h.vysledek === 'zavady' || h.vysledek === 'nezpusobile' || isPriv) {
    rzRenderSection(row, h, isPriv);
  }

  return row;
}

/* ── Formulář pro přidání / úpravu záznamu historie ── */
function revHistShowForm(parent, rev, existing, user, onSaved) {
  // Sub-modal
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1100;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:24px;' +
    'max-width:450px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25);';

  var title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 16px;font-size:1.05rem;';
  title.textContent = existing ? 'Upravit z\xe1znam' : 'Nov\xfd z\xe1znam historie';
  modal.appendChild(title);

  // Datum
  var datumWrap = revHistField(modal, 'Datum revize *', 'date', existing ? existing.datum_revize : '');

  // Výsledek
  var vyslWrap = document.createElement('div');
  vyslWrap.style.marginBottom = '14px';
  var vyslLabel = document.createElement('label');
  vyslLabel.textContent = 'V\xfdsledek';
  vyslLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var vyslSelect = document.createElement('select');
  vyslSelect.className = 'form-input';
  REV_VYSLEDKY.forEach(function(v) {
    var opt = document.createElement('option');
    opt.value = v.value;
    opt.textContent = v.icon + ' ' + v.label;
    if (existing && existing.vysledek === v.value) opt.selected = true;
    vyslSelect.appendChild(opt);
  });
  vyslWrap.appendChild(vyslLabel);
  vyslWrap.appendChild(vyslSelect);
  modal.appendChild(vyslWrap);

  // Kontakt
  var kontWrap = document.createElement('div');
  kontWrap.style.marginBottom = '14px';
  var kontLabel = document.createElement('label');
  kontLabel.textContent = 'Revizn\xed firma / technik';
  kontLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var kontSelect = document.createElement('select');
  kontSelect.className = 'form-input';
  var emOpt = document.createElement('option');
  emOpt.value = ''; emOpt.textContent = '\u2014 nevybr\xe1no \u2014';
  kontSelect.appendChild(emOpt);
  kontWrap.appendChild(kontLabel);
  kontWrap.appendChild(kontSelect);
  modal.appendChild(kontWrap);

  revizeLoadKontakty().then(function(kontakty) {
    kontakty.forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k.id;
      opt.textContent = k.nazev;
      if (existing && existing.kontakt_id && String(existing.kontakt_id) === String(k.id)) opt.selected = true;
      kontSelect.appendChild(opt);
    });
  });

  // Náklady
  var nakladyInput = revHistField(modal, 'N\xe1klady (K\u010d)', 'number', existing && existing.naklady ? existing.naklady : '');
  nakladyInput.min = '0'; nakladyInput.step = '0.01';

  // Soubor
  var souborWrap = document.createElement('div');
  souborWrap.style.marginBottom = '14px';
  var souborLabel = document.createElement('label');
  souborLabel.textContent = existing && existing.soubor_nazev
    ? 'Nahradit PDF (' + existing.soubor_nazev + ')'
    : 'Protokol PDF (nepovinn\xe9)';
  souborLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var souborInput = document.createElement('input');
  souborInput.type = 'file'; souborInput.accept = 'application/pdf';
  souborInput.className = 'form-input';
  souborWrap.appendChild(souborLabel);
  souborWrap.appendChild(souborInput);
  modal.appendChild(souborWrap);

  // Poznámka
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLbl = document.createElement('label');
  pozLbl.textContent = 'Pozn\xe1mka';
  pozLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input'; pozInput.rows = 2;
  pozInput.value = existing ? (existing.poznamka || '') : '';
  pozWrap.appendChild(pozLbl);
  pozWrap.appendChild(pozInput);
  modal.appendChild(pozWrap);

  // Buttons
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() { overlay.remove(); });

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Ulo\u017eit';

  saveBtn.addEventListener('click', function() {
    if (!datumWrap.value) { showToast('Vypl\u0148te datum.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    var fd = new FormData();
    fd.append('revize_id', rev.id);
    if (existing) fd.append('id', existing.id);
    fd.append('datum_revize', datumWrap.value);
    fd.append('vysledek', vyslSelect.value);
    fd.append('kontakt_id', kontSelect.value || '');
    fd.append('naklady', nakladyInput.value || '');
    fd.append('poznamka', pozInput.value.trim());
    if (souborInput.files[0]) fd.append('soubor', souborInput.files[0]);

    fetch('api/revize.php?action=historieSave', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        showToast('Z\xe1znam ulo\u017een');
        handleGdriveFeedback(data);
        overlay.remove();
        if (onSaved) onSaved();
      })
      .catch(function(e) {
        showToast(e.message || 'Chyba.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Ulo\u017eit';
      });
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  datumWrap.focus();
}

function revHistField(parent, label, type, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var input = document.createElement('input');
  input.type = type; input.className = 'form-input';
  input.value = value || '';
  if (type === 'number') { input.style.maxWidth = '160px'; }
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  parent.appendChild(wrap);
  return input;
}
