/* ===== FOND OPRAV — CHARTY + HELPERS =====
 * Vyčleněno z fond-oprav.js pro dodržení limitu 500 řádků.
 * Funkce: fondRenderMonthChart, fondRenderTrendChart, fondFmt, fondFmtShort, fondEmptyCard
 */

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
    barP.title = 'P\u0159\xedjem: ' + fondFmt(m.prijem || 0) + ' K\u010d';

    var barV = document.createElement('div');
    barV.style.cssText = 'width:12px;background:var(--danger);border-radius:3px 3px 0 0;opacity:0.85;';
    barV.style.height = Math.round(((m.vydaj || 0) / maxVal) * 95) + 'px';
    barV.title = 'V\xfddaj: ' + fondFmt(m.vydaj || 0) + ' K\u010d';

    bars.appendChild(barP); bars.appendChild(barV);
    col.appendChild(bars);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);white-space:nowrap;position:absolute;bottom:-18px;';
    var parts = k.split('-');
    lbl.textContent = parts[1] + '/' + parts[0].slice(2);
    col.appendChild(lbl);
    chart.appendChild(col);
  });

  body.appendChild(chart);

  var legenda = document.createElement('div');
  legenda.style.cssText = 'display:flex;gap:14px;margin-top:6px;font-size:0.82rem;color:var(--text-light);';
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

  var W = 400, H = 140, PAD = 30;
  var vals = trend.map(function(t) { return t.zustatek; });
  var minV = Math.min.apply(null, vals);
  var maxV = Math.max.apply(null, vals);
  var range = maxV - minV || 1;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.style.cssText = 'width:100%;height:auto;';

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
    label.textContent = fondFmtShort(minV + range * (g / 4));
    svg.appendChild(label);
  }

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
