/* ===== Okolí budovy — Overpass API (OpenStreetMap) ===== */

var OKOLI_KATEGORIE = [
  {
    key:    'mhd',
    label:  'MHD zastávky',
    icon:   '\uD83D\uDE8C',
    match:  function(t) {
      return t.highway === 'bus_stop' || t.railway === 'tram_stop'
          || t.railway === 'station' || t.railway === 'halt';
    },
  },
  {
    key:    'obchody',
    label:  'Obchody',
    icon:   '\uD83D\uDECD',
    match:  function(t) {
      return ['supermarket','convenience','grocery','bakery','butcher','greengrocer']
               .indexOf(t.shop) !== -1;
    },
  },
  {
    key:    'zdravi',
    label:  'Zdrav\xed',
    icon:   '\uD83D\uDC8A',
    match:  function(t) {
      return ['pharmacy','doctors','hospital','clinic'].indexOf(t.amenity) !== -1;
    },
  },
  {
    key:    'banky',
    label:  'Banky & bankomaty',
    icon:   '\uD83C\uDFE6',
    match:  function(t) { return t.amenity === 'bank' || t.amenity === 'atm'; },
  },
  {
    key:    'posta',
    label:  'Po\u0161ta',
    icon:   '\uD83D\uDCEE',
    match:  function(t) { return t.amenity === 'post_office'; },
  },
  {
    key:    'parkovani',
    label:  'Parkovišt\u011b',
    icon:   '\uD83C\uDD7F',
    match:  function(t) { return t.amenity === 'parking'; },
  },
];

function renderOkoliCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Okol\xed budovy');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'MHD, obchody, l\xe9k\xe1rny a dalš\xed m\xedsta v okruhu 600\xa0m. Zdroj: OpenStreetMap.';
  body.appendChild(hint);

  var contentWrap = document.createElement('div');
  body.appendChild(contentWrap);

  var loadBtn = document.createElement('button');
  loadBtn.className = 'btn btn-secondary btn-sm';
  loadBtn.textContent = 'Na\u010d\xedst okol\xed';
  body.appendChild(loadBtn);

  el.appendChild(card.card);

  loadBtn.addEventListener('click', function() {
    loadBtn.disabled = true;
    loadBtn.textContent = 'Na\u010d\xedt\xe1m\u2026';
    okoliLoad(contentWrap, loadBtn);
  });
}

function okoliLoad(contentWrap, loadBtn) {
  Api.apiGet('api/okoli.php')
    .then(function(data) {
      okoliRender(contentWrap, data);
      loadBtn.textContent = 'Aktualizovat';
      loadBtn.disabled = false;
    })
    .catch(function(e) {
      contentWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = e.message || 'Chyba p\u0159i na\u010d\xedt\xe1n\xed dat.';
      contentWrap.appendChild(err);
      loadBtn.textContent = 'Zkusit znovu';
      loadBtn.disabled = false;
    });
}

function okoliRender(wrap, data) {
  wrap.replaceChildren();

  var lat = parseFloat(data.lat);
  var lon = parseFloat(data.lon);
  var elements = data.elements || [];

  // Roztřídění do kategorií
  var grouped = {};
  OKOLI_KATEGORIE.forEach(function(kat) { grouped[kat.key] = []; });

  elements.forEach(function(el) {
    if (!el.tags) return;
    var elLat = parseFloat(el.lat);
    var elLon = parseFloat(el.lon);
    var dist = okoliDist(lat, lon, elLat, elLon);

    OKOLI_KATEGORIE.forEach(function(kat) {
      if (kat.match(el.tags)) {
        grouped[kat.key].push({ el: el, dist: dist });
      }
    });
  });

  var hasAny = OKOLI_KATEGORIE.some(function(kat) { return grouped[kat.key].length > 0; });

  if (!hasAny) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0 0 12px;';
    empty.textContent = 'V okruhu 600\xa0m nebyly nalezeny \u017e\xe1dn\xe9 z\xe1jmov\xe9 body.';
    wrap.appendChild(empty);
    return;
  }

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:10px;';

  OKOLI_KATEGORIE.forEach(function(kat) {
    var items = grouped[kat.key];
    if (!items.length) return;

    // Seřadit podle vzdálenosti
    items.sort(function(a, b) { return a.dist - b.dist; });

    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:12px 14px;';

    var boxHead = document.createElement('div');
    boxHead.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';

    var boxIcon = document.createElement('span');
    boxIcon.textContent = kat.icon;
    boxIcon.style.fontSize = '1.1rem';
    boxHead.appendChild(boxIcon);

    var boxTitle = document.createElement('span');
    boxTitle.style.cssText = 'font-weight:600;font-size:0.88rem;';
    boxTitle.textContent = kat.label;
    boxHead.appendChild(boxTitle);

    var boxCount = document.createElement('span');
    boxCount.style.cssText = 'margin-left:auto;font-size:0.82rem;color:var(--text-light);';
    boxCount.textContent = items.length + '\xa0pol.';
    boxHead.appendChild(boxCount);

    box.appendChild(boxHead);

    // Max 5 položek
    items.slice(0, 5).forEach(function(item) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:baseline;gap:6px;padding:3px 0;border-bottom:1px solid var(--border);font-size:0.82rem;';

      var name = document.createElement('span');
      name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      name.textContent = okoliNazev(item.el.tags) || '\u2014 (bez n\xe1zvu)';
      name.style.color = okoliNazev(item.el.tags) ? '' : 'var(--text-light)';
      row.appendChild(name);

      var distEl = document.createElement('span');
      distEl.style.cssText = 'color:var(--text-light);white-space:nowrap;flex-shrink:0;';
      distEl.textContent = item.dist < 1000
        ? item.dist + '\xa0m'
        : (item.dist / 1000).toFixed(1) + '\xa0km';
      row.appendChild(distEl);

      box.appendChild(row);
    });

    if (items.length > 5) {
      var more = document.createElement('div');
      more.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:5px;';
      more.textContent = '+ dal\u0161\xedch ' + (items.length - 5);
      box.appendChild(more);
    }

    grid.appendChild(box);
  });

  wrap.appendChild(grid);

  var source = document.createElement('div');
  source.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  source.textContent = 'Zdroj: OpenStreetMap / Overpass API \u00b7 Okruh 600\xa0m \u00b7 Data mohou b\xfdt neúpln\xe1.';
  wrap.appendChild(source);
}

function okoliNazev(tags) {
  return tags['name'] || tags['name:cs'] || tags['operator'] || tags['brand'] || '';
}

// Vzdálenost v metrech (Haversine, dostatečná přesnost pro krátké vzdálenosti)
function okoliDist(lat1, lon1, lat2, lon2) {
  var R  = 6371000;
  var dL = (lat2 - lat1) * Math.PI / 180;
  var dl = (lon2 - lon1) * Math.PI / 180;
  var a  = Math.sin(dL / 2) * Math.sin(dL / 2)
         + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
         * Math.sin(dl / 2) * Math.sin(dl / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
