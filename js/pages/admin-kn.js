/* ===== ČÚZK KN — Import jednotek ===== */

function renderKnCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('ČÚZK KN \u2014 Import jednotek z katastru');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Automatické načtení dat o budově, parcelách a jednotkách z Katastru nemovitostí (ČÚZK API KN). '
    + 'Adresa a GPS se doplní z RÚIAN (zdarma).';
  body.appendChild(hint);

  var errBox = makeAdminInfoBox(false);
  var okBox  = makeAdminInfoBox(true);
  body.appendChild(errBox);
  body.appendChild(okBox);

  var statusWrap   = document.createElement('div');
  var buildingWrap = document.createElement('div');
  body.appendChild(statusWrap);
  body.appendChild(buildingWrap);

  var findBtn = document.createElement('button');
  findBtn.className = 'btn btn-secondary';
  findBtn.textContent = 'Vyhledat stavbu v KN';
  body.appendChild(findBtn);

  el.appendChild(card.card);

  function refreshStatus() {
    Api.apiGet('api/kn.php?action=status')
      .then(function(data) { renderKnStatus(statusWrap, data, findBtn); })
      .catch(function(e) { console.error('[KN status]', e); });
  }

  refreshStatus();

  findBtn.addEventListener('click', function() {
    findBtn.disabled = true;
    findBtn.textContent = 'Hledám\u2026';
    hideAdminBox(errBox);
    hideAdminBox(okBox);
    buildingWrap.replaceChildren();

    Api.apiGet('api/kn.php?action=findBuilding')
      .then(function(data) {
        renderBuildingResult(buildingWrap, data, errBox, okBox, statusWrap, findBtn, refreshStatus);
      })
      .catch(function(e) {
        showAdminBox(errBox, e.message || 'Chyba při komunikaci s KN API.');
        findBtn.disabled = false;
        findBtn.textContent = 'Zkusit znovu';
      });
  });
}

/* ===== STATUS BOX ===== */

function renderKnStatus(wrap, data, findBtn) {
  wrap.replaceChildren();
  if (!data.jednotky && !data.lat) return;

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;'
    + 'padding:12px 16px;margin-bottom:16px;font-size:0.88rem;';

  var rows = [];
  if (data.adresa_plna) rows.push(['\uD83D\uDCCD Adresa', data.adresa_plna]);
  if (data.lat && data.lon) rows.push(['\uD83C\uDF10 GPS', parseFloat(data.lat).toFixed(5) + ', ' + parseFloat(data.lon).toFixed(5)]);
  if (data.rok_dokonceni)    rows.push(['\uD83D\uDCC5 Rok dokončení', data.rok_dokonceni]);
  if (data.konstrukce_nazev) rows.push(['\uD83E\uDDF1 Konstrukce', data.konstrukce_nazev]);
  if (data.pocet_podlazi)    rows.push(['\uD83C\uDFD7\uFE0F Počet podlaží', data.pocet_podlazi]);
  if (data.zastavena_plocha) rows.push(['\uD83D\uDCCF Zastavěná plocha', data.zastavena_plocha + '\u00a0m²']);
  if (data.vytah != null)    rows.push(['\uD83D\uDECB\uFE0F Výtah', data.vytah ? 'Ano' : 'Ne']);
  if (data.zpusob_vytapeni)  rows.push(['\uD83D\uDD25 Vytápění', data.zpusob_vytapeni]);
  if (data.jednotky) rows.push(['\uD83C\uDFE0 Jednotky v\u00a0DB', data.jednotky + (data.plomby ? ' (\u26A0\uFE0F ' + data.plomby + ' s\u00a0plombou)' : '')]);
  if (data.parcely)  rows.push(['\uD83D\uDDFA\uFE0F Parcely v\u00a0DB', data.parcely]);
  if (data.last_updated) rows.push(['\uD83D\uDD52 Poslední import', new Date(data.last_updated).toLocaleString('cs-CZ')]);

  rows.forEach(function(r) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:3px;';
    var label = document.createElement('span');
    label.textContent = r[0] + ':';
    label.style.cssText = 'color:var(--text-light);min-width:130px;flex-shrink:0;';
    var val = document.createElement('span');
    val.textContent = r[1];
    val.style.fontWeight = '500';
    row.appendChild(label);
    row.appendChild(val);
    box.appendChild(row);
  });

  // Mapa pokud máme GPS
  if (data.lat && data.lon) {
    var mapWrap = renderMap(data.lat, data.lon, data.adresa_plna || '');
    mapWrap.style.marginTop = '12px';
    box.appendChild(mapWrap);
  }

  wrap.appendChild(box);
  findBtn.textContent = 'Aktualizovat z KN';
}

/* ===== MAPA ===== */

function renderMap(lat, lon, label) {
  var wrap = document.createElement('div');

  // OpenStreetMap iframe embed
  lat = parseFloat(lat); lon = parseFloat(lon);
  var bbox = [lon - 0.003, lat - 0.002, lon + 0.003, lat + 0.002].join('%2C');
  var src  = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox
           + '&layer=mapnik&marker=' + lat + '%2C' + lon;

  var iframe = document.createElement('iframe');
  iframe.src    = src;
  iframe.width  = '100%';
  iframe.height = '240';
  iframe.style.cssText = 'border:1px solid var(--border);border-radius:6px;display:block;';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', 'Poloha budovy');
  wrap.appendChild(iframe);

  var link = document.createElement('a');
  link.href   = 'https://mapy.cz/zakladni?x=' + lon + '&y=' + lat + '&z=17&source=coor&id=' + lon + '%2C' + lat;
  link.target = '_blank';
  link.rel    = 'noopener noreferrer';
  link.textContent = 'Otevřít v Mapy.cz \u2197';
  link.style.cssText = 'font-size:0.82rem;color:var(--text-light);display:inline-block;margin-top:4px;';
  wrap.appendChild(link);

  return wrap;
}

/* ===== VÝSLEDEK FINDBUILDING ===== */

function renderBuildingResult(wrap, data, errBox, okBox, statusWrap, findBtn, refreshStatus) {
  wrap.replaceChildren();
  findBtn.disabled = false;
  findBtn.textContent = 'Aktualizovat z KN';

  // Okamžitě aktualizuj status box (GPS, mapa, adresa)
  if (refreshStatus) refreshStatus();

  var building = data.building;
  if (!building || !building.stavba_id) {
    showAdminBox(errBox, 'Stavba nebyla nalezena v KN.');
    return;
  }

  // Info o budově
  var infoBox = document.createElement('div');
  infoBox.className = 'info-box info-box-success';
  infoBox.style.marginBottom = '14px';

  var adresa = (data.ruian && data.ruian.adresa_plna) ? data.ruian.adresa_plna : null;
  var rows = [
    ['Adresa',         adresa || ((building.obec || '') + (building.cislo_popisne ? ' č.p. ' + building.cislo_popisne : ''))],
    ['Obec',           building.obec          || '\u2014'],
    ['LV stavby',      building.lv            || '\u2014'],
    ['Počet jednotek', building.pocet_jednotek != null ? building.pocet_jednotek : '\u2014'],
  ];
  if (data.ruian && data.ruian.lat) {
    rows.push(['GPS', data.ruian.lat.toFixed(5) + ', ' + data.ruian.lon.toFixed(5)]);
  }
  if (building.plomby_stavba) {
    rows.push(['\u26A0\uFE0F Plomby na stavbě', building.plomby_stavba]);
  }

  var tbl = document.createElement('table');
  tbl.style.cssText = 'border-collapse:collapse;font-size:0.88rem;width:100%;';
  rows.forEach(function(r) {
    var tr = document.createElement('tr');
    var th = document.createElement('td');
    th.textContent = r[0];
    th.style.cssText = 'padding:3px 12px 3px 0;color:var(--text-light);white-space:nowrap;font-weight:500;vertical-align:top;';
    var td = document.createElement('td');
    td.textContent = r[1];
    td.style.cssText = 'padding:3px 0;';
    tr.appendChild(th);
    tr.appendChild(td);
    tbl.appendChild(tr);
  });
  infoBox.appendChild(tbl);
  wrap.appendChild(infoBox);

  // Parcely
  if (data.parcely && data.parcely.length) {
    var parcelyBox = document.createElement('div');
    parcelyBox.style.cssText = 'margin-bottom:14px;';
    var parcelyTitle = document.createElement('div');
    parcelyTitle.textContent = 'Pozemkové parcely (' + data.parcely.length + ')';
    parcelyTitle.style.cssText = 'font-weight:600;font-size:0.88rem;margin-bottom:6px;';
    parcelyBox.appendChild(parcelyTitle);

    var pTbl = document.createElement('table');
    pTbl.style.cssText = 'border-collapse:collapse;font-size:0.85rem;width:100%;';
    var pHead = document.createElement('tr');
    ['Č. parcely', 'Výměra (m²)', 'Druh', 'K.ú.'].forEach(function(h) {
      var th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = 'text-align:left;padding:4px 10px 4px 0;color:var(--text-light);font-weight:600;border-bottom:1px solid var(--border);';
      pHead.appendChild(th);
    });
    pTbl.appendChild(pHead);

    data.parcely.forEach(function(p) {
      var tr = document.createElement('tr');
      [p.cislo, p.vymera != null ? p.vymera : '\u2014', p.druh || '\u2014', p.ku || '\u2014'].forEach(function(v, i) {
        var td = document.createElement('td');
        td.textContent = v;
        td.style.cssText = 'padding:4px 10px 4px 0;border-bottom:1px solid var(--border);'
          + (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
        tr.appendChild(td);
      });
      pTbl.appendChild(tr);
    });
    parcelyBox.appendChild(pTbl);
    wrap.appendChild(parcelyBox);
  }

  // Import tlačítko
  var importBtn = document.createElement('button');
  importBtn.className = 'btn btn-primary';
  importBtn.textContent = 'Importovat jednotky do portálu';
  wrap.appendChild(importBtn);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;font-size:0.82rem;color:var(--text-light);';
  note.textContent = 'Import načte typy, způsoby využití, spoluvlastnické podíly a zkontroluje plomby/zástavy na každé jednotce. Existující záznamy se přepíší.';
  wrap.appendChild(note);

  importBtn.addEventListener('click', function() {
    importBtn.disabled = true;
    importBtn.textContent = 'Importuji\u2026';
    hideAdminBox(errBox);
    hideAdminBox(okBox);

    var jednotkaIds = (building.raw && building.raw.jednotky)
      ? building.raw.jednotky.map(function(j) { return j.id; })
      : [];

    Api.apiPost('api/kn.php?action=importUnits', { stavba_id: building.stavba_id, jednotka_ids: jednotkaIds })
      .then(function(d) {
        var msg = 'Importováno ' + d.imported + ' jednotek';
        if (d.skipped) msg += ', ' + d.skipped + ' se nepodařilo načíst';
        if (d.plomby)  msg += '. \u26A0\uFE0F ' + d.plomby + ' jednotek má aktivní plombu v KN!';
        else           msg += '. Žádné plomby nenalezeny.';
        showAdminBox(d.plomby ? errBox : okBox, msg);
        importBtn.textContent = 'Importovat znovu';
        if (refreshStatus) refreshStatus();
      })
      .catch(function(e) {
        showAdminBox(errBox, e.message || 'Chyba při importu jednotek.');
        importBtn.textContent = 'Importovat jednotky do portálu';
      })
      .finally(function() { importBtn.disabled = false; });
  });
}
