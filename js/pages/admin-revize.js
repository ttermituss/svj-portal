/* ===== Evidence revizí a kontrol ===== */

var REVIZE_TYPY = [
  { value: 'vytah',     label: 'V\xfdtah',              interval: 36, icon: '\uD83D\uDEE0' },
  { value: 'elektro',   label: 'Elektroinstalace',      interval: 60, icon: '\u26A1' },
  { value: 'plyn',      label: 'Plyn',                  interval: 36, icon: '\uD83D\uDD25' },
  { value: 'hromosvod', label: 'Hromosvod',             interval: 60, icon: '\u26C8' },
  { value: 'hasici',    label: 'Hasi\u010d\xed p\u0159\xedstroje', interval: 12, icon: '\uD83E\uDDEF' },
  { value: 'jine',      label: 'Jin\xe9',               interval: null, icon: '\uD83D\uDD27' },
];

function revizeTypLabel(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.label : typ;
}
function revizeTypIcon(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.icon : '\uD83D\uDD27';
}
function revizeDefaultInterval(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.interval : null;
}

function renderRevizeCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Evidence revizí a kontrol');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Sledování termín\u016f povinných revizí (v\xfdtah, elektro, plyn, hromosvod, hasi\u010d\xed p\u0159\xedstroje\u2026). Upozorn\u011bn\xed p\u0159i bl\xed\u017e\xedc\xedm se nebo prohl\xe9\u0161en\xe9m termínu.';
  body.appendChild(hint);

  var isPriv = user.role === 'admin' || user.role === 'vybor';

  var listWrap = document.createElement('div');
  body.appendChild(listWrap);

  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  body.appendChild(formWrap);

  if (isPriv) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.style.marginTop = '12px';
    addBtn.textContent = '+ P\u0159idat revizi';
    addBtn.addEventListener('click', function() {
      revizeShowForm(formWrap, null, listWrap, user, addBtn);
    });
    body.appendChild(addBtn);
  }

  el.appendChild(card.card);
  revizeLoad(listWrap, formWrap, user);
}

function revizeLoad(listWrap, formWrap, user) {
  listWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/revize.php?action=list')
    .then(function(data) { revizeRenderList(listWrap, formWrap, data.revize, user); })
    .catch(function() {
      listWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed revizí.';
      listWrap.appendChild(err);
    });
}

function revizeRenderList(listWrap, formWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = user.role === 'admin' || user.role === 'vybor';

  if (!items.length) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0 0 4px;';
    empty.textContent = 'Zatím nejsou evidovány \u017e\xe1dn\xe9 revize.';
    listWrap.appendChild(empty);
    return;
  }

  items.forEach(function(rev) {
    listWrap.appendChild(revizeMakeRow(rev, isPriv, listWrap, formWrap, user));
  });
}

function revizeMakeRow(rev, isPriv, listWrap, formWrap, user) {
  var status = revizeStatus(rev.datum_pristi);

  var row = document.createElement('div');
  row.style.cssText = [
    'display:flex', 'align-items:flex-start', 'gap:12px',
    'padding:12px 0', 'border-bottom:1px solid var(--border)',
    'flex-wrap:wrap',
  ].join(';');

  // Ikona + typ
  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = 'font-size:1.4rem;flex-shrink:0;width:36px;text-align:center;padding-top:2px;';
  iconWrap.textContent = revizeTypIcon(rev.typ);
  row.appendChild(iconWrap);

  // Info
  var info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:180px;';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  nameEl.textContent = rev.nazev;
  info.appendChild(nameEl);

  var typEl = document.createElement('div');
  typEl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:1px;';
  typEl.textContent = revizeTypLabel(rev.typ);
  info.appendChild(typEl);

  var datesEl = document.createElement('div');
  datesEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  datesEl.textContent = 'Naposledy: ' + revizeFormatDatum(rev.datum_posledni);
  if (rev.interval_mesice) {
    datesEl.textContent += ' \u00b7 Interval: ' + rev.interval_mesice + ' m\u011bs.';
  }
  info.appendChild(datesEl);

  if (rev.poznamka) {
    var pozEl = document.createElement('div');
    pozEl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:3px;';
    pozEl.textContent = rev.poznamka;
    info.appendChild(pozEl);
  }

  row.appendChild(info);

  // Status badge + datum příští
  var rightCol = document.createElement('div');
  rightCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;';

  if (rev.datum_pristi) {
    var badge = document.createElement('span');
    badge.style.cssText = [
      'display:inline-block', 'padding:3px 10px', 'border-radius:20px',
      'font-size:0.78rem', 'font-weight:600', 'white-space:nowrap',
    ].join(';');
    if (status === 'expired') {
      badge.style.background = 'var(--danger)';
      badge.style.color = '#fff';
      badge.textContent = '\u26A0 Prohl\xe1sl\xe1!';
    } else if (status === 'warning') {
      badge.style.background = '#f08600';
      badge.style.color = '#fff';
      badge.textContent = '\u26A0 Brzy vypr\u0161\xed';
    } else {
      badge.style.background = 'var(--success, #1a7c00)';
      badge.style.color = '#fff';
      badge.textContent = '\u2713 OK';
    }
    rightCol.appendChild(badge);

    var pristiEl = document.createElement('div');
    pristiEl.style.cssText = 'font-size:0.8rem;color:var(--text-light);text-align:right;';
    pristiEl.textContent = 'P\u0159\xed\u0161t\xed: ' + revizeFormatDatum(rev.datum_pristi);
    rightCol.appendChild(pristiEl);
  }

  // Akce
  var akceRow = document.createElement('div');
  akceRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;';

  if (rev.soubor_nazev) {
    var dlBtn = document.createElement('a');
    dlBtn.className = 'btn btn-secondary btn-sm';
    dlBtn.textContent = '\uD83D\uDCC4 PDF';
    dlBtn.href = 'api/revize.php?action=download&id=' + rev.id;
    dlBtn.target = '_blank';
    akceRow.appendChild(dlBtn);
  }

  if (isPriv) {
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      revizeShowForm(formWrap, rev, listWrap, user, null);
    });
    akceRow.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal(
        'Smazat revizi?',
        'Odstraní z\xe1znam "' + rev.nazev + '" i nahr\xe1t\xfd soubor PDF.',
        function() {
          Api.apiPost('api/revize.php?action=delete&id=' + rev.id, {})
            .then(function() {
              showToast('Revize smaz\xe1na');
              revizeLoad(listWrap, formWrap, user);
            })
            .catch(function(e) { showToast(e.message || 'Chyba p\u0159i maz\xe1n\xed.', 'error'); });
        }
      );
    });
    akceRow.appendChild(delBtn);
  }

  rightCol.appendChild(akceRow);
  row.appendChild(rightCol);

  return row;
}

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

  // Název
  var nazevField = makeAdminField('N\xe1zev / popis', 'text', 'rev_nazev', rev ? rev.nazev : '');
  nazevField.input.placeholder = 'nap\u0159. Elektrorevize spole\u010dn\xfdch prostor';
  formWrap.appendChild(nazevField.el);

  // Datum poslední
  var posledniField = makeAdminField('Datum posledn\xed revize', 'date', 'rev_posledni',
    rev ? rev.datum_posledni : '');
  formWrap.appendChild(posledniField.el);

  // Interval
  var intervalWrap = document.createElement('div');
  intervalWrap.style.marginBottom = '14px';
  var intervalLabel = document.createElement('label');
  intervalLabel.htmlFor = 'rev_interval';
  intervalLabel.textContent = 'Interval opakov\xe1n\xed (m\u011bs\xedce)';
  intervalLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var intervalInput = document.createElement('input');
  intervalInput.type = 'number';
  intervalInput.id = 'rev_interval';
  intervalInput.className = 'form-input';
  intervalInput.style.maxWidth = '120px';
  intervalInput.min = '1';
  intervalInput.placeholder = 'nap\u0159. 36';
  intervalInput.value = rev && rev.interval_mesice ? rev.interval_mesice : '';
  var intervalHint = document.createElement('div');
  intervalHint.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:4px;';
  intervalHint.textContent = 'P\u0159i vyplněn\xed se datum p\u0159\xed\u0161t\xed revize vypo\u010d\xedt\xe1 automaticky.';
  intervalWrap.appendChild(intervalLabel);
  intervalWrap.appendChild(intervalInput);
  intervalWrap.appendChild(intervalHint);
  formWrap.appendChild(intervalWrap);

  // Datum příští (volitelné)
  var pristiField = makeAdminField('Datum p\u0159\xed\u0161t\xed revize (nepovinné — vypo\u010d\xedt\xe1 se z intervalu)', 'date', 'rev_pristi',
    rev && rev.datum_pristi ? rev.datum_pristi : '');
  formWrap.appendChild(pristiField.el);

  // Soubor PDF
  var souborWrap = document.createElement('div');
  souborWrap.style.marginBottom = '14px';
  var souborLabel = document.createElement('label');
  souborLabel.textContent = rev && rev.soubor_nazev
    ? 'Nahradit protokol PDF (nepovinné — aktu\xe1ln\xed: ' + rev.soubor_nazev + ')'
    : 'Protokol PDF (nepovinné)';
  souborLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var souborInput = document.createElement('input');
  souborInput.type = 'file';
  souborInput.accept = 'application/pdf';
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
  pozInput.className = 'form-input';
  pozInput.rows = 2;
  pozInput.value = rev ? (rev.poznamka || '') : '';
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  formWrap.appendChild(pozWrap);

  // Auto-fill intervalu při změně typu
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

  // Výchozí interval při přidání nové
  if (!rev) {
    var defInterval = revizeDefaultInterval(typSelect.value);
    if (defInterval) intervalInput.value = defInterval;
  }

  saveBtn.addEventListener('click', function() {
    var nazev     = nazevField.input.value.trim();
    var posledni  = posledniField.input.value;
    if (!nazev) { showToast('Vyplňte n\xe1zev revize.', 'error'); return; }
    if (!posledni) { showToast('Vyplňte datum posledn\xed revize.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    var fd = new FormData();
    if (rev) fd.append('id', rev.id);
    fd.append('typ', typSelect.value);
    fd.append('nazev', nazev);
    fd.append('datum_posledni', posledni);
    fd.append('interval_mesice', intervalInput.value || '');
    fd.append('datum_pristi', pristiField.input.value || '');
    fd.append('poznamka', pozInput.value.trim());
    if (souborInput.files[0]) fd.append('soubor', souborInput.files[0]);

    fetch('api/revize.php?action=save', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        showToast('Revize ulo\u017eena');
        formWrap.style.display = 'none';
        formWrap.replaceChildren();
        if (addBtn) addBtn.style.display = '';
        revizeLoad(listWrap, formWrap, user);
      })
      .catch(function(e) { showToast(e.message || 'Chyba p\u0159i ukl\xe1d\xe1n\xed.', 'error'); })
      .finally(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Ulo\u017eit revizi';
      });
  });
}

// status: 'ok' | 'warning' (< 60 dní) | 'expired'
function revizeStatus(datumPristi) {
  if (!datumPristi) return 'ok';
  var dt   = new Date(datumPristi);
  var dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  var dni  = Math.floor((dt - dnes) / 86400000);
  if (dni < 0)   return 'expired';
  if (dni <= 60) return 'warning';
  return 'ok';
}

function revizeFormatDatum(dateStr) {
  if (!dateStr) return '\u2014';
  var p = dateStr.split('-');
  return p.length === 3 ? p[2] + '. ' + p[1] + '. ' + p[0] : dateStr;
}
