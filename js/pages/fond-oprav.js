/* ===== FOND OPRAV — HLAVNÍ STRÁNKA (admin/výbor) ===== */

var FOND_KAT_PRIJEM = [
  'Z\xe1lohy vlastn\xedk\u016f', 'Dotace / subvence', '\xdaroky z \xfa\u010dtu',
  'Pojistn\xe9 pln\u011bn\xed', 'Ostatn\xed p\u0159\xedjmy',
];
var FOND_KAT_VYDAJ = [
  'Oprava st\u0159echy', 'Fas\xe1da / zateplen\xed', 'V\xfdtah', 'Elektroinstalace',
  'Vodoinstalace / kanalizace', 'Mal\xedrov\xe1n\xed spole\u010dn\xfdch prostor',
  'Spr\xe1va domu', 'Pojistiteln\xe9 v\xfddaje', 'Revize', 'Ostatn\xed v\xfddaje',
];

var FOND_UCTY_TYP = {
  bezny: 'B\u011b\u017en\xfd', sporici: 'Spo\u0159ic\xed',
  terminovany: 'Term\xednovan\xfd', jiny: 'Jin\xfd',
};

Router.register('fond-oprav', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { Router.navigate('home'); return; }
  var isPriv = user.role === 'admin' || user.role === 'vybor';
  if (!isPriv) { Router.navigate('home'); return; }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Fond oprav';
  var sub = document.createElement('p');
  sub.textContent = 'P\u0159ehled hospoda\u0159en\xed, \xfa\u010dty, statistiky';
  title.appendChild(h1); title.appendChild(sub);
  el.appendChild(title);

  // Stats summary boxes
  var statsWrap = document.createElement('div');
  el.appendChild(statsWrap);

  // Accounts section
  var uctyWrap = document.createElement('div');
  el.appendChild(uctyWrap);

  // Charts row: monthly + trend
  var chartsRow = document.createElement('div');
  chartsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';
  el.appendChild(chartsRow);
  var chartWrap = document.createElement('div');
  var trendWrap = document.createElement('div');
  chartsRow.appendChild(chartWrap);
  chartsRow.appendChild(trendWrap);

  // Stats row: yearly table + top categories
  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';
  el.appendChild(statsRow);
  var rocniWrap = document.createElement('div');
  var katWrap = document.createElement('div');
  statsRow.appendChild(rocniWrap);
  statsRow.appendChild(katWrap);

  // Records list
  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  // Add + Export buttons
  var actionBar = document.createElement('div');
  actionBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;';

  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ P\u0159idat z\xe1znam';
  addBtn.addEventListener('click', function() {
    fondShowAddModal(function() { loadAll(); });
  });
  actionBar.appendChild(addBtn);

  ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    var icons = { pdf: '\uD83D\uDCC3 PDF', xlsx: '\uD83D\uDCCA XLSX', csv: '\uD83D\uDCC4 CSV' };
    btn.textContent = icons[fmt];
    btn.addEventListener('click', function() {
      window.location.href = 'api/export.php?type=fond_oprav&format=' + fmt;
    });
    actionBar.appendChild(btn);
  });
  el.appendChild(actionBar);

  // Responsive
  var mq = window.matchMedia('(max-width: 768px)');
  function applyMq(e) {
    chartsRow.style.gridTemplateColumns = e.matches ? '1fr' : '1fr 1fr';
    statsRow.style.gridTemplateColumns = e.matches ? '1fr' : '1fr 1fr';
  }
  applyMq(mq);
  mq.addEventListener('change', applyMq);

  function loadAll() {
    Promise.all([
      Api.apiGet('api/fond_oprav.php?action=stats'),
      Api.apiGet('api/fond_oprav.php?action=statsRocni'),
      Api.apiGet('api/fond_oprav.php?action=statsKat'),
      Api.apiGet('api/fond_oprav.php?action=uctyList'),
      Api.apiGet('api/fond_oprav.php?action=list&limit=50'),
    ]).then(function(res) {
      fondRenderSummary(statsWrap, res[0]);
      fondRenderMonthChart(chartWrap, res[0].mesice || {});
      fondRenderTrendChart(trendWrap, res[1].trend || []);
      fondRenderRocniTable(rocniWrap, res[1].roky || []);
      fondRenderKategorie(katWrap, res[2]);
      fondRenderUcty(uctyWrap, res[3].ucty || [], loadAll);
      fondRenderZaznamy(listWrap, res[4].zaznamy || [], user, loadAll);
    }).catch(function(e) {
      statsWrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst data.');
      statsWrap.appendChild(err);
    });
  }

  loadAll();
});

/* ===== SUMMARY BOXES ===== */

function fondRenderSummary(wrap, data) {
  wrap.replaceChildren();
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;';

  var items = [
    { label: 'Z\u016fstatek', value: data.zustatek, color: data.zustatek >= 0 ? 'var(--accent)' : 'var(--danger)', big: true },
    { label: 'P\u0159\xedjmy celkem', value: data.prijem_celkem, color: 'var(--accent)' },
    { label: 'V\xfddaje celkem', value: data.vydaj_celkem, color: 'var(--danger)' },
  ];

  items.forEach(function(item) {
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;padding:16px 20px;';
    if (item.big) box.style.borderWidth = '2px';

    var val = document.createElement('div');
    val.style.cssText = 'font-size:' + (item.big ? '1.5rem' : '1.15rem') + ';font-weight:700;color:' + item.color + ';';
    val.textContent = fondFmt(item.value) + '\xa0K\u010d';
    box.appendChild(val);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
    lbl.textContent = item.label;
    box.appendChild(lbl);

    grid.appendChild(box);
  });

  wrap.appendChild(grid);
}

/* ===== MONTHLY BAR CHART ===== */

function fondRenderMonthChart(wrap, mesice) {
  wrap.replaceChildren();
  var keys = Object.keys(mesice).sort();
  if (!keys.length) { fondEmptyCard(wrap, 'M\u011bs\xed\u010dn\xed p\u0159ehled', '\u017d\xe1dn\xe1 data.'); return; }
  if (keys.length > 12) keys = keys.slice(keys.length - 12);

  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'M\u011bs\xed\u010dn\xed p\u0159ehled';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  var maxVal = 0;
  keys.forEach(function(k) { maxVal = Math.max(maxVal, mesice[k].prijem || 0, mesice[k].vydaj || 0); });
  if (!maxVal) { fondEmptyCard(wrap, 'M\u011bs\xed\u010dn\xed p\u0159ehled', 'V\u0161e 0.'); return; }

  var chart = document.createElement('div');
  chart.style.cssText = 'display:flex;align-items:flex-end;gap:6px;height:120px;overflow-x:auto;padding-bottom:22px;position:relative;';

  keys.forEach(function(k) {
    var m = mesice[k];
    var col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:32px;position:relative;';
    var bars = document.createElement('div');
    bars.style.cssText = 'display:flex;gap:2px;align-items:flex-end;height:100px;';

    var barP = document.createElement('div');
    barP.style.cssText = 'width:12px;background:var(--accent);border-radius:3px 3px 0 0;opacity:0.85;';
    barP.style.height = Math.round(((m.prijem || 0) / maxVal) * 95) + 'px';
    barP.title = 'P\u0159\xedjjem: ' + fondFmt(m.prijem || 0) + ' K\u010d';

    var barV = document.createElement('div');
    barV.style.cssText = 'width:12px;background:var(--danger);border-radius:3px 3px 0 0;opacity:0.85;';
    barV.style.height = Math.round(((m.vydaj || 0) / maxVal) * 95) + 'px';
    barV.title = 'V\xfddaj: ' + fondFmt(m.vydaj || 0) + ' K\u010d';

    bars.appendChild(barP); bars.appendChild(barV);
    col.appendChild(bars);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.65rem;color:var(--text-light);white-space:nowrap;position:absolute;bottom:-18px;';
    var parts = k.split('-');
    lbl.textContent = parts[1] + '/' + parts[0].slice(2);
    col.appendChild(lbl);
    chart.appendChild(col);
  });

  body.appendChild(chart);

  var legenda = document.createElement('div');
  legenda.style.cssText = 'display:flex;gap:14px;margin-top:6px;font-size:0.75rem;color:var(--text-light);';
  [['var(--accent)', 'P\u0159\xedjmy'], ['var(--danger)', 'V\xfddaje']].forEach(function(l) {
    var leg = document.createElement('div');
    leg.style.cssText = 'display:flex;align-items:center;gap:4px;';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:10px;height:10px;border-radius:2px;background:' + l[0] + ';opacity:0.85;';
    var txt = document.createElement('span');
    txt.textContent = l[1];
    leg.appendChild(dot); leg.appendChild(txt); legenda.appendChild(leg);
  });
  body.appendChild(legenda);

  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== TREND LINE CHART (running balance) ===== */

function fondRenderTrendChart(wrap, trend) {
  wrap.replaceChildren();
  if (!trend.length) { fondEmptyCard(wrap, 'Trend z\u016fstatku', '\u017d\xe1dn\xe1 data.'); return; }

  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Trend z\u016fstatku (24 m\u011bs.)';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  // SVG line chart
  var W = 400, H = 140, PAD = 30;
  var vals = trend.map(function(t) { return t.zustatek; });
  var minV = Math.min.apply(null, vals);
  var maxV = Math.max.apply(null, vals);
  var range = maxV - minV || 1;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.cssText = 'width:100%;height:auto;';

  // Grid lines
  for (var g = 0; g <= 4; g++) {
    var gy = PAD + (H - 2 * PAD) * (1 - g / 4);
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', PAD); line.setAttribute('x2', W - 10);
    line.setAttribute('y1', gy); line.setAttribute('y2', gy);
    line.setAttribute('stroke', 'var(--border)'); line.setAttribute('stroke-width', '0.5');
    svg.appendChild(line);

    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', PAD - 4); label.setAttribute('y', gy + 3);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('fill', 'var(--text-light)'); label.setAttribute('font-size', '7');
    var gridVal = minV + range * (g / 4);
    label.textContent = fondFmtShort(gridVal);
    svg.appendChild(label);
  }

  // Line path
  var points = [];
  trend.forEach(function(t, i) {
    var x = PAD + (W - PAD - 10) * (i / (trend.length - 1 || 1));
    var y = PAD + (H - 2 * PAD) * (1 - (t.zustatek - minV) / range);
    points.push(x + ',' + y);
  });

  var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', points.join(' '));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', 'var(--accent)');
  polyline.setAttribute('stroke-width', '2');
  polyline.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(polyline);

  // Dots on first/last
  [0, trend.length - 1].forEach(function(idx) {
    var t = trend[idx];
    var x = PAD + (W - PAD - 10) * (idx / (trend.length - 1 || 1));
    var y = PAD + (H - 2 * PAD) * (1 - (t.zustatek - minV) / range);
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', '3'); circle.setAttribute('fill', 'var(--accent)');
    svg.appendChild(circle);
    var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x); txt.setAttribute('y', y - 6);
    txt.setAttribute('text-anchor', idx === 0 ? 'start' : 'end');
    txt.setAttribute('fill', 'var(--text)'); txt.setAttribute('font-size', '8'); txt.setAttribute('font-weight', '600');
    txt.textContent = fondFmtShort(t.zustatek);
    svg.appendChild(txt);
  });

  body.appendChild(svg);
  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== HELPERS ===== */

function fondFmt(val) {
  var n = parseFloat(val) || 0;
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fondFmtShort(val) {
  var n = parseFloat(val) || 0;
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + 'k';
  return n.toFixed(0);
}

function fondEmptyCard(wrap, titleText, msg) {
  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = titleText;
  hdr.appendChild(h2);
  card.appendChild(hdr);
  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.88rem;';
  body.textContent = msg;
  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== ADD RECORD MODAL ===== */

function fondShowAddModal(onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';
  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:440px;'
    + 'max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';
  var title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  title.textContent = 'P\u0159idat z\xe1znam';
  modal.appendChild(title);

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
    typSel.appendChild(opt);
  });
  typWrap.appendChild(typLbl); typWrap.appendChild(typSel);
  modal.appendChild(typWrap);

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
      katSel.appendChild(opt);
    });
  }
  updateKat();
  typSel.addEventListener('change', updateKat);
  katWrap.appendChild(katLbl); katWrap.appendChild(katSel);
  modal.appendChild(katWrap);

  var fPopis = fondModalField('Popis *', 'text', 'nap\u0159. Revize v\xfdtahu 2026');
  var fDatum = fondModalField('Datum *', 'date', '');
  fDatum.input.value = new Date().toISOString().slice(0, 10);
  var fCastka = fondModalField('\u010c\xe1stka (K\u010d) *', 'number', '15000');
  fCastka.input.min = '0.01'; fCastka.input.step = '0.01';
  var fPoz = fondModalField('Pozn\xe1mka', 'text', '');
  modal.appendChild(fPopis.el); modal.appendChild(fDatum.el);
  modal.appendChild(fCastka.el); modal.appendChild(fPoz.el);

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  modal.appendChild(errBox);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'P\u0159idat';
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
    saveBtn.disabled = true;
    Api.apiPost('api/fond_oprav.php?action=add', {
      typ: typSel.value, kategorie: katSel.value,
      popis: popis, datum: datum, castka: castka, poznamka: fPoz.input.value.trim(),
    }).then(function() {
      document.body.removeChild(overlay);
      showToast('Z\xe1znam p\u0159id\xe1n.', 'success');
      if (onSaved) onSaved();
    }).catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fPopis.input.focus();
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
