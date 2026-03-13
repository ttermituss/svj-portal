/* ===== Fond oprav — READ-ONLY karta pro O domě (všichni vlastníci) ===== */

function renderFondOpravCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Fond oprav');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Z\u016fstatek a p\u0159ehled hospoda\u0159en\xed fondu oprav.';
  body.appendChild(hint);

  var statsWrap = document.createElement('div');
  body.appendChild(statsWrap);

  var chartWrap = document.createElement('div');
  body.appendChild(chartWrap);

  var isPriv = isPrivileged(user);
  if (isPriv) {
    var link = document.createElement('a');
    link.href = '#fond-oprav';
    link.className = 'btn btn-primary btn-sm';
    link.style.marginTop = '12px';
    link.textContent = 'Otev\u0159\xedt podrobn\xfd p\u0159ehled \u2192';
    body.appendChild(link);
  }

  el.appendChild(card.card);

  Api.apiGet('api/fond_oprav.php?action=stats')
    .then(function(data) {
      fondMiniStats(statsWrap, data);
      fondMiniChart(chartWrap, data.mesice || {});
    })
    .catch(function() {
      statsWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed fondu oprav.';
      statsWrap.appendChild(err);
    });
}

function fondMiniStats(wrap, data) {
  wrap.replaceChildren();
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;';

  [
    { label: 'Z\u016fstatek', value: data.zustatek, color: data.zustatek >= 0 ? 'var(--accent)' : 'var(--danger)' },
    { label: 'P\u0159\xedjmy celkem', value: data.prijem_celkem, color: 'var(--accent)' },
    { label: 'V\xfddaje celkem', value: data.vydaj_celkem, color: 'var(--danger)' },
  ].forEach(function(item) {
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:14px 16px;';
    var val = document.createElement('div');
    val.style.cssText = 'font-size:1.2rem;font-weight:700;color:' + item.color + ';';
    val.textContent = fondMiniFormat(item.value) + '\xa0K\u010d';
    box.appendChild(val);
    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:3px;';
    lbl.textContent = item.label;
    box.appendChild(lbl);
    grid.appendChild(box);
  });

  wrap.appendChild(grid);
}

function fondMiniChart(wrap, mesice) {
  wrap.replaceChildren();
  var keys = Object.keys(mesice).sort();
  if (!keys.length) return;
  if (keys.length > 12) keys = keys.slice(keys.length - 12);

  var maxVal = 0;
  keys.forEach(function(k) { maxVal = Math.max(maxVal, mesice[k].prijem || 0, mesice[k].vydaj || 0); });
  if (!maxVal) return;

  var chart = document.createElement('div');
  chart.style.cssText = 'display:flex;align-items:flex-end;gap:6px;height:80px;overflow-x:auto;padding-bottom:20px;position:relative;';

  keys.forEach(function(k) {
    var m = mesice[k];
    var col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:28px;position:relative;';
    var bars = document.createElement('div');
    bars.style.cssText = 'display:flex;gap:2px;align-items:flex-end;height:70px;';

    var barP = document.createElement('div');
    barP.style.cssText = 'width:10px;background:var(--accent);border-radius:2px 2px 0 0;opacity:0.85;';
    barP.style.height = Math.round(((m.prijem || 0) / maxVal) * 70) + 'px';
    barP.title = 'P\u0159\xedjem: ' + fondMiniFormat(m.prijem || 0) + ' K\u010d';

    var barV = document.createElement('div');
    barV.style.cssText = 'width:10px;background:var(--danger);border-radius:2px 2px 0 0;opacity:0.85;';
    barV.style.height = Math.round(((m.vydaj || 0) / maxVal) * 70) + 'px';
    barV.title = 'V\xfddaj: ' + fondMiniFormat(m.vydaj || 0) + ' K\u010d';

    bars.appendChild(barP); bars.appendChild(barV);
    col.appendChild(bars);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);white-space:nowrap;position:absolute;bottom:-18px;';
    var parts = k.split('-');
    lbl.textContent = parts[1] + '/' + parts[0].slice(2);
    col.appendChild(lbl);
    chart.appendChild(col);
  });

  wrap.appendChild(chart);

  var legenda = document.createElement('div');
  legenda.style.cssText = 'display:flex;gap:14px;margin-top:4px;font-size:0.82rem;color:var(--text-light);';
  [['var(--accent)', 'P\u0159\xedjmy'], ['var(--danger)', 'V\xfddaje']].forEach(function(l) {
    var leg = document.createElement('div');
    leg.style.cssText = 'display:flex;align-items:center;gap:4px;';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:10px;height:10px;border-radius:2px;background:' + l[0] + ';opacity:0.85;';
    var txt = document.createElement('span');
    txt.textContent = l[1];
    leg.appendChild(dot); leg.appendChild(txt); legenda.appendChild(leg);
  });
  wrap.appendChild(legenda);
}

// fondMiniFormat — alias pro zpětnou kompatibilitu (globální formatCzk v ui.js)
var fondMiniFormat = formatCzk;
