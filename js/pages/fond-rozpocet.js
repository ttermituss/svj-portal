/* ===== FOND OPRAV — ROZPOČET (plán vs. skutečnost) ===== */

function fondRozpocetInit(el) {
  var currentRok = new Date().getFullYear();

  // Rok selector
  var topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;';

  var rokLabel = document.createElement('span');
  rokLabel.style.cssText = 'font-size:0.9rem;font-weight:500;';
  rokLabel.textContent = 'Rok:';
  topBar.appendChild(rokLabel);

  var rokSel = document.createElement('select');
  rokSel.className = 'form-input';
  rokSel.style.cssText = 'width:auto;min-width:90px;';
  for (var y = currentRok + 1; y >= currentRok - 5; y--) {
    var opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === currentRok) opt.selected = true;
    rokSel.appendChild(opt);
  }
  topBar.appendChild(rokSel);

  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ Polo\u017eka rozpo\u010dtu';
  addBtn.addEventListener('click', function() {
    fondRozpocetShowModal(null, parseInt(rokSel.value), reload);
  });
  topBar.appendChild(addBtn);

  el.appendChild(topBar);

  // Compare summary
  var summaryWrap = document.createElement('div');
  el.appendChild(summaryWrap);

  // Table
  var tableWrap = document.createElement('div');
  el.appendChild(tableWrap);

  rokSel.addEventListener('change', reload);

  function reload() {
    var rok = parseInt(rokSel.value);
    Promise.all([
      Api.apiGet('api/fond_rozpocet.php?action=list&rok=' + rok),
      Api.apiGet('api/fond_rozpocet.php?action=compare&rok=' + rok),
    ]).then(function(res) {
      fondRozpocetRenderSummary(summaryWrap, res[1]);
      fondRozpocetRenderTable(tableWrap, res[0].polozky || [], res[1], rok, reload);
    }).catch(function(e) {
      summaryWrap.replaceChildren();
      tableWrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst data.');
      summaryWrap.appendChild(err);
    });
  }

  reload();
}

/* ===== SUMMARY BOXES ===== */

function fondRozpocetRenderSummary(wrap, data) {
  wrap.replaceChildren();

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px;';

  var items = [
    { label: 'Pl\xe1n p\u0159\xedjmy', plan: data.celkem_plan_prijem, skut: data.celkem_skut_prijem, color: 'var(--accent)' },
    { label: 'Pl\xe1n v\xfddaje', plan: data.celkem_plan_vydaj, skut: data.celkem_skut_vydaj, color: 'var(--danger)' },
  ];

  items.forEach(function(item) {
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;padding:16px 20px;';

    var planEl = document.createElement('div');
    planEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:4px;';
    planEl.textContent = item.label;
    box.appendChild(planEl);

    var valRow = document.createElement('div');
    valRow.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:8px;';

    var planVal = document.createElement('div');
    planVal.style.cssText = 'font-size:1rem;font-weight:600;color:var(--text-light);';
    planVal.textContent = 'Pl\xe1n: ' + fondFmt(item.plan) + ' K\u010d';
    valRow.appendChild(planVal);

    var skutVal = document.createElement('div');
    skutVal.style.cssText = 'font-size:1.1rem;font-weight:700;color:' + item.color + ';';
    skutVal.textContent = fondFmt(item.skut) + ' K\u010d';
    valRow.appendChild(skutVal);

    box.appendChild(valRow);

    // Progress bar
    var pct = item.plan > 0 ? Math.round((item.skut / item.plan) * 100) : 0;
    var barBg = document.createElement('div');
    barBg.style.cssText = 'height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:8px;';
    var barFill = document.createElement('div');
    var barColor = pct <= 80 ? 'var(--accent)' : (pct <= 100 ? '#f6993f' : 'var(--danger)');
    barFill.style.cssText = 'height:100%;border-radius:3px;width:' + Math.min(pct, 100) + '%;background:' + barColor + ';';
    barBg.appendChild(barFill);
    box.appendChild(barBg);

    var pctLabel = document.createElement('div');
    pctLabel.style.cssText = 'font-size:0.75rem;color:var(--text-light);margin-top:2px;text-align:right;';
    pctLabel.textContent = pct + ' %';
    box.appendChild(pctLabel);

    grid.appendChild(box);
  });

  // Saldo box
  var saldoPlan = (data.celkem_plan_prijem || 0) - (data.celkem_plan_vydaj || 0);
  var saldoSkut = (data.celkem_skut_prijem || 0) - (data.celkem_skut_vydaj || 0);
  var saldoBox = document.createElement('div');
  saldoBox.style.cssText = 'background:var(--bg-hover);border:2px solid ' + (saldoSkut >= 0 ? 'var(--accent)' : 'var(--danger)')
    + ';border-radius:10px;padding:16px 20px;display:flex;flex-direction:column;justify-content:center;';

  var saldoLabel = document.createElement('div');
  saldoLabel.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:4px;';
  saldoLabel.textContent = 'Saldo (p\u0159\xedjmy \u2212 v\xfddaje)';
  saldoBox.appendChild(saldoLabel);

  var saldoRow = document.createElement('div');
  saldoRow.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;';
  var sp = document.createElement('span');
  sp.style.cssText = 'font-size:0.88rem;color:var(--text-light);';
  sp.textContent = 'Pl\xe1n: ' + fondFmt(saldoPlan) + ' K\u010d';
  var ss = document.createElement('span');
  ss.style.cssText = 'font-size:1.2rem;font-weight:700;color:' + (saldoSkut >= 0 ? 'var(--accent)' : 'var(--danger)') + ';';
  ss.textContent = fondFmt(saldoSkut) + ' K\u010d';
  saldoRow.appendChild(sp); saldoRow.appendChild(ss);
  saldoBox.appendChild(saldoRow);

  grid.appendChild(saldoBox);
  wrap.appendChild(grid);
}

/* ===== TABLE ===== */

function fondRozpocetRenderTable(wrap, polozky, compareData, rok, onReload) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Rozpo\u010det ' + rok + ' \u2014 pl\xe1n vs. skute\u010dnost';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.overflowX = 'auto';

  var items = compareData.polozky || [];
  if (!items.length && !polozky.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.88rem;';
    empty.textContent = '\u017d\xe1dn\xe9 polo\u017eky rozpo\u010dtu. P\u0159idejte prvn\xed polo\u017eku.';
    body.appendChild(empty);
    card.appendChild(body);
    wrap.appendChild(card);
    return;
  }

  // Build a lookup from polozky (list) for IDs
  var idMap = {};
  polozky.forEach(function(p) {
    idMap[p.typ + '|' + p.kategorie] = p.id;
  });

  var table = document.createElement('table');
  table.className = 'admin-table';
  table.style.cssText = 'width:100%;font-size:0.85rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Typ', 'Kategorie', 'Pl\xe1n (K\u010d)', 'Skute\u010dnost (K\u010d)', '\u010cerp\xe1n\xed', 'Akce'].forEach(function(t) {
    var th = document.createElement('th');
    th.textContent = t;
    th.style.cssText = 'padding:8px 10px;text-align:left;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');

  // Sort: příjmy first, then výdaje
  var sorted = items.slice().sort(function(a, b) {
    if (a.typ !== b.typ) return a.typ === 'prijem' ? -1 : 1;
    return a.kategorie.localeCompare(b.kategorie, 'cs');
  });

  sorted.forEach(function(item) {
    var tr = document.createElement('tr');

    var tdTyp = document.createElement('td');
    tdTyp.style.cssText = 'padding:8px 10px;';
    var typBadge = document.createElement('span');
    typBadge.className = 'badge';
    typBadge.style.cssText = 'font-size:0.72rem;background:' + (item.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)')
      + ';color:#fff;padding:2px 8px;border-radius:4px;';
    typBadge.textContent = item.typ === 'prijem' ? 'P\u0159\xedjem' : 'V\xfddaj';
    tdTyp.appendChild(typBadge);
    tr.appendChild(tdTyp);

    var tdKat = document.createElement('td');
    tdKat.style.cssText = 'padding:8px 10px;font-weight:500;';
    tdKat.textContent = item.kategorie;
    tr.appendChild(tdKat);

    var tdPlan = document.createElement('td');
    tdPlan.style.cssText = 'padding:8px 10px;text-align:right;';
    tdPlan.textContent = item.plan > 0 ? fondFmt(item.plan) : '\u2014';
    tr.appendChild(tdPlan);

    var tdSkut = document.createElement('td');
    tdSkut.style.cssText = 'padding:8px 10px;text-align:right;font-weight:600;color:'
      + (item.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)') + ';';
    tdSkut.textContent = item.skutecnost > 0 ? fondFmt(item.skutecnost) : '\u2014';
    tr.appendChild(tdSkut);

    // Progress bar cell
    var tdPct = document.createElement('td');
    tdPct.style.cssText = 'padding:8px 10px;min-width:100px;';
    var pct = item.procento;
    var barBg = document.createElement('div');
    barBg.style.cssText = 'height:6px;background:var(--border);border-radius:3px;overflow:hidden;';
    var barColor = pct <= 80 ? 'var(--accent)' : (pct <= 100 ? '#f6993f' : 'var(--danger)');
    var barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;border-radius:3px;width:' + Math.min(pct, 100) + '%;background:' + barColor + ';';
    barBg.appendChild(barFill);
    tdPct.appendChild(barBg);
    var pctText = document.createElement('div');
    pctText.style.cssText = 'font-size:0.72rem;color:var(--text-light);margin-top:2px;';
    pctText.textContent = (pct > 900 ? 'bez pl\xe1nu' : pct + ' %');
    tdPct.appendChild(pctText);
    tr.appendChild(tdPct);

    // Actions
    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 10px;white-space:nowrap;';
    var itemId = idMap[item.typ + '|' + item.kategorie];
    if (itemId) {
      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.style.fontSize = '0.75rem';
      editBtn.textContent = '\u270F\uFE0F';
      editBtn.title = 'Upravit';
      editBtn.addEventListener('click', (function(it) {
        return function() {
          var existing = null;
          polozky.forEach(function(p) { if (p.id === it) existing = p; });
          fondRozpocetShowModal(existing, rok, onReload);
        };
      })(itemId));
      tdAkce.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm';
      delBtn.style.cssText = 'font-size:0.75rem;color:var(--danger);margin-left:4px;';
      delBtn.textContent = 'Smazat';
      delBtn.addEventListener('click', (function(it, kat) {
        return function() {
          showConfirmModal('Smazat polo\u017eku?', kat, function() {
            Api.apiPost('api/fond_rozpocet.php?action=delete', { id: it })
              .then(function() { showToast('Polo\u017eka smaz\xe1na.', 'success'); onReload(); })
              .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
          });
        };
      })(itemId, item.kategorie));
      tdAkce.appendChild(delBtn);
    }
    tr.appendChild(tdAkce);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  body.appendChild(table);
  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== MODAL — přidání/editace položky rozpočtu ===== */

function fondRozpocetShowModal(existing, rok, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:420px;'
    + 'max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';

  var titleEl = document.createElement('h2');
  titleEl.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  titleEl.textContent = existing ? 'Upravit polo\u017eku rozpo\u010dtu' : 'Nov\xe1 polo\u017eka rozpo\u010dtu';
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

  // Částka
  var fCastka = fondModalField('Pl\xe1novan\xe1 \u010d\xe1stka (K\u010d) *', 'number', '50000');
  fCastka.input.min = '0'; fCastka.input.step = '0.01';
  if (existing) fCastka.input.value = existing.castka || '';
  modal.appendChild(fCastka.el);

  // Poznámka
  var fPoz = fondModalField('Pozn\xe1mka', 'text', '');
  if (existing) fPoz.input.value = existing.poznamka || '';
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
    if (!castka || parseFloat(castka) < 0) { errBox.textContent = 'Zadejte platnou \u010d\xe1stku.'; errBox.style.display = ''; return; }

    var payload = {
      rok: rok,
      typ: typSel.value,
      kategorie: katSel.value,
      castka: castka,
      poznamka: fPoz.input.value.trim(),
    };

    saveBtn.disabled = true;
    Api.apiPost('api/fond_rozpocet.php?action=save', payload)
      .then(function() {
        document.body.removeChild(overlay);
        showToast('Polo\u017eka ulo\u017eena.', 'success');
        if (onSaved) onSaved();
      })
      .catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fCastka.input.focus();
}
