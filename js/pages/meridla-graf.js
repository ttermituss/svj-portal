/* ===== Grafy spotřeby — CSS bar chart (bez knihoven) ===== */

function merGrafModal(meridlo) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-lg);'
    + 'width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;'
    + 'box-shadow:var(--shadow-lg);';

  var typInfo = typeof merTypInfo === 'function' ? merTypInfo(meridlo.typ) : { icon: '', label: meridlo.typ, unit: '' };

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border-light);'
    + 'display:flex;justify-content:space-between;align-items:center;';
  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1rem;';
  titleEl.textContent = '\uD83D\uDCC8 Spot\u0159eba \u2014 ' + typInfo.icon + ' ' + typInfo.label;
  if (meridlo.cislo_jednotky) titleEl.textContent += ' (j. ' + meridlo.cislo_jednotky + ')';
  header.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-light);';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { removeTrap(); overlay.remove(); });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;';
  modal.appendChild(body);

  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) { removeTrap(); overlay.remove(); } });
  document.body.appendChild(overlay);
  var removeTrap = trapFocus(overlay);

  merGrafLoad(body, meridlo, typInfo);
}

function merGrafLoad(body, meridlo, typInfo) {
  body.replaceChildren();
  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m data\u2026';
  body.appendChild(loading);

  Api.apiGet('api/meridla.php?action=spotreba&meridlo_id=' + meridlo.id)
    .then(function(data) {
      body.replaceChildren();
      var items = data.spotreba || [];
      if (items.length < 1) {
        var empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:30px;color:var(--text-light);font-size:0.9rem;';
        empty.textContent = 'Nedostatek dat pro graf (pot\u0159eba alespo\u0148 2 ode\u010dty).';
        body.appendChild(empty);
        return;
      }
      merGrafRender(body, items, typInfo, data.odecty || []);
    })
    .catch(function(e) {
      body.replaceChildren();
      body.textContent = e.message || 'Chyba.';
    });
}

function merGrafRender(body, spotreba, typInfo, odecty) {
  var unit = typInfo.unit || '';

  // Summary
  var total = spotreba.reduce(function(s, i) { return s + i.spotreba; }, 0);
  var avg = total / spotreba.length;
  var max = Math.max.apply(null, spotreba.map(function(i) { return Math.abs(i.spotreba); }));

  var summary = document.createElement('div');
  summary.style.cssText = 'display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px;';

  [
    { label: 'Celkov\u00e1 spot\u0159eba', value: total.toLocaleString('cs-CZ', { maximumFractionDigits: 3 }) + ' ' + unit },
    { label: 'Pr\u016fm\u011br za obdob\u00ed', value: avg.toLocaleString('cs-CZ', { maximumFractionDigits: 3 }) + ' ' + unit },
    { label: 'Po\u010det obdob\u00ed', value: String(spotreba.length) },
  ].forEach(function(s) {
    var card = document.createElement('div');
    card.style.cssText = 'flex:1;min-width:120px;background:var(--bg);border-radius:var(--radius);'
      + 'padding:10px 14px;border:1px solid var(--border-light);';
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:4px;';
    lbl.textContent = s.label;
    card.appendChild(lbl);
    var val = document.createElement('div');
    val.style.cssText = 'font-size:1.05rem;font-weight:600;';
    val.textContent = s.value;
    card.appendChild(val);
    summary.appendChild(card);
  });
  body.appendChild(summary);

  // Chart title
  var chartTitle = document.createElement('div');
  chartTitle.style.cssText = 'font-size:0.85rem;font-weight:600;margin-bottom:12px;';
  chartTitle.textContent = 'Spot\u0159eba mezi ode\u010dty';
  body.appendChild(chartTitle);

  // CSS bar chart
  var chartWrap = document.createElement('div');
  chartWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  spotreba.forEach(function(item) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';

    var label = document.createElement('div');
    label.style.cssText = 'min-width:130px;font-size:0.82rem;color:var(--text-light);flex-shrink:0;text-align:right;';
    var dOd = new Date(item.od + 'T00:00:00');
    var dDo = new Date(item.do + 'T00:00:00');
    label.textContent = dOd.toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' })
      + ' \u2192 ' + dDo.toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' });
    row.appendChild(label);

    var barOuter = document.createElement('div');
    barOuter.style.cssText = 'flex:1;height:22px;background:var(--bg-hover);border-radius:4px;overflow:hidden;min-width:80px;';

    var barInner = document.createElement('div');
    var pct = max > 0 ? Math.round(Math.abs(item.spotreba) / max * 100) : 0;
    var barColor = item.spotreba < 0 ? 'var(--danger)' : 'var(--primary)';
    barInner.style.cssText = 'height:100%;border-radius:4px;background:' + barColor
      + ';width:' + pct + '%;transition:width 0.3s;min-width:2px;';
    barOuter.appendChild(barInner);
    row.appendChild(barOuter);

    var valEl = document.createElement('div');
    valEl.style.cssText = 'min-width:80px;font-size:0.82rem;font-weight:500;text-align:right;';
    valEl.textContent = item.spotreba.toLocaleString('cs-CZ', { maximumFractionDigits: 3 }) + ' ' + unit;
    row.appendChild(valEl);

    chartWrap.appendChild(row);
  });

  body.appendChild(chartWrap);

  // Odečty tabulka
  if (odecty && odecty.length > 1) {
    var tblTitle = document.createElement('div');
    tblTitle.style.cssText = 'font-size:0.85rem;font-weight:600;margin:20px 0 8px;';
    tblTitle.textContent = 'Ode\u010dty';
    body.appendChild(tblTitle);

    var table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.82rem;';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Datum', 'Stav (' + unit + ')'].forEach(function(h) {
      var th = document.createElement('th');
      th.style.cssText = 'text-align:left;padding:6px 8px;border-bottom:2px solid var(--border);font-size:0.82rem;color:var(--text-light);';
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    odecty.forEach(function(o) {
      var tr = document.createElement('tr');
      var tdD = document.createElement('td');
      tdD.style.cssText = 'padding:5px 8px;border-bottom:1px solid var(--border-light);';
      tdD.textContent = new Date(o.datum + 'T00:00:00').toLocaleDateString('cs-CZ');
      var tdV = document.createElement('td');
      tdV.style.cssText = 'padding:5px 8px;border-bottom:1px solid var(--border-light);font-weight:500;';
      tdV.textContent = parseFloat(o.hodnota).toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
      tr.appendChild(tdD);
      tr.appendChild(tdV);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);
  }
}
