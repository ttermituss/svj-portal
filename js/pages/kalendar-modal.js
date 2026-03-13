/* ===== KALENDÁŘ — MODAL PRO VLASTNÍ UDÁLOSTI ===== */

var KAL_KATEGORIE = {
  schuzka:     'Sch\u016fzka',
  udrzba:      '\u00dadr\u017eba',
  kontrola:    'Kontrola',
  spolecenska: 'Spole\u010densk\u00e1',
  jine:        'Jin\u00e9',
};

var KAL_OPAKOVANI = {
  none:   'Bez opakov\u00e1n\u00ed',
  tyden:  'Ka\u017ed\u00fd t\u00fdden',
  mesic:  'Ka\u017ed\u00fd m\u011bs\u00edc',
  rok:    'Ka\u017ed\u00fd rok',
};

/**
 * Otevře modal pro vytvoření/editaci vlastní události.
 * @param {object|null} existing — existující událost pro editaci, null = nová
 * @param {string} defaultDate — YYYY-MM-DD
 * @param {function} onSaved — callback po uložení
 */
function kalOpenEventModal(existing, defaultDate, onSaved) {
  var m = createModal({
    title: existing ? 'Upravit ud\u00e1lost' : 'Nov\u00e1 ud\u00e1lost',
    width: '520px',
  });
  var overlay = m.overlay;
  var modal = m.modal;
  var closeModal = m.close;

  // Form
  var form = document.createElement('form');
  form.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

  // Název
  var nazevF = kalMakeField('N\u00e1zev *', 'text', 'kal-nazev', existing ? existing.nazev : '');
  nazevF.input.maxLength = 255;
  nazevF.input.placeholder = 'nap\u0159. Sch\u016fze v\u00fdboru';
  form.appendChild(nazevF.el);

  // Popis
  var popisF = kalMakeTextarea('Popis', 'kal-popis', existing ? (existing.popis || '') : '');
  form.appendChild(popisF.el);

  // Datum od / do — řádek
  var dateRow = document.createElement('div');
  dateRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
  var datumOdF = kalMakeField('Datum od *', 'date', 'kal-datum-od', existing ? existing.datum_od : (defaultDate || ''));
  var datumDoF = kalMakeField('Datum do', 'date', 'kal-datum-do', existing ? (existing.datum_do || '') : '');
  dateRow.appendChild(datumOdF.el);
  dateRow.appendChild(datumDoF.el);
  form.appendChild(dateRow);

  // Celodenny toggle + časy
  var celodenny = existing ? !!parseInt(existing.celodenny) : true;
  var celoRow = document.createElement('div');
  celoRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
  var celoCheck = document.createElement('input');
  celoCheck.type = 'checkbox';
  celoCheck.id = 'kal-celodenny';
  celoCheck.checked = celodenny;
  celoCheck.style.cssText = 'width:20px;height:20px;cursor:pointer;';
  var celoLabel = document.createElement('label');
  celoLabel.htmlFor = 'kal-celodenny';
  celoLabel.textContent = 'Celodenn\u00ed ud\u00e1lost';
  celoLabel.style.cssText = 'cursor:pointer;font-size:0.9rem;';
  celoRow.appendChild(celoCheck);
  celoRow.appendChild(celoLabel);
  form.appendChild(celoRow);

  var timeRow = document.createElement('div');
  timeRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
  var casOdF = kalMakeField('\u010cas od', 'time', 'kal-cas-od', existing ? (existing.cas_od || '').substring(0, 5) : '');
  var casDoF = kalMakeField('\u010cas do', 'time', 'kal-cas-do', existing ? (existing.cas_do || '').substring(0, 5) : '');
  timeRow.appendChild(casOdF.el);
  timeRow.appendChild(casDoF.el);
  form.appendChild(timeRow);
  timeRow.style.display = celodenny ? 'none' : 'grid';

  celoCheck.addEventListener('change', function() {
    timeRow.style.display = celoCheck.checked ? 'none' : 'grid';
  });

  // Místo
  var mistoF = kalMakeField('M\u00edsto', 'text', 'kal-misto', existing ? (existing.misto || '') : '');
  mistoF.input.placeholder = 'nap\u0159. Spole\u010densk\u00e1 m\u00edstnost, 2. patro';
  form.appendChild(mistoF.el);

  // Kategorie + Opakování — řádek
  var catRow = document.createElement('div');
  catRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
  var kategorieF = kalMakeSelect('Kategorie', 'kal-kategorie', KAL_KATEGORIE, existing ? existing.kategorie : 'jine');
  var opakovaniF = kalMakeSelect('Opakov\u00e1n\u00ed', 'kal-opakovani', KAL_OPAKOVANI, existing ? existing.opakovani : 'none');
  catRow.appendChild(kategorieF.el);
  catRow.appendChild(opakovaniF.el);
  form.appendChild(catRow);

  // Připomenutí
  var pripF = kalMakeField('P\u0159ipomenout (dn\u00ed p\u0159edem)', 'number', 'kal-pripomenout', existing ? (existing.pripomenout_dni || '') : '');
  pripF.input.min = '0';
  pripF.input.max = '365';
  pripF.input.placeholder = 'nap\u0159. 3';
  form.appendChild(pripF.el);

  // Error box
  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  form.appendChild(errBox);

  // Buttons
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:4px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', closeModal);

  var saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = existing ? 'Ulo\u017eit zm\u011bny' : 'Vytvo\u0159it ud\u00e1lost';

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  form.appendChild(btnRow);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    errBox.style.display = 'none';

    var nazev = nazevF.input.value.trim();
    var datumOd = datumOdF.input.value;
    if (!nazev) { errBox.textContent = 'N\u00e1zev je povinn\u00fd.'; errBox.style.display = ''; return; }
    if (!datumOd) { errBox.textContent = 'Datum od je povinn\u00e9.'; errBox.style.display = ''; return; }

    var payload = {
      nazev: nazev,
      popis: popisF.input.value.trim(),
      datum_od: datumOd,
      datum_do: datumDoF.input.value || null,
      celodenny: celoCheck.checked ? 1 : 0,
      cas_od: celoCheck.checked ? null : casOdF.input.value || null,
      cas_do: celoCheck.checked ? null : casDoF.input.value || null,
      misto: mistoF.input.value.trim() || null,
      kategorie: kategorieF.input.value,
      opakovani: opakovaniF.input.value,
      pripomenout_dni: pripF.input.value ? parseInt(pripF.input.value) : null,
    };
    if (existing && existing.id) payload.id = existing.id;

    saveBtn.disabled = true;
    Api.apiPost('api/kalendar_udalosti.php?action=save', payload)
      .then(function() {
        closeModal();
        showToast(existing ? 'Ud\u00e1lost byla upravena.' : 'Ud\u00e1lost byla vytvo\u0159ena.', 'success');
        if (onSaved) onSaved();
      })
      .catch(function(err) {
        errBox.textContent = err.message || 'Chyba p\u0159i ukl\u00e1d\u00e1n\u00ed.';
        errBox.style.display = '';
      })
      .finally(function() { saveBtn.disabled = false; });
  });

  modal.appendChild(form);

  nazevF.input.focus();
}

/* ===== MODAL HELPERS ===== */

function kalMakeField(labelText, type, id, value) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var inp = document.createElement('input');
  inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = value || '';
  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return { el: wrap, input: inp };
}

function kalMakeTextarea(labelText, id, value) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var ta = document.createElement('textarea');
  ta.id = id; ta.className = 'form-input'; ta.value = value || '';
  ta.rows = 3;
  ta.style.resize = 'vertical';
  wrap.appendChild(lbl);
  wrap.appendChild(ta);
  return { el: wrap, input: ta };
}

function kalMakeSelect(labelText, id, options, selected) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var sel = document.createElement('select');
  sel.id = id; sel.className = 'form-input';
  Object.keys(options).forEach(function(key) {
    var opt = document.createElement('option');
    opt.value = key;
    opt.textContent = options[key];
    if (key === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(sel);
  return { el: wrap, input: sel };
}
