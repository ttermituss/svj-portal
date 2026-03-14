/* ===== FOND OPRAV — MODAL PŘIDÁNÍ/EDITACE + PŘÍLOHY ===== */
/* createModal / makeFormField → js/ui.js */

function fondShowRecordModal(existing, onSaved) {
  var m = createModal({ title: existing ? 'Upravit z\xe1znam' : 'P\u0159idat z\xe1znam', width: '480px' });
  var modal = m.modal;

  // Typ
  var typField = makeFormField('Typ *', 'select', '', { options: [
    { value: 'prijem', label: '\u2191 P\u0159\xedjem' },
    { value: 'vydaj',  label: '\u2193 V\xfddaj' },
  ]});
  if (existing) typField.input.value = existing.typ;
  modal.appendChild(typField.el);
  var typSel = typField.input;

  // Kategorie (dynamicky dle typu)
  var katField = makeFormField('Kategorie *', 'select', '', { options: [] });
  var katSel = katField.input;
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
  modal.appendChild(katField.el);

  var fPopis  = makeFormField('Popis *', 'text', '', { placeholder: 'nap\u0159. Revize v\xfdtahu 2026' });
  var fDatum  = makeFormField('Datum *', 'date', '');
  var fCastka = makeFormField('\u010c\xe1stka (K\u010d) *', 'number', '', { placeholder: '15000' });
  fCastka.input.min = '0.01'; fCastka.input.step = '0.01';
  var fPoz    = makeFormField('Pozn\xe1mka', 'text', '');

  if (existing) {
    fPopis.input.value  = existing.popis    || '';
    fDatum.input.value  = existing.datum    || '';
    fCastka.input.value = existing.castka   || '';
    fPoz.input.value    = existing.poznamka || '';
  } else {
    fDatum.input.value = new Date().toISOString().slice(0, 10);
  }

  modal.appendChild(fPopis.el); modal.appendChild(fDatum.el);
  modal.appendChild(fCastka.el); modal.appendChild(fPoz.el);

  // Přílohy (jen u existujících záznamů)
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
  cancelBtn.addEventListener('click', function() { m.close(); });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = existing ? 'Ulo\u017eit' : 'P\u0159idat';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    var popis  = fPopis.input.value.trim();
    var datum  = fDatum.input.value;
    var castka = fCastka.input.value;
    if (!popis)  { errBox.textContent = 'Popis je povinn\xfd.'; errBox.style.display = ''; return; }
    if (!datum)  { errBox.textContent = 'Datum je povinn\xe9.'; errBox.style.display = ''; return; }
    if (!castka || parseFloat(castka) <= 0) { errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return; }

    var payload = {
      typ: typSel.value, kategorie: katSel.value,
      popis: popis, datum: datum, castka: castka, poznamka: fPoz.input.value.trim(),
    };
    var action = 'add';
    if (existing) { payload.id = existing.id; action = 'update'; }

    saveBtn.disabled = true;
    Api.apiPost('api/fond_oprav.php?action=' + action, payload).then(function() {
      m.close();
      showToast(existing ? 'Z\xe1znam upraven.' : 'Z\xe1znam p\u0159id\xe1n.', 'success');
      if (onSaved) onSaved();
    }).catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

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
    fetch('api/fond_prilohy.php?action=upload', {
      method: 'POST', body: fd, credentials: 'same-origin',
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.status === 'ok') {
        showToast('P\u0159\xedloha nahr\xe1na.', 'success');
        handleGdriveFeedback(res);
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
  hint.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  hint.textContent = 'PDF, JPEG, PNG \u2014 max 10 MB';
  sec.appendChild(hint);

  modal.appendChild(sec);

  function loadPrilohy() {
    Api.apiGet('api/fond_prilohy.php?action=list&fond_oprav_id=' + existing.id).then(function(res) {
      fondRenderPrilohyList(prilohyList, res.prilohy || [], loadPrilohy);
    }).catch(function() {});
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
    link.href = 'api/fond_prilohy.php?action=download&id=' + p.id;
    link.textContent = p.soubor_nazev;
    link.style.cssText = 'flex:1;color:var(--accent);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    link.target = '_blank';
    row.appendChild(link);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm';
    delBtn.style.cssText = 'font-size:0.82rem;color:var(--danger);padding:5px 10px;';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Smazat p\u0159\xedlohu';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat p\u0159\xedlohu?', p.soubor_nazev, function() {
        Api.apiPost('api/fond_prilohy.php?action=delete', { id: p.id }).then(function() {
          showToast('P\u0159\xedloha smaz\xe1na.', 'success');
          onReload();
        }).catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
      });
    });
    row.appendChild(delBtn);
    wrap.appendChild(row);
  });
}

