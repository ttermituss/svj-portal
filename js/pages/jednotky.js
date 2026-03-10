/* ===== JEDNOTKY PAGE ===== */

Router.register('jednotky', function(el) {
  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Jednotky';
  var sub = document.createElement('p');
  sub.textContent = 'Přehled bytových a nebytových jednotek';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  var card = document.createElement('div');
  card.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Načítám jednotky\u2026';
  body.appendChild(loading);

  Api.apiGet('api/jednotky.php')
    .then(function(data) {
      body.removeChild(loading);
      if (!data.jednotky || !data.jednotky.length) {
        renderEmpty(body);
      } else {
        renderTable(body, data.jednotky);
      }
    })
    .catch(function(e) {
      loading.textContent = 'Chyba: ' + (e.message || 'Nepodařilo se načíst jednotky.');
      loading.style.color = 'var(--danger)';
    });
});

function renderEmpty(body) {
  var empty = document.createElement('div');
  empty.className = 'empty-state';
  var icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = '\uD83C\uDFE2';
  var msg = document.createElement('p');
  msg.textContent = 'Zatím nejsou importovány žádné jednotky. Správce portálu je může načíst přes Správu portálu → ČÚZK KN.';
  empty.appendChild(icon);
  empty.appendChild(msg);
  body.appendChild(empty);
}

function renderTable(body, jednotky) {
  var cols = ['Číslo jednotky', 'Typ', 'Způsob využití', 'Spoluvl. podíl', 'LV'];

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  cols.forEach(function(c) {
    var th = document.createElement('th');
    th.textContent = c;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');
  jednotky.forEach(function(j) {
    var tr = document.createElement('tr');
    var podil = (j.podil_citatel && j.podil_jmenovatel)
      ? j.podil_citatel + '\u202f/\u202f' + j.podil_jmenovatel
      : '\u2014';
    var vals = [
      j.cislo_jednotky,
      j.typ_jednotky  || '\u2014',
      j.zpusob_vyuziti || '\u2014',
      podil,
      j.lv || '\u2014',
    ];
    vals.forEach(function(v, i) {
      var td = document.createElement('td');
      td.textContent = v;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;font-size:0.78rem;color:var(--text-light);';
  note.textContent = 'Zdroj: Katastr nemovitostí (ČÚZK API KN) \u00b7 ' + jednotky.length + ' jednotek';
  body.appendChild(note);
}
