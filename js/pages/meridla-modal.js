/* ===== Měřidla — modal přidání/úpravy + odečty modal ===== */

/* ── Modal: přidání / úprava měřidla ──────────────── */
function merShowModal(existing, user, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:24px;' +
    'max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25);';

  var title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 20px;font-size:1.15rem;';
  title.textContent = existing ? 'Upravit m\u011b\u0159idlo' : 'Nov\xe9 m\u011b\u0159idlo';
  modal.appendChild(title);

  // Typ
  var typSelect = merModalSelect(modal, 'Typ m\u011b\u0159idla *', MER_TYPY.map(function(t) {
    return { value: t.value, label: t.icon + ' ' + t.label };
  }), existing ? existing.typ : '');

  var vcInput = merModalField(modal, 'V\xfdrobn\xed \u010d\xedslo', 'text', existing ? existing.vyrobni_cislo || '' : '');
  vcInput.placeholder = 'nap\u0159. 12345678';

  // Umístění
  var umSelect = merModalSelect(modal, 'Um\xedst\u011bn\xed', [
    { value: 'jednotka', label: 'V jednotce' },
    { value: 'spolecne', label: 'Spole\u010dn\xe9' },
  ], existing ? existing.umisteni_typ : 'jednotka');

  // Jednotka select
  var jednWrap = document.createElement('div');
  jednWrap.style.marginBottom = '14px';
  var jednLabel = document.createElement('label');
  jednLabel.textContent = 'Jednotka';
  jednLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var jednSelect = document.createElement('select');
  jednSelect.className = 'form-input';
  var emOpt = document.createElement('option');
  emOpt.value = ''; emOpt.textContent = '\u2014 nevybr\xe1no \u2014';
  jednSelect.appendChild(emOpt);
  jednWrap.appendChild(jednLabel);
  jednWrap.appendChild(jednSelect);
  modal.appendChild(jednWrap);

  // Načti jednotky + existující měřidla pro hints
  Promise.all([
    Api.apiGet('api/jednotky.php?action=list'),
    Api.apiGet('api/meridla.php?action=list'),
  ]).then(function(results) {
    var jednotky = results[0].jednotky || [];
    var meridla  = results[1].meridla || [];

    // Mapa: jednotka_id → pole typů měřidel
    var merMap = {};
    meridla.forEach(function(m) {
      if (m.umisteni_typ === 'jednotka' && m.jednotka_id) {
        var key = String(m.jednotka_id);
        if (!merMap[key]) merMap[key] = [];
        merMap[key].push(m.typ);
      }
    });

    jednotky.forEach(function(j) {
      var opt = document.createElement('option');
      opt.value = j.id;
      var label = j.cislo_jednotky + (j.vlastnik_jmeno ? ' \u2014 ' + j.vlastnik_jmeno : '');
      var typy = merMap[String(j.id)];
      if (typy && typy.length) {
        var icons = typy.map(function(t) { return merTypInfo(t).icon; });
        // Odstraním duplicity
        icons = icons.filter(function(v, i, a) { return a.indexOf(v) === i; });
        label += ' [' + icons.join('') + ']';
      } else {
        label += ' (\u017e\xe1dn\xe9 m\u011b\u0159idlo)';
      }
      opt.textContent = label;
      if (existing && existing.jednotka_id && String(existing.jednotka_id) === String(j.id)) opt.selected = true;
      jednSelect.appendChild(opt);
    });
  }).catch(function() {});

  // Skrýt/zobrazit jednotku dle umístění
  function toggleJedn() { jednWrap.style.display = umSelect.value === 'spolecne' ? 'none' : ''; }
  umSelect.addEventListener('change', toggleJedn);
  toggleJedn();

  var mistoInput = merModalField(modal, 'M\xedsto (up\u0159esn\u011bn\xed)', 'text',
    existing ? existing.misto || '' : '');
  mistoInput.placeholder = 'nap\u0159. Koupelna, Kotelna';

  // Jednotka měření
  var unitInput = merModalField(modal, 'Jednotka m\u011b\u0159en\xed', 'text',
    existing ? existing.jednotka_mereni || '' : '');
  unitInput.placeholder = 'm\u00b3, kWh, GJ';

  // Auto-fill unit dle typu
  typSelect.addEventListener('change', function() {
    if (!unitInput.value || unitInput.value === 'm3' || unitInput.value === 'kWh' || unitInput.value === 'GJ') {
      var t = merTypInfo(typSelect.value);
      unitInput.value = t.unit;
    }
  });
  if (!existing) {
    var defT = merTypInfo(typSelect.value);
    unitInput.value = defT.unit;
  }

  var instInput = merModalField(modal, 'Datum instalace', 'date', existing ? existing.datum_instalace || '' : '');
  var cejchInput = merModalField(modal, 'Datum posledn\xedho cejchu', 'date', existing ? existing.datum_cejchu || '' : '');

  var intWrap = document.createElement('div');
  intWrap.style.marginBottom = '14px';
  var intLabel = document.createElement('label');
  intLabel.textContent = 'Interval cejchov\xe1n\xed (m\u011bs\xedce)';
  intLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var intInput = document.createElement('input');
  intInput.type = 'number'; intInput.className = 'form-input';
  intInput.style.maxWidth = '120px'; intInput.min = '1'; intInput.placeholder = '60';
  intInput.value = existing && existing.interval_cejchu_mesice ? existing.interval_cejchu_mesice : '';
  intWrap.appendChild(intLabel);
  intWrap.appendChild(intInput);
  modal.appendChild(intWrap);

  // Aktivní checkbox
  var aktWrap = document.createElement('div');
  aktWrap.style.cssText = 'margin-bottom:14px;display:flex;align-items:center;gap:8px;';
  var aktCheck = document.createElement('input');
  aktCheck.type = 'checkbox'; aktCheck.id = 'mer_aktivni';
  aktCheck.checked = existing ? (existing.aktivni !== '0' && existing.aktivni !== 0) : true;
  var aktLabel = document.createElement('label');
  aktLabel.htmlFor = 'mer_aktivni'; aktLabel.textContent = 'Aktivn\xed m\u011b\u0159idlo';
  aktLabel.style.cssText = 'font-size:0.9rem;cursor:pointer;';
  aktWrap.appendChild(aktCheck);
  aktWrap.appendChild(aktLabel);
  modal.appendChild(aktWrap);

  // Poznámka
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input'; pozInput.rows = 2;
  pozInput.value = existing ? (existing.poznamka || '') : '';
  pozWrap.appendChild(pozLabel); pozWrap.appendChild(pozInput);
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
    saveBtn.disabled = true; saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    Api.apiPost('api/meridla.php?action=save', {
      id: existing ? existing.id : 0,
      typ: typSelect.value,
      vyrobni_cislo: vcInput.value.trim(),
      umisteni_typ: umSelect.value,
      jednotka_id: umSelect.value === 'spolecne' ? '' : jednSelect.value,
      misto: mistoInput.value.trim(),
      jednotka_mereni: unitInput.value.trim() || 'm3',
      datum_instalace: instInput.value || '',
      datum_cejchu: cejchInput.value || '',
      interval_cejchu_mesice: intInput.value || '',
      aktivni: aktCheck.checked ? 1 : 0,
      poznamka: pozInput.value.trim(),
    }).then(function() {
      showToast('M\u011b\u0159idlo ulo\u017eeno');
      overlay.remove();
      if (onSaved) onSaved();
    }).catch(function(e) {
      showToast(e.message || 'Chyba.', 'error');
      saveBtn.disabled = false; saveBtn.textContent = 'Ulo\u017eit';
    });
  });

  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/* ── Modal: odečty měřidla ────────────────────────── */
function merOdectyModal(meridlo, user, onClose) {
  var info = merTypInfo(meridlo.typ);
  var isPriv = isPrivileged(user);
  var canAdd = isPriv || (meridlo.umisteni_typ === 'jednotka'
    && String(meridlo.jednotka_id) === String(user.jednotka_id));

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:24px;' +
    'max-width:550px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25);';

  var title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 4px;font-size:1.15rem;';
  title.textContent = info.icon + ' ' + info.label + (meridlo.vyrobni_cislo ? ' \u2014 ' + meridlo.vyrobni_cislo : '');
  modal.appendChild(title);

  var sub = document.createElement('p');
  sub.style.cssText = 'margin:0 0 16px;font-size:0.85rem;color:var(--text-light);';
  sub.textContent = 'Jednotka: ' + (meridlo.jednotka_mereni || '') +
    (meridlo.cislo_jednotky ? ' \u00b7 Jednotka ' + meridlo.cislo_jednotky : ' \u00b7 Spole\u010dn\xe9');
  modal.appendChild(sub);

  // Přidat odečet
  if (canAdd) {
    var addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;';

    var dWrap = document.createElement('div');
    var dLbl = document.createElement('label');
    dLbl.textContent = 'Datum'; dLbl.style.cssText = 'display:block;font-size:0.82rem;font-weight:500;margin-bottom:2px;';
    var dInp = document.createElement('input');
    dInp.type = 'date'; dInp.className = 'form-input'; dInp.style.width = '140px';
    dInp.value = new Date().toISOString().slice(0, 10);
    dWrap.appendChild(dLbl); dWrap.appendChild(dInp);
    addRow.appendChild(dWrap);

    var vWrap = document.createElement('div');
    var vLbl = document.createElement('label');
    vLbl.textContent = 'Stav (' + (meridlo.jednotka_mereni || '') + ')';
    vLbl.style.cssText = 'display:block;font-size:0.82rem;font-weight:500;margin-bottom:2px;';
    var vInp = document.createElement('input');
    vInp.type = 'number'; vInp.className = 'form-input'; vInp.style.width = '120px';
    vInp.step = '0.001'; vInp.min = '0'; vInp.placeholder = '123.456';
    vWrap.appendChild(vLbl); vWrap.appendChild(vInp);
    addRow.appendChild(vWrap);

    var addOBtn = document.createElement('button');
    addOBtn.className = 'btn btn-primary btn-sm';
    addOBtn.textContent = 'Zapsat';
    addOBtn.addEventListener('click', function() {
      if (!vInp.value) { showToast('Zadejte hodnotu.', 'error'); return; }
      addOBtn.disabled = true;
      Api.apiPost('api/meridla.php?action=odectySave', {
        meridlo_id: meridlo.id,
        datum: dInp.value,
        hodnota: parseFloat(vInp.value),
      }).then(function() {
        showToast('Ode\u010det zaps\xe1n');
        vInp.value = '';
        merOdectyReload(odectyWrap, meridlo, user);
      }).catch(function(e) { showToast(e.message || 'Chyba.', 'error'); })
        .finally(function() { addOBtn.disabled = false; });
    });
    addRow.appendChild(addOBtn);
    modal.appendChild(addRow);
  }

  var odectyWrap = document.createElement('div');
  modal.appendChild(odectyWrap);

  // Close
  var closeRow = document.createElement('div');
  closeRow.style.cssText = 'display:flex;justify-content:flex-end;margin-top:16px;';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Zav\u0159\xedt';
  closeBtn.addEventListener('click', function() { overlay.remove(); if (onClose) onClose(); });
  closeRow.appendChild(closeBtn);
  modal.appendChild(closeRow);

  overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); if (onClose) onClose(); } });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  merOdectyReload(odectyWrap, meridlo, user);
}

function merOdectyReload(wrap, meridlo, user) {
  wrap.replaceChildren();
  var ld = document.createElement('p');
  ld.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  ld.textContent = 'Na\u010d\xedt\xe1m\u2026';
  wrap.appendChild(ld);

  Api.apiGet('api/meridla.php?action=odectyList&meridlo_id=' + meridlo.id)
    .then(function(data) {
      wrap.replaceChildren();
      var items = data.odecty || [];
      if (!items.length) {
        var e = document.createElement('p');
        e.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
        e.textContent = '\u017d\xe1dn\xe9 ode\u010dty.';
        wrap.appendChild(e);
        return;
      }
      merRenderOdectyTable(wrap, items, meridlo, user);
    })
    .catch(function() {
      wrap.replaceChildren();
      var e = document.createElement('p');
      e.style.color = 'var(--danger)';
      e.textContent = 'Chyba.';
      wrap.appendChild(e);
    });
}

function merRenderOdectyTable(wrap, items, meridlo, user) {
  var isPriv = isPrivileged(user);
  var unit = meridlo.jednotka_mereni || '';

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.88rem;';

  var thead = document.createElement('thead');
  var hrow = document.createElement('tr');
  ['Datum', 'Stav (' + unit + ')', 'Spot\u0159eba', 'Kdo', ''].forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col;
    th.style.cssText = 'text-align:left;padding:6px 8px;border-bottom:2px solid var(--border);' +
      'font-weight:600;color:var(--text-light);font-size:0.82rem;white-space:nowrap;';
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');

  for (var i = 0; i < items.length; i++) {
    var o = items[i];
    var tr = document.createElement('tr');

    var tdDatum = document.createElement('td');
    tdDatum.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap;';
    tdDatum.textContent = formatDatum(o.datum);
    tr.appendChild(tdDatum);

    var tdHodnota = document.createElement('td');
    tdHodnota.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);font-weight:600;';
    tdHodnota.textContent = parseFloat(o.hodnota).toLocaleString('cs-CZ');
    tr.appendChild(tdHodnota);

    // Spotřeba (rozdíl od předchozího)
    var tdSpot = document.createElement('td');
    tdSpot.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);color:var(--text-light);';
    if (i < items.length - 1) {
      var diff = parseFloat(o.hodnota) - parseFloat(items[i + 1].hodnota);
      tdSpot.textContent = (diff >= 0 ? '+' : '') + diff.toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
    } else {
      tdSpot.textContent = '\u2014';
    }
    tr.appendChild(tdSpot);

    var tdKdo = document.createElement('td');
    tdKdo.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);font-size:0.82rem;color:var(--text-light);';
    tdKdo.textContent = o.jmeno ? (o.jmeno + ' ' + (o.prijmeni || '')).trim() : '\u2014';
    tr.appendChild(tdKdo);

    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border);';
    if (isPriv) {
      (function(odecet) {
        var del = document.createElement('button');
        del.className = 'btn btn-danger btn-sm';
        del.textContent = '\u00d7';
        del.style.cssText = 'padding:4px 10px;min-width:0;';
        del.addEventListener('click', function() {
          showConfirmModal('Smazat ode\u010det?', formatDatum(odecet.datum) + ' \u2014 ' +
            parseFloat(odecet.hodnota).toLocaleString('cs-CZ'), function() {
            Api.apiPost('api/meridla.php?action=odectyDelete', { id: odecet.id })
              .then(function() { showToast('Smaz\xe1no'); merOdectyReload(wrap, meridlo, user); })
              .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
          });
        });
        tdAkce.appendChild(del);
      })(o);
    }
    tr.appendChild(tdAkce);

    tbody.appendChild(tr);
  }

  tbl.appendChild(tbody);
  wrap.appendChild(tbl);
}

/* ── Helpers ──────────────────────────────────────── */
function merModalField(parent, label, type, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var input = document.createElement('input');
  input.type = type; input.className = 'form-input'; input.value = value || '';
  wrap.appendChild(lbl); wrap.appendChild(input);
  parent.appendChild(wrap);
  return input;
}

function merModalSelect(parent, label, options, selected) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var sel = document.createElement('select');
  sel.className = 'form-input';
  options.forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label;
    if (selected && selected === o.value) opt.selected = true;
    sel.appendChild(opt);
  });
  wrap.appendChild(lbl); wrap.appendChild(sel);
  parent.appendChild(wrap);
  return sel;
}
