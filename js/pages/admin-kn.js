/* ===== ČÚZK KN — Import jednotek ===== */

function renderKnCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('ČÚZK KN \u2014 Import jednotek z katastru');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Automatické načtení jednotek (bytů a nebytových prostor) z Katastru nemovitostí přes API ČÚZK. '
    + 'Pro vyhledání stavby je nutný kód adresního místa (RÚIAN) — načítá se automaticky z ARES.';
  body.appendChild(hint);

  var errBox = makeAdminInfoBox(false);
  var okBox  = makeAdminInfoBox(true);
  body.appendChild(errBox);
  body.appendChild(okBox);

  // Výsledková sekce
  var buildingWrap = document.createElement('div');
  body.appendChild(buildingWrap);

  var findBtn = document.createElement('button');
  findBtn.className = 'btn btn-secondary';
  findBtn.textContent = 'Vyhledat stavbu v KN';
  body.appendChild(findBtn);

  el.appendChild(card.card);

  findBtn.addEventListener('click', function() {
    findBtn.disabled = true;
    findBtn.textContent = 'Hledám\u2026';
    hideAdminBox(errBox);
    hideAdminBox(okBox);
    buildingWrap.replaceChildren();

    Api.apiGet('api/kn.php?action=findBuilding')
      .then(function(data) {
        renderBuildingResult(buildingWrap, data.building, errBox, okBox);
      })
      .catch(function(e) {
        showAdminBox(errBox, e.message || 'Chyba při komunikaci s KN API.');
      })
      .finally(function() {
        findBtn.disabled = false;
        findBtn.textContent = 'Hledat znovu';
      });
  });
}

function renderBuildingResult(wrap, building, errBox, okBox) {
  wrap.replaceChildren();

  if (!building || !building.stavba_id) {
    showAdminBox(errBox, 'Stavba nebyla nalezena v KN.');
    return;
  }

  var infoBox = document.createElement('div');
  infoBox.className = 'info-box info-box-success';
  infoBox.style.marginBottom = '14px';

  var rows = [
    ['Stavba ID (KN)', building.stavba_id],
    ['Číslo popisné', building.cislo_popisne || '\u2014'],
    ['Obec', building.obec || '\u2014'],
    ['Ulice', building.ulice || '\u2014'],
    ['Počet jednotek', building.pocet_jednotek != null ? building.pocet_jednotek : '(neznámo)'],
    ['LV', building.lv || '\u2014'],
  ];

  var tbl = document.createElement('table');
  tbl.style.cssText = 'border-collapse:collapse;font-size:0.88rem;width:100%;';
  rows.forEach(function(r) {
    var tr = document.createElement('tr');
    var th = document.createElement('td');
    th.textContent = r[0];
    th.style.cssText = 'padding:3px 12px 3px 0;color:var(--text-light);white-space:nowrap;font-weight:500;vertical-align:top;';
    var td = document.createElement('td');
    td.textContent = r[1];
    td.style.cssText = 'padding:3px 0;font-family:monospace;font-size:0.85rem;';
    tr.appendChild(th);
    tr.appendChild(td);
    tbl.appendChild(tr);
  });
  infoBox.appendChild(tbl);
  wrap.appendChild(infoBox);

  var importBtn = document.createElement('button');
  importBtn.className = 'btn btn-primary';
  importBtn.textContent = 'Importovat jednotky do portálu';
  wrap.appendChild(importBtn);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;font-size:0.78rem;color:var(--text-light);';
  note.textContent = 'Importem se načtou čísla jednotek, typy a spoluvlastnické podíly. Vlastníci se importují ručně přes správu vlastníků.';
  wrap.appendChild(note);

  importBtn.addEventListener('click', function() {
    importBtn.disabled = true;
    importBtn.textContent = 'Importuji\u2026';
    hideAdminBox(errBox);
    hideAdminBox(okBox);

    Api.apiPost('api/kn.php?action=importUnits', { stavba_id: building.stavba_id })
      .then(function(data) {
        var msg = 'Hotovo: ' + data.imported + ' jednotek importováno';
        if (data.skipped) msg += ', ' + data.skipped + ' přeskočeno (duplicity)';
        msg += '. Celkem v KN: ' + (data.total || '?') + '.';
        showAdminBox(okBox, msg);
        importBtn.textContent = 'Importovat znovu';
      })
      .catch(function(e) {
        showAdminBox(errBox, e.message || 'Chyba při importu jednotek.');
        importBtn.textContent = 'Importovat jednotky do portálu';
      })
      .finally(function() {
        importBtn.disabled = false;
      });
  });
}
