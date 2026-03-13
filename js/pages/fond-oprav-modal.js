/* ===== FOND OPRAV — MODAL PŘIDÁNÍ/EDITACE + PŘÍLOHY ===== */

function fondShowRecordModal(existing, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';
  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:480px;'
    + 'max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';
  var titleEl = document.createElement('h2');
  titleEl.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  titleEl.textContent = existing ? 'Upravit z\xe1znam' : 'P\u0159idat z\xe1znam';
  modal.appendChild(titleEl);

  // Typ
  var typWrap = document.createElement('div');
  typWrap.style.marginBottom = '12px';
  var typLbl = document.createElement('label');
  typLbl.textContent = 'Typ *';
  typLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var typSel = document.createElement('select');
  typSel.className = 'form-input';
  [{ v: 'prijem', l: '\u2191 P\u0159\xedjem' }, { v: 'vydaj', l: '\u2193 V\xfddaj' }].forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.v; opt.textContent = t.l;
    if (existing && existing.typ === t.v) opt.selected = true;
    typSel.appendChild(opt);
  });
  typWrap.appendChild(typLbl); typWrap.appendChild(typSel);
  modal.appendChild(typWrap);

  // Kategorie
  var katWrap = document.createElement('div');
  katWrap.style.marginBottom = '12px';
  var katLbl = document.createElement('label');
  katLbl.textContent = 'Kategorie *';
  katLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var katSel = document.createElement('select');
  katSel.className = 'form-input';
  function updateKat() {
    katSel.replaceChildren();
    (typSel.value === 'prijem' ? FOND_KAT_PRIJEM : FOND_KAT_VYDAJ).forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      if (existing && existing.kategorie === k) opt.selected = true;
      katSel.appendChild(opt);
    });
  }
  updateKat();
  typSel.addEventListener('change', updateKat);
  katWrap.appendChild(katLbl); katWrap.appendChild(katSel);
  modal.appendChild(katWrap);

  var fPopis = fondModalField('Popis *', 'text', 'nap\u0159. Revize v\xfdtahu 2026');
  var fDatum = fondModalField('Datum *', 'date', '');
  var fCastka = fondModalField('\u010c\xe1stka (K\u010d) *', 'number', '15000');
  fCastka.input.min = '0.01'; fCastka.input.step = '0.01';
  var fPoz = fondModalField('Pozn\xe1mka', 'text', '');

  if (existing) {
    fPopis.input.value = existing.popis || '';
    fDatum.input.value = existing.datum || '';
    fCastka.input.value = existing.castka || '';
    fPoz.input.value = existing.poznamka || '';
  } else {
    fDatum.input.value = new Date().toISOString().slice(0, 10);
  }

  modal.appendChild(fPopis.el); modal.appendChild(fDatum.el);
  modal.appendChild(fCastka.el); modal.appendChild(fPoz.el);

  // Attachments section (only for existing records)
  if (existing) {
    fondBuildPrilohySection(modal, existing);
  }

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  modal.appendChild(errBox);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:12px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = existing ? 'Ulo\u017eit' : 'P\u0159idat';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    var popis = fPopis.input.value.trim();
    var datum = fDatum.input.value;
    var castka = fCastka.input.value;
    if (!popis) { errBox.textContent = 'Popis je povinn\xfd.'; errBox.style.display = ''; return; }
    if (!datum) { errBox.textContent = 'Datum je povinn\xe9.'; errBox.style.display = ''; return; }
    if (!castka || parseFloat(castka) <= 0) { errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return; }

    var payload = {
      typ: typSel.value, kategorie: katSel.value,
      popis: popis, datum: datum, castka: castka, poznamka: fPoz.input.value.trim(),
    };
    var action = 'add';
    if (existing) { payload.id = existing.id; action = 'update'; }

    saveBtn.disabled = true;
    Api.apiPost('api/fond_oprav.php?action=' + action, payload).then(function() {
      document.body.removeChild(overlay);
      showToast(existing ? 'Z\xe1znam upraven.' : 'Z\xe1znam p\u0159id\xe1n.', 'success');
      if (onSaved) onSaved();
    }).catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fPopis.input.focus();
}

/* ===== PŘÍLOHY SEKCE V MODALU ===== */

function fondBuildPrilohySection(modal, existing) {
  var sec = document.createElement('div');
  sec.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid var(--border);';
  var title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:0.9rem;margin-bottom:8px;';
  title.textContent = 'P\u0159\xedlohy';
  sec.appendChild(title);

  var prilohyList = document.createElement('div');
  sec.appendChild(prilohyList);

  // Upload form
  var uploadRow = document.createElement('div');
  uploadRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;';
  var fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.accept = '.pdf,.jpg,.jpeg,.png';
  fileInp.style.cssText = 'flex:1;font-size:0.85rem;';
  var uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn btn-secondary btn-sm';
  uploadBtn.textContent = 'Nahr\xe1t';
  uploadBtn.addEventListener('click', function() {
    if (!fileInp.files.length) return;
    var fd = new FormData();
    fd.append('fond_oprav_id', existing.id);
    fd.append('soubor', fileInp.files[0]);
    uploadBtn.disabled = true;
    fetch('api/fond_oprav.php?action=upload', {
      method: 'POST', body: fd, credentials: 'same-origin',
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.status === 'ok') {
        showToast('P\u0159\xedloha nahr\xe1na.', 'success');
        fileInp.value = '';
        loadPrilohy();
      } else {
        showToast(res.message || 'Chyba.', 'error');
      }
    }).catch(function() { showToast('Chyba uploadu.', 'error'); })
      .finally(function() { uploadBtn.disabled = false; });
  });
  uploadRow.appendChild(fileInp); uploadRow.appendChild(uploadBtn);
  sec.appendChild(uploadRow);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.75rem;color:var(--text-light);margin-top:4px;';
  hint.textContent = 'PDF, JPEG, PNG \u2014 max 10 MB';
  sec.appendChild(hint);

  modal.appendChild(sec);

  function loadPrilohy() {
    Api.apiGet('api/fond_oprav.php?action=prilohy&fond_oprav_id=' + existing.id).then(function(res) {
      fondRenderPrilohyList(prilohyList, res.prilohy || [], loadPrilohy);
    });
  }
  loadPrilohy();
}

function fondRenderPrilohyList(wrap, prilohy, onReload) {
  wrap.replaceChildren();
  if (!prilohy.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
    empty.textContent = '\u017d\xe1dn\xe9 p\u0159\xedlohy.';
    wrap.appendChild(empty);
    return;
  }
  prilohy.forEach(function(p) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.85rem;';
    var link = document.createElement('a');
    link.href = 'api/fond_oprav.php?action=prilohaDownload&id=' + p.id;
    link.textContent = p.soubor_nazev;
    link.style.cssText = 'flex:1;color:var(--accent);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    link.target = '_blank';
    row.appendChild(link);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm';
    delBtn.style.cssText = 'font-size:0.72rem;color:var(--danger);padding:2px 6px;';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Smazat p\u0159\xedlohu';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat p\u0159\xedlohu?', p.soubor_nazev, function() {
        Api.apiPost('api/fond_oprav.php?action=prilohaDelete', { id: p.id }).then(function() {
          showToast('P\u0159\xedloha smaz\xe1na.', 'success');
          onReload();
        }).catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
      });
    });
    row.appendChild(delBtn);
    wrap.appendChild(row);
  });
}

function fondModalField(label, type, ph) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '12px';
  var lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var inp = document.createElement('input');
  inp.type = type; inp.className = 'form-input'; inp.placeholder = ph || '';
  wrap.appendChild(lbl); wrap.appendChild(inp);
  return { el: wrap, input: inp };
}
