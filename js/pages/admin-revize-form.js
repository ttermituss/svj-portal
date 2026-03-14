/* ===== Revize — formulář přidání / úpravy ===== */

function revizeShowForm(formWrap, rev, listWrap, user, addBtn) {
  formWrap.replaceChildren();
  formWrap.style.display = '';
  if (addBtn) addBtn.style.display = 'none';

  var sep = document.createElement('hr');
  sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:16px 0;';
  formWrap.appendChild(sep);

  var heading = document.createElement('h3');
  heading.style.cssText = 'margin:0 0 16px;font-size:0.95rem;';
  heading.textContent = rev ? 'Upravit revizi' : 'P\u0159idat revizi';
  formWrap.appendChild(heading);

  // Typ
  var typWrap = document.createElement('div');
  typWrap.style.marginBottom = '14px';
  var typLabel = document.createElement('label');
  typLabel.textContent = 'Typ revize';
  typLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var typSelect = document.createElement('select');
  typSelect.className = 'form-input';
  typSelect.style.maxWidth = '220px';
  REVIZE_TYPY.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.icon + ' ' + t.label;
    if (rev && rev.typ === t.value) opt.selected = true;
    typSelect.appendChild(opt);
  });
  typWrap.appendChild(typLabel);
  typWrap.appendChild(typSelect);
  formWrap.appendChild(typWrap);

  var nazevField = makeFormField('N\xe1zev / popis', 'text', rev ? rev.nazev : '');
  nazevField.input.placeholder = 'nap\u0159. Elektrorevize spole\u010dn\xfdch prostor';
  formWrap.appendChild(nazevField.el);

  var posledniField = makeFormField('Datum posledn\xed revize', 'date', rev ? rev.datum_posledni : '');
  formWrap.appendChild(posledniField.el);

  // Interval
  var intervalWrap = document.createElement('div');
  intervalWrap.style.marginBottom = '14px';
  var intervalLabel = document.createElement('label');
  intervalLabel.textContent = 'Interval opakov\xe1n\xed (m\u011bs\xedce)';
  intervalLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var intervalInput = document.createElement('input');
  intervalInput.type = 'number'; intervalInput.className = 'form-input';
  intervalInput.style.maxWidth = '120px'; intervalInput.min = '1'; intervalInput.placeholder = '36';
  intervalInput.value = rev && rev.interval_mesice ? rev.interval_mesice : '';
  var intervalHint = document.createElement('div');
  intervalHint.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  intervalHint.textContent = 'P\u0159i vypln\u011bn\xed se datum p\u0159\xed\u0161t\xed revize vypo\u010d\xedt\xe1 automaticky.';
  intervalWrap.appendChild(intervalLabel);
  intervalWrap.appendChild(intervalInput);
  intervalWrap.appendChild(intervalHint);
  formWrap.appendChild(intervalWrap);

  var pristiField = makeFormField('Datum p\u0159\xed\u0161t\xed revize (nepovinn\xe9)', 'date', rev && rev.datum_pristi ? rev.datum_pristi : '');
  formWrap.appendChild(pristiField.el);

  // Kontakt select
  var kontWrap = document.createElement('div');
  kontWrap.style.marginBottom = '14px';
  var kontLabel = document.createElement('label');
  kontLabel.textContent = 'Revizn\xed firma / technik';
  kontLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var kontSelect = document.createElement('select');
  kontSelect.className = 'form-input';
  kontSelect.style.maxWidth = '300px';
  var emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = '\u2014 nevybr\xe1no \u2014';
  kontSelect.appendChild(emptyOpt);
  kontWrap.appendChild(kontLabel);
  kontWrap.appendChild(kontSelect);
  formWrap.appendChild(kontWrap);

  // Načti kontakty
  revizeLoadKontakty().then(function(kontakty) {
    kontakty.forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k.id;
      opt.textContent = k.nazev + (k.kategorie ? ' (' + k.kategorie + ')' : '');
      if (rev && rev.kontakt_id && String(rev.kontakt_id) === String(k.id)) opt.selected = true;
      kontSelect.appendChild(opt);
    });
  });

  // Náklady
  var nakladyField = makeFormField('N\xe1klady (K\u010d)', 'number', rev && rev.naklady ? rev.naklady : '');
  nakladyField.input.placeholder = 'nap\u0159. 15000';
  nakladyField.input.min = '0'; nakladyField.input.step = '0.01';
  formWrap.appendChild(nakladyField.el);

  // Připomenutí
  var pripWrap = document.createElement('div');
  pripWrap.style.marginBottom = '14px';
  var pripLabel = document.createElement('label');
  pripLabel.textContent = 'P\u0159ipomenout (dn\xed p\u0159ed term\xednem)';
  pripLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pripInput = document.createElement('input');
  pripInput.type = 'number'; pripInput.className = 'form-input';
  pripInput.style.maxWidth = '120px'; pripInput.min = '1'; pripInput.placeholder = '30';
  pripInput.value = rev && rev.pripomenout_dni ? rev.pripomenout_dni : '';
  var pripHint = document.createElement('div');
  pripHint.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  pripHint.textContent = 'Vytvo\u0159\xed notifikaci X dn\xed p\u0159ed vypr\u0161en\xedm.';
  pripWrap.appendChild(pripLabel);
  pripWrap.appendChild(pripInput);
  pripWrap.appendChild(pripHint);
  formWrap.appendChild(pripWrap);

  // Soubor PDF
  var souborWrap = document.createElement('div');
  souborWrap.style.marginBottom = '14px';
  var souborLabel = document.createElement('label');
  souborLabel.textContent = rev && rev.soubor_nazev
    ? 'Nahradit protokol PDF (aktu\xe1ln\xed: ' + rev.soubor_nazev + ')'
    : 'Protokol PDF (nepovinn\xe9)';
  souborLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var souborInput = document.createElement('input');
  souborInput.type = 'file'; souborInput.accept = 'application/pdf';
  souborInput.className = 'form-input';
  souborWrap.appendChild(souborLabel);
  souborWrap.appendChild(souborInput);
  formWrap.appendChild(souborWrap);

  // Poznámka
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input'; pozInput.rows = 2;
  pozInput.value = rev ? (rev.poznamka || '') : '';
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  formWrap.appendChild(pozWrap);

  // Auto-fill intervalu
  typSelect.addEventListener('change', function() {
    if (!intervalInput.value) {
      var def = revizeDefaultInterval(typSelect.value);
      if (def) intervalInput.value = def;
    }
  });

  // Tlačítka
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Ulo\u017eit revizi';
  btnRow.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() {
    formWrap.style.display = 'none';
    formWrap.replaceChildren();
    if (addBtn) addBtn.style.display = '';
  });
  btnRow.appendChild(cancelBtn);
  formWrap.appendChild(btnRow);

  if (!rev) {
    var defInterval = revizeDefaultInterval(typSelect.value);
    if (defInterval) intervalInput.value = defInterval;
  }

  saveBtn.addEventListener('click', function() {
    var nazev    = nazevField.input.value.trim();
    var posledni = posledniField.input.value;
    if (!nazev) { showToast('Vypl\u0148te n\xe1zev revize.', 'error'); return; }
    if (!posledni) { showToast('Vypl\u0148te datum posledn\xed revize.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    var fd = new FormData();
    if (rev) fd.append('id', rev.id);
    fd.append('typ', typSelect.value);
    fd.append('nazev', nazev);
    fd.append('datum_posledni', posledni);
    fd.append('interval_mesice', intervalInput.value || '');
    fd.append('datum_pristi', pristiField.input.value || '');
    fd.append('kontakt_id', kontSelect.value || '');
    fd.append('naklady', nakladyField.input.value || '');
    fd.append('pripomenout_dni', pripInput.value || '');
    fd.append('poznamka', pozInput.value.trim());
    if (souborInput.files[0]) fd.append('soubor', souborInput.files[0]);

    fetch('api/revize.php?action=save', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        showToast('Revize ulo\u017eena');
        handleGdriveFeedback(data);
        formWrap.style.display = 'none';
        formWrap.replaceChildren();
        if (addBtn) addBtn.style.display = '';
        revizeLoad(listWrap, formWrap, user);
      })
      .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); })
      .finally(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Ulo\u017eit revizi';
      });
  });
}
