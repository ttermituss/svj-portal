/* ===== FOND ZÁLOHY — MODALY ===== */

/* ===== MODAL: generovat předpisy z podílů ===== */

function fondZalohyShowGenerateModal(rok, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:400px;'
    + 'box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';

  var titleEl = document.createElement('h2');
  titleEl.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  titleEl.textContent = 'Generovat p\u0159edpisy ' + rok;
  modal.appendChild(titleEl);

  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 14px;';
  desc.textContent = 'Zadejte celkovou m\u011bs\xed\u010dn\xed \u010d\xe1stku. Syst\xe9m ji rozd\u011bl\xed dle pod\xedl\u016f jednotek.';
  modal.appendChild(desc);

  var fCastka = fondModalField('Celkov\xe1 m\u011bs\xed\u010dn\xed \u010d\xe1stka (K\u010d) *', 'number', '25000');
  fCastka.input.min = '1'; fCastka.input.step = '1';
  modal.appendChild(fCastka.el);

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
  var genBtn = document.createElement('button');
  genBtn.className = 'btn btn-primary';
  genBtn.textContent = 'Generovat';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(genBtn);
  modal.appendChild(btnRow);

  genBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    var castka = fCastka.input.value;
    if (!castka || parseFloat(castka) <= 0) {
      errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return;
    }
    genBtn.disabled = true;
    Api.apiPost('api/fond_zalohy.php?action=predpisGenerate', { rok: rok, celkova_castka: castka })
      .then(function(res) {
        document.body.removeChild(overlay);
        showToast(res.message || 'P\u0159edpisy vygenerov\xe1ny.', 'success');
        if (onSaved) onSaved();
      })
      .catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { genBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fCastka.input.focus();
}

/* ===== MODAL: editace předpisu ===== */

function fondZalohyShowPredpisEditModal(predpis, rok, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:400px;'
    + 'box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';

  var titleEl = document.createElement('h2');
  titleEl.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  titleEl.textContent = 'Upravit p\u0159edpis \u2014 ' + (predpis.cislo_jednotky || '#' + predpis.jednotka_id);
  modal.appendChild(titleEl);

  var fCastka = fondModalField('M\u011bs\xed\u010dn\xed \u010d\xe1stka (K\u010d) *', 'number', '');
  fCastka.input.min = '0'; fCastka.input.step = '0.01';
  fCastka.input.value = predpis.mesicni_castka || '';
  modal.appendChild(fCastka.el);

  var fPoz = fondModalField('Pozn\xe1mka', 'text', '');
  fPoz.input.value = predpis.poznamka || '';
  modal.appendChild(fPoz.el);

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
  saveBtn.textContent = 'Ulo\u017eit';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    var castka = fCastka.input.value;
    if (!castka || parseFloat(castka) < 0) {
      errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return;
    }
    saveBtn.disabled = true;
    Api.apiPost('api/fond_zalohy.php?action=predpisSave', {
      rok: rok, jednotka_id: predpis.jednotka_id,
      mesicni_castka: castka, poznamka: fPoz.input.value.trim(),
    }).then(function() {
      document.body.removeChild(overlay);
      showToast('P\u0159edpis ulo\u017een.', 'success');
      if (onSaved) onSaved();
    }).catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fCastka.input.focus();
}

/* ===== MODAL: zaplacení zálohy ===== */

function fondZalohyShowPayModal(zaloha, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:400px;'
    + 'box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';

  var titleEl = document.createElement('h2');
  titleEl.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  var vlastnik = ((zaloha.vlastnik_jmeno || '') + ' ' + (zaloha.vlastnik_prijmeni || '')).trim();
  titleEl.textContent = 'Platba z\xe1lohy \u2014 ' + (zaloha.cislo_jednotky || '') + (vlastnik ? ' (' + vlastnik + ')' : '');
  modal.appendChild(titleEl);

  var infoRow = document.createElement('div');
  infoRow.style.cssText = 'font-size:0.88rem;margin-bottom:14px;color:var(--text-light);';
  infoRow.textContent = 'P\u0159edeps\xe1no: ' + fondFmt(zaloha.predepsano) + ' K\u010d';
  modal.appendChild(infoRow);

  var fCastka = fondModalField('Zaplacen\xe1 \u010d\xe1stka (K\u010d) *', 'number', '');
  fCastka.input.min = '0'; fCastka.input.step = '0.01';
  fCastka.input.value = parseFloat(zaloha.zaplaceno) > 0 ? zaloha.zaplaceno : zaloha.predepsano;
  modal.appendChild(fCastka.el);

  var fDatum = fondModalField('Datum platby', 'date', '');
  fDatum.input.value = zaloha.datum_platby || new Date().toISOString().slice(0, 10);
  modal.appendChild(fDatum.el);

  var fPoz = fondModalField('Pozn\xe1mka', 'text', '');
  fPoz.input.value = zaloha.poznamka || '';
  modal.appendChild(fPoz.el);

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
  saveBtn.textContent = 'Ulo\u017eit platbu';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    var castka = fCastka.input.value;
    if (castka === '' || parseFloat(castka) < 0) {
      errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return;
    }
    saveBtn.disabled = true;
    Api.apiPost('api/fond_zalohy.php?action=zalohySave', {
      id: zaloha.id,
      zaplaceno: castka,
      datum_platby: fDatum.input.value || null,
      poznamka: fPoz.input.value.trim(),
    }).then(function() {
      document.body.removeChild(overlay);
      showToast('Platba ulo\u017eena.', 'success');
      if (onSaved) onSaved();
    }).catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fCastka.input.focus();
}
