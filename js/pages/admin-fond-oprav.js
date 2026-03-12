/* ===== Fond oprav ===== */

var FOND_KAT_PRIJEM = [
  'Z\xe1lohy vlastn\xedk\u016f', 'Dotace / subvence', '\xdaroky z \xfa\u010dtu',
  'Pojistn\xe9 pln\u011bn\xed', 'Ostatn\xed p\u0159\xedjmy',
];
var FOND_KAT_VYDAJ = [
  'Oprava st\u0159echy', 'Fas\xe1da / zateplen\xed', 'V\xfdtah', 'Elektroinstalace',
  'Vodoinstalace / kanalizace', 'Mal\xedrov\xe1n\xed spole\u010dn\xfdch prostor',
  'Spr\xe1va domu', 'Pojistiteln\xe9 v\xfddaje', 'Revize', 'Ostatn\xed v\xfddaje',
];

function renderFondOpravCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Fond oprav');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Sledov\xe1n\xed z\u016fstatku fondu oprav — p\u0159\xedjmy (z\xe1lohy, dotace) a v\xfddaje (opravy, revize, spr\xe1va).';
  body.appendChild(hint);

  var statsWrap = document.createElement('div');
  body.appendChild(statsWrap);

  var chartWrap = document.createElement('div');
  body.appendChild(chartWrap);

  var listWrap = document.createElement('div');
  body.appendChild(listWrap);

  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  body.appendChild(formWrap);

  var isPriv = user.role === 'admin' || user.role === 'vybor';
  if (isPriv) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.style.marginTop = '12px';
    addBtn.textContent = '+ P\u0159idat z\xe1znam';
    addBtn.addEventListener('click', function() {
      fondShowForm(formWrap, listWrap, statsWrap, chartWrap, user, addBtn);
    });
    body.appendChild(addBtn);

    var exportWrap = document.createElement('div');
    exportWrap.style.cssText = 'display:inline-flex;gap:6px;margin-left:8px;';
    ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.style.marginTop = '12px';
      btn.textContent = fmt === 'pdf' ? '\uD83D\uDCC3 PDF' : fmt === 'xlsx' ? '\uD83D\uDCCA XLSX' : '\uD83D\uDCC4 CSV';
      btn.addEventListener('click', function() {
        window.location.href = 'api/export.php?type=fond_oprav&format=' + fmt;
      });
      exportWrap.appendChild(btn);
    });
    body.appendChild(exportWrap);
  }

  el.appendChild(card.card);
  fondLoad(statsWrap, chartWrap, listWrap, formWrap, user);
}

function fondLoad(statsWrap, chartWrap, listWrap, formWrap, user) {
  statsWrap.replaceChildren();
  chartWrap.replaceChildren();
  listWrap.replaceChildren();

  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Promise.all([
    Api.apiGet('api/fond_oprav.php?action=stats'),
    Api.apiGet('api/fond_oprav.php?action=list&limit=50'),
  ]).then(function(results) {
    fondRenderStats(statsWrap, results[0]);
    fondRenderChart(chartWrap, results[0].mesice || {});
    fondRenderList(listWrap, formWrap, statsWrap, chartWrap, results[1].zaznamy, user);
  }).catch(function() {
    listWrap.replaceChildren();
    var err = document.createElement('p');
    err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
    err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed fondu oprav.';
    listWrap.appendChild(err);
  });
}

function fondRenderStats(wrap, data) {
  wrap.replaceChildren();

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;';

  var items = [
    { label: 'Z\u016fstatek', value: data.zustatek, color: data.zustatek >= 0 ? 'var(--accent)' : 'var(--danger)' },
    { label: 'P\u0159\xedjmy celkem', value: data.prijem_celkem, color: 'var(--accent)' },
    { label: 'V\xfddaje celkem', value: data.vydaj_celkem, color: 'var(--danger)' },
  ];

  items.forEach(function(item) {
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:14px 16px;';

    var val = document.createElement('div');
    val.style.cssText = 'font-size:1.2rem;font-weight:700;color:' + item.color + ';';
    val.textContent = fondFormatCastka(item.value) + '\xa0K\u010d';
    box.appendChild(val);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:3px;';
    lbl.textContent = item.label;
    box.appendChild(lbl);

    grid.appendChild(box);
  });

  wrap.appendChild(grid);
}

function fondRenderChart(wrap, mesice) {
  wrap.replaceChildren();

  var keys = Object.keys(mesice).sort();
  if (!keys.length) return;

  // Posledních max 12 měsíců
  if (keys.length > 12) keys = keys.slice(keys.length - 12);

  var maxVal = 0;
  keys.forEach(function(k) {
    var m = mesice[k];
    maxVal = Math.max(maxVal, m.prijem || 0, m.vydaj || 0);
  });
  if (!maxVal) return;

  var section = document.createElement('div');
  section.style.cssText = 'margin-bottom:20px;';

  var chartTitle = document.createElement('div');
  chartTitle.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:8px;font-weight:600;';
  chartTitle.textContent = 'M\u011bs\xed\u010dn\xed p\u0159ehled (posledn\xedch ' + keys.length + '\xa0m\u011bs\xedc\u016f)';
  section.appendChild(chartTitle);

  var chart = document.createElement('div');
  chart.style.cssText = 'display:flex;align-items:flex-end;gap:6px;height:80px;overflow-x:auto;padding-bottom:20px;position:relative;';

  keys.forEach(function(k) {
    var m = mesice[k];
    var prijem = m.prijem || 0;
    var vydaj  = m.vydaj  || 0;

    var col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:28px;position:relative;';

    // Příjem bar
    var barP = document.createElement('div');
    var hP = Math.round((prijem / maxVal) * 70);
    barP.style.cssText = 'width:10px;background:var(--accent);border-radius:2px 2px 0 0;opacity:0.85;';
    barP.style.height = hP + 'px';
    barP.title = 'P\u0159. ' + fondFormatCastka(prijem) + ' K\u010d';

    // Výdaj bar
    var barV = document.createElement('div');
    var hV = Math.round((vydaj / maxVal) * 70);
    barV.style.cssText = 'width:10px;background:var(--danger);border-radius:2px 2px 0 0;opacity:0.85;';
    barV.style.height = hV + 'px';
    barV.title = 'V\xfd. ' + fondFormatCastka(vydaj) + ' K\u010d';

    var bars = document.createElement('div');
    bars.style.cssText = 'display:flex;gap:2px;align-items:flex-end;height:70px;';
    bars.appendChild(barP);
    bars.appendChild(barV);
    col.appendChild(bars);

    var mesicLbl = document.createElement('div');
    mesicLbl.style.cssText = 'font-size:0.65rem;color:var(--text-light);white-space:nowrap;position:absolute;bottom:-18px;';
    var parts = k.split('-');
    mesicLbl.textContent = parts[1] + '/' + parts[0].slice(2);
    col.appendChild(mesicLbl);

    chart.appendChild(col);
  });

  section.appendChild(chart);

  // Legenda
  var legenda = document.createElement('div');
  legenda.style.cssText = 'display:flex;gap:14px;margin-top:4px;font-size:0.75rem;color:var(--text-light);';
  [
    { color: 'var(--accent)', label: 'P\u0159\xedjmy' },
    { color: 'var(--danger)', label: 'V\xfddaje' },
  ].forEach(function(item) {
    var leg = document.createElement('div');
    leg.style.cssText = 'display:flex;align-items:center;gap:4px;';
    var dot = document.createElement('span');
    dot.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;background:' + item.color + ';opacity:0.85;';
    var txt = document.createElement('span');
    txt.textContent = item.label;
    leg.appendChild(dot);
    leg.appendChild(txt);
    legenda.appendChild(leg);
  });
  section.appendChild(legenda);

  wrap.appendChild(section);
}

function fondRenderList(listWrap, formWrap, statsWrap, chartWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = user.role === 'admin' || user.role === 'vybor';

  var header = document.createElement('div');
  header.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;';
  header.textContent = 'Posledn\xed z\xe1znamy';
  listWrap.appendChild(header);

  if (!items.length) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0;';
    empty.textContent = 'Zatím nejsou \u017e\xe1dn\xe9 z\xe1znamy.';
    listWrap.appendChild(empty);
    return;
  }

  items.forEach(function(z) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;';

    var typDot = document.createElement('span');
    typDot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:2px;' +
      'background:' + (z.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)') + ';';
    row.appendChild(typDot);

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:140px;';

    var popis = document.createElement('div');
    popis.style.cssText = 'font-size:0.9rem;font-weight:500;';
    popis.textContent = z.popis;
    info.appendChild(popis);

    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:1px;';
    meta.textContent = z.kategorie + ' \u00b7 ' + formatDatum(z.datum);
    info.appendChild(meta);

    row.appendChild(info);

    var castkaEl = document.createElement('div');
    castkaEl.style.cssText = 'font-weight:700;font-size:0.95rem;white-space:nowrap;' +
      'color:' + (z.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)') + ';';
    castkaEl.textContent = (z.typ === 'prijem' ? '+' : '\u2212') + fondFormatCastka(z.castka) + '\xa0K\u010d';
    row.appendChild(castkaEl);

    if (isPriv) {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Smazat';
      delBtn.addEventListener('click', function() {
        showConfirmModal(
          'Smazat z\xe1znam?',
          '"' + z.popis + '" — ' + fondFormatCastka(z.castka) + ' K\u010d',
          function() {
            Api.apiPost('api/fond_oprav.php?action=delete&id=' + z.id, {})
              .then(function() {
                showToast('Z\xe1znam smaz\xe1n');
                fondLoad(statsWrap, chartWrap, listWrap, formWrap, user);
              })
              .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
          }
        );
      });
      row.appendChild(delBtn);
    }

    listWrap.appendChild(row);
  });
}


function fondShowForm(formWrap, listWrap, statsWrap, chartWrap, user, addBtn) {
  formWrap.replaceChildren();
  formWrap.style.display = '';
  addBtn.style.display = 'none';

  var sep = document.createElement('hr');
  sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:16px 0;';
  formWrap.appendChild(sep);

  var heading = document.createElement('h3');
  heading.style.cssText = 'margin:0 0 16px;font-size:0.95rem;';
  heading.textContent = 'P\u0159idat z\xe1znam';
  formWrap.appendChild(heading);

  // Typ
  var typWrap = document.createElement('div');
  typWrap.style.marginBottom = '14px';
  var typLabel = document.createElement('label');
  typLabel.textContent = 'Typ';
  typLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var typSelect = document.createElement('select');
  typSelect.className = 'form-input';
  typSelect.style.maxWidth = '200px';
  [{ value: 'prijem', label: '\u2191 P\u0159\xedjem' }, { value: 'vydaj', label: '\u2193 V\xfddaj' }].forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.value; opt.textContent = t.label;
    typSelect.appendChild(opt);
  });
  typWrap.appendChild(typLabel);
  typWrap.appendChild(typSelect);
  formWrap.appendChild(typWrap);

  // Kategorie
  var katWrap = document.createElement('div');
  katWrap.style.marginBottom = '14px';
  var katLabel = document.createElement('label');
  katLabel.textContent = 'Kategorie';
  katLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var katSelect = document.createElement('select');
  katSelect.className = 'form-input';

  function updateKat() {
    katSelect.replaceChildren();
    var kats = typSelect.value === 'prijem' ? FOND_KAT_PRIJEM : FOND_KAT_VYDAJ;
    kats.forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      katSelect.appendChild(opt);
    });
  }
  updateKat();
  typSelect.addEventListener('change', updateKat);
  katWrap.appendChild(katLabel);
  katWrap.appendChild(katSelect);
  formWrap.appendChild(katWrap);

  // Popis + datum + částka
  var popisField  = makeAdminField('Popis', 'text', 'fond_popis', '');
  popisField.input.placeholder = 'nap\u0159. Revize v\xfdtahu 2025';
  formWrap.appendChild(popisField.el);

  var datumField  = makeAdminField('Datum', 'date', 'fond_datum', new Date().toISOString().slice(0, 10));
  formWrap.appendChild(datumField.el);

  var castkaField = makeAdminField('\u010c\xe1stka (K\u010d)', 'number', 'fond_castka', '');
  castkaField.input.min = '0.01';
  castkaField.input.step = '0.01';
  castkaField.input.placeholder = 'nap\u0159. 15000';
  formWrap.appendChild(castkaField.el);

  // Poznámka
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka (nepovinné)';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input';
  pozInput.rows = 2;
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  formWrap.appendChild(pozWrap);

  // Tlačítka
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'P\u0159idat z\xe1znam';
  btnRow.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() {
    formWrap.style.display = 'none';
    formWrap.replaceChildren();
    addBtn.style.display = '';
  });
  btnRow.appendChild(cancelBtn);
  formWrap.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    var popis  = popisField.input.value.trim();
    var datum  = datumField.input.value;
    var castka = castkaField.input.value.trim();

    if (!popis) { showToast('Vyplňte popis.', 'error'); return; }
    if (!datum)  { showToast('Vyplňte datum.', 'error'); return; }
    if (!castka || parseFloat(castka) <= 0) { showToast('Zadejte platnou \u010d\xe1stku.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    Api.apiPost('api/fond_oprav.php?action=add', {
      typ: typSelect.value, kategorie: katSelect.value,
      popis: popis, datum: datum, castka: castka, poznamka: pozInput.value.trim(),
    }).then(function() {
      showToast('Z\xe1znam p\u0159id\xe1n');
      formWrap.style.display = 'none';
      formWrap.replaceChildren();
      addBtn.style.display = '';
      fondLoad(statsWrap, chartWrap, listWrap, formWrap, user);
    }).catch(function(e) { showToast(e.message || 'Chyba.', 'error'); })
      .finally(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'P\u0159idat z\xe1znam';
      });
  });
}

function fondFormatCastka(val) {
  var n = parseFloat(val) || 0;
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

