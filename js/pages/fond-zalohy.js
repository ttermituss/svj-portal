/* ===== FOND OPRAV — ZÁLOHY (předpisy + platby) ===== */

var FOND_MESICE = [
  '', 'Leden', '\xdanor', 'B\u0159ezen', 'Duben', 'Kv\u011bten', '\u010cerven',
  '\u010cervenec', 'Srpen', 'Z\xe1\u0159\xed', '\u0158\xedjen', 'Listopad', 'Prosinec',
];

function fondZalohyInit(el) {
  var currentRok = new Date().getFullYear();
  var currentMesic = new Date().getMonth() + 1;

  // Top bar: rok + mesic
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

  var mesicLabel = document.createElement('span');
  mesicLabel.style.cssText = 'font-size:0.9rem;font-weight:500;';
  mesicLabel.textContent = 'M\u011bs\xedc:';
  topBar.appendChild(mesicLabel);

  var mesicSel = document.createElement('select');
  mesicSel.className = 'form-input';
  mesicSel.style.cssText = 'width:auto;min-width:110px;';
  for (var m = 1; m <= 12; m++) {
    var mopt = document.createElement('option');
    mopt.value = m; mopt.textContent = FOND_MESICE[m];
    if (m === currentMesic) mopt.selected = true;
    mesicSel.appendChild(mopt);
  }
  topBar.appendChild(mesicSel);

  el.appendChild(topBar);

  // Předpisy section
  var predpisyWrap = document.createElement('div');
  el.appendChild(predpisyWrap);

  // Zálohy section
  var zalohyWrap = document.createElement('div');
  el.appendChild(zalohyWrap);

  // Stats section
  var statsWrap = document.createElement('div');
  el.appendChild(statsWrap);

  rokSel.addEventListener('change', reloadAll);
  mesicSel.addEventListener('change', reloadZalohy);

  function reloadAll() {
    reloadPredpisy();
    reloadZalohy();
    reloadStats();
  }

  function reloadPredpisy() {
    var rok = parseInt(rokSel.value);
    Api.apiGet('api/fond_zalohy.php?action=predpisList&rok=' + rok)
      .then(function(res) {
        fondZalohyRenderPredpisy(predpisyWrap, res.predpisy || [], rok, reloadAll);
      })
      .catch(function(e) {
        predpisyWrap.replaceChildren();
        var err = document.createElement('div');
        err.className = 'info-box info-box-danger';
        err.textContent = 'Chyba: ' + (e.message || '');
        predpisyWrap.appendChild(err);
      });
  }

  function reloadZalohy() {
    var rok = parseInt(rokSel.value);
    var mesic = parseInt(mesicSel.value);
    Api.apiGet('api/fond_zalohy.php?action=zalohyList&rok=' + rok + '&mesic=' + mesic)
      .then(function(res) {
        fondZalohyRenderZalohy(zalohyWrap, res.zalohy || [], rok, mesic, reloadZalohy);
      })
      .catch(function(e) {
        zalohyWrap.replaceChildren();
        var err = document.createElement('div');
        err.className = 'info-box info-box-danger';
        err.textContent = 'Chyba: ' + (e.message || '');
        zalohyWrap.appendChild(err);
      });
  }

  function reloadStats() {
    var rok = parseInt(rokSel.value);
    Api.apiGet('api/fond_zalohy.php?action=zalohyStats&rok=' + rok)
      .then(function(res) {
        fondZalohyRenderStats(statsWrap, res.mesice || [], rok);
      })
      .catch(function() { statsWrap.replaceChildren(); });
  }

  reloadAll();
}

/* ===== PŘEDPISY KARTA ===== */

function fondZalohyRenderPredpisy(wrap, predpisy, rok, onReload) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'P\u0159edpisy z\xe1loh ' + rok;
  hdr.appendChild(h2);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;';

  var genBtn = document.createElement('button');
  genBtn.className = 'btn btn-primary btn-sm';
  genBtn.textContent = 'Generovat z pod\xedl\u016f';
  genBtn.addEventListener('click', function() {
    fondZalohyShowGenerateModal(rok, onReload);
  });
  btnRow.appendChild(genBtn);
  hdr.appendChild(btnRow);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.overflowX = 'auto';

  if (!predpisy.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.88rem;';
    empty.textContent = '\u017d\xe1dn\xe9 p\u0159edpisy. Klikn\u011bte "Generovat z pod\xedl\u016f" pro automatick\xfd v\xfdpo\u010det.';
    body.appendChild(empty);
  } else {
    var table = document.createElement('table');
    table.className = 'admin-table';
    table.style.cssText = 'width:100%;font-size:0.85rem;';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Jednotka', 'Vlastn\xedk', 'Pod\xedl', 'M\u011bs\xed\u010dn\xed \u010d\xe1stka', 'Akce'].forEach(function(t) {
      var th = document.createElement('th');
      th.textContent = t;
      th.style.cssText = 'padding:8px 10px;text-align:left;';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    var celkem = 0;

    predpisy.forEach(function(p) {
      celkem += parseFloat(p.mesicni_castka) || 0;
      var tr = document.createElement('tr');

      var tdJed = document.createElement('td');
      tdJed.style.cssText = 'padding:8px 10px;font-weight:600;';
      tdJed.textContent = p.cislo_jednotky || '#' + p.jednotka_id;
      tr.appendChild(tdJed);

      var tdVlast = document.createElement('td');
      tdVlast.style.cssText = 'padding:8px 10px;';
      tdVlast.textContent = ((p.vlastnik_jmeno || '') + ' ' + (p.vlastnik_prijmeni || '')).trim() || '\u2014';
      tr.appendChild(tdVlast);

      var tdPodil = document.createElement('td');
      tdPodil.style.cssText = 'padding:8px 10px;color:var(--text-light);font-size:0.82rem;';
      tdPodil.textContent = (p.podil_citatel && p.podil_jmenovatel)
        ? p.podil_citatel + '/' + p.podil_jmenovatel
        : '\u2014';
      tr.appendChild(tdPodil);

      var tdCastka = document.createElement('td');
      tdCastka.style.cssText = 'padding:8px 10px;font-weight:600;text-align:right;';
      tdCastka.textContent = fondFmt(p.mesicni_castka) + ' K\u010d';
      tr.appendChild(tdCastka);

      var tdAkce = document.createElement('td');
      tdAkce.style.cssText = 'padding:8px 10px;white-space:nowrap;';
      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.style.fontSize = '0.75rem';
      editBtn.textContent = '\u270F\uFE0F';
      editBtn.title = 'Upravit';
      editBtn.addEventListener('click', (function(pred) {
        return function() { fondZalohyShowPredpisEditModal(pred, rok, onReload); };
      })(p));
      tdAkce.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm';
      delBtn.style.cssText = 'font-size:0.82rem;color:var(--danger);margin-left:4px;';
      delBtn.textContent = '\u00d7';
      delBtn.addEventListener('click', (function(pred) {
        return function() {
          showConfirmModal('Smazat p\u0159edpis?', 'Jednotka ' + (pred.cislo_jednotky || pred.jednotka_id), function() {
            Api.apiPost('api/fond_zalohy.php?action=predpisDelete', { id: pred.id })
              .then(function() { showToast('P\u0159edpis smaz\xe1n.', 'success'); onReload(); })
              .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
          });
        };
      })(p));
      tdAkce.appendChild(delBtn);
      tr.appendChild(tdAkce);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    body.appendChild(table);

    // Total row
    var totalRow = document.createElement('div');
    totalRow.style.cssText = 'display:flex;justify-content:space-between;padding:10px;font-weight:700;'
      + 'border-top:2px solid var(--border);margin-top:4px;font-size:0.9rem;';
    var totalLabel = document.createElement('span');
    totalLabel.textContent = 'Celkem m\u011bs\xed\u010dn\u011b:';
    var totalVal = document.createElement('span');
    totalVal.style.color = 'var(--accent)';
    totalVal.textContent = fondFmt(celkem) + ' K\u010d';
    totalRow.appendChild(totalLabel); totalRow.appendChild(totalVal);
    body.appendChild(totalRow);
  }

  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== ZÁLOHY KARTA ===== */

function fondZalohyRenderZalohy(wrap, zalohy, rok, mesic, onReload) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Z\xe1lohy \u2014 ' + FOND_MESICE[mesic] + ' ' + rok;
  hdr.appendChild(h2);

  var genBtn = document.createElement('button');
  genBtn.className = 'btn btn-primary btn-sm';
  genBtn.textContent = 'Generovat z\xe1lohy';
  genBtn.addEventListener('click', function() {
    genBtn.disabled = true;
    Api.apiPost('api/fond_zalohy.php?action=zalohyGenerate', { rok: rok, mesic: mesic })
      .then(function(res) {
        showToast(res.message || 'Z\xe1lohy vygenerov\xe1ny.', 'success');
        onReload();
      })
      .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); })
      .finally(function() { genBtn.disabled = false; });
  });
  hdr.appendChild(genBtn);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.overflowX = 'auto';

  if (!zalohy.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.88rem;';
    empty.textContent = '\u017d\xe1dn\xe9 z\xe1lohy pro tento m\u011bs\xedc. Klikn\u011bte "Generovat z\xe1lohy".';
    body.appendChild(empty);
    card.appendChild(body);
    wrap.appendChild(card);
    return;
  }

  var table = document.createElement('table');
  table.className = 'admin-table';
  table.style.cssText = 'width:100%;font-size:0.85rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Jednotka', 'Vlastn\xedk', 'P\u0159edeps\xe1no', 'Zaplaceno', 'Stav', 'Akce'].forEach(function(t) {
    var th = document.createElement('th');
    th.textContent = t;
    th.style.cssText = 'padding:8px 10px;text-align:left;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  var totalPred = 0, totalZap = 0, countPaid = 0, countPartial = 0, countUnpaid = 0;

  zalohy.forEach(function(z) {
    var pred = parseFloat(z.predepsano) || 0;
    var zap = parseFloat(z.zaplaceno) || 0;
    totalPred += pred; totalZap += zap;

    var stav, stavColor, stavBg;
    if (zap >= pred && pred > 0) {
      stav = '\u2705 Zaplaceno'; stavColor = 'var(--accent)'; stavBg = 'rgba(56,161,105,0.1)'; countPaid++;
    } else if (zap > 0) {
      stav = '\u26A0\uFE0F \u010c\xe1ste\u010dn\u011b'; stavColor = '#f6993f'; stavBg = 'rgba(246,153,63,0.1)'; countPartial++;
    } else {
      stav = '\u274C Nezaplaceno'; stavColor = 'var(--danger)'; stavBg = 'rgba(229,62,62,0.1)'; countUnpaid++;
    }

    var tr = document.createElement('tr');

    var tdJed = document.createElement('td');
    tdJed.style.cssText = 'padding:8px 10px;font-weight:600;';
    tdJed.textContent = z.cislo_jednotky || '#' + z.predpis_id;
    tr.appendChild(tdJed);

    var tdVlast = document.createElement('td');
    tdVlast.style.cssText = 'padding:8px 10px;';
    tdVlast.textContent = ((z.vlastnik_jmeno || '') + ' ' + (z.vlastnik_prijmeni || '')).trim() || '\u2014';
    tr.appendChild(tdVlast);

    var tdPred = document.createElement('td');
    tdPred.style.cssText = 'padding:8px 10px;text-align:right;';
    tdPred.textContent = fondFmt(pred) + ' K\u010d';
    tr.appendChild(tdPred);

    var tdZap = document.createElement('td');
    tdZap.style.cssText = 'padding:8px 10px;text-align:right;font-weight:600;color:' + stavColor + ';';
    tdZap.textContent = fondFmt(zap) + ' K\u010d';
    tr.appendChild(tdZap);

    var tdStav = document.createElement('td');
    tdStav.style.cssText = 'padding:8px 10px;';
    var badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.82rem;padding:5px 10px;border-radius:6px;background:' + stavBg + ';color:' + stavColor + ';font-weight:600;';
    badge.textContent = stav;
    tdStav.appendChild(badge);
    tr.appendChild(tdStav);

    var tdAkce = document.createElement('td');
    tdAkce.style.cssText = 'padding:8px 10px;';
    var payBtn = document.createElement('button');
    payBtn.className = 'btn btn-primary btn-sm';
    payBtn.style.fontSize = '0.78rem';
    payBtn.textContent = (zap >= pred && pred > 0) ? 'Upravit' : 'Zaplatit';
    payBtn.addEventListener('click', (function(zal) {
      return function() { fondZalohyShowPayModal(zal, onReload); };
    })(z));
    tdAkce.appendChild(payBtn);
    tr.appendChild(tdAkce);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  body.appendChild(table);

  // Summary bar
  var summaryBar = document.createElement('div');
  summaryBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:12px 10px;'
    + 'border-top:2px solid var(--border);margin-top:4px;';

  var pctPaid = totalPred > 0 ? Math.round((totalZap / totalPred) * 100) : 0;

  // Progress bar
  var progressWrap = document.createElement('div');
  progressWrap.style.cssText = 'flex:1;min-width:150px;';
  var barBg = document.createElement('div');
  barBg.style.cssText = 'height:8px;background:var(--border);border-radius:4px;overflow:hidden;';
  var barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;border-radius:4px;background:var(--accent);width:' + Math.min(pctPaid, 100) + '%;';
  barBg.appendChild(barFill);
  progressWrap.appendChild(barBg);
  var pctText = document.createElement('div');
  pctText.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
  pctText.textContent = 'Zaplaceno ' + fondFmt(totalZap) + ' z ' + fondFmt(totalPred) + ' K\u010d (' + pctPaid + ' %)';
  progressWrap.appendChild(pctText);
  summaryBar.appendChild(progressWrap);

  // Counts
  var counts = document.createElement('div');
  counts.style.cssText = 'display:flex;gap:10px;font-size:0.82rem;';
  [
    { label: '\u2705 ' + countPaid, color: 'var(--accent)' },
    { label: '\u26A0\uFE0F ' + countPartial, color: '#f6993f' },
    { label: '\u274C ' + countUnpaid, color: 'var(--danger)' },
  ].forEach(function(c) {
    var sp = document.createElement('span');
    sp.style.cssText = 'font-weight:600;color:' + c.color + ';';
    sp.textContent = c.label;
    counts.appendChild(sp);
  });
  summaryBar.appendChild(counts);

  body.appendChild(summaryBar);
  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== ROČNÍ STATS ===== */

function fondZalohyRenderStats(wrap, mesice, rok) {
  wrap.replaceChildren();
  if (!mesice.length) return;

  var card = document.createElement('div');
  card.className = 'card';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'P\u0159ehled z\xe1loh ' + rok;
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.overflowX = 'auto';

  var table = document.createElement('table');
  table.className = 'admin-table';
  table.style.cssText = 'width:100%;font-size:0.82rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['M\u011bs\xedc', 'P\u0159edeps\xe1no', 'Zaplaceno', '%', '\u2705', '\u26A0\uFE0F', '\u274C'].forEach(function(t) {
    var th = document.createElement('th');
    th.textContent = t;
    th.style.cssText = 'padding:6px 8px;text-align:right;';
    headRow.appendChild(th);
  });
  headRow.children[0].style.textAlign = 'left';
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  mesice.forEach(function(m) {
    var tr = document.createElement('tr');

    var tdM = document.createElement('td');
    tdM.style.cssText = 'padding:6px 8px;font-weight:500;';
    tdM.textContent = FOND_MESICE[parseInt(m.mesic)] || m.mesic;
    tr.appendChild(tdM);

    var pred = parseFloat(m.predepsano_celkem) || 0;
    var zap = parseFloat(m.zaplaceno_celkem) || 0;

    var tdPred = document.createElement('td');
    tdPred.style.cssText = 'padding:6px 8px;text-align:right;';
    tdPred.textContent = fondFmt(pred);
    tr.appendChild(tdPred);

    var tdZap = document.createElement('td');
    tdZap.style.cssText = 'padding:6px 8px;text-align:right;font-weight:600;';
    tdZap.textContent = fondFmt(zap);
    tr.appendChild(tdZap);

    var pct = pred > 0 ? Math.round((zap / pred) * 100) : 0;
    var tdPct = document.createElement('td');
    tdPct.style.cssText = 'padding:6px 8px;text-align:right;font-weight:600;color:'
      + (pct >= 100 ? 'var(--accent)' : pct >= 50 ? '#f6993f' : 'var(--danger)') + ';';
    tdPct.textContent = pct + ' %';
    tr.appendChild(tdPct);

    [m.zaplaceno_pocet, m.castecne_pocet, m.nezaplaceno_pocet].forEach(function(v) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:6px 8px;text-align:right;';
      td.textContent = parseInt(v) || 0;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  body.appendChild(table);
  card.appendChild(body);
  wrap.appendChild(card);
}

/* Modal functions in fond-zalohy-modal.js */
