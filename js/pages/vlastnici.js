/* ===== VLASTNÍCI PAGE ===== */

Router.register('vlastnici', function(el) {
  var user   = Auth.getUser();
  var isPriv = isPrivileged(user);

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Vlastníci';
  var sub = document.createElement('p');
  sub.textContent = 'Registrovaní členové SVJ a evidence dalších vlastníků';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // Karta: registrovaní
  var card = document.createElement('div');
  card.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  var loading = makeLoadingEl();
  body.appendChild(loading);

  // Karta: neregistrovaní
  var cardExt = document.createElement('div');
  cardExt.className = 'card';
  var hdrExt = document.createElement('div');
  hdrExt.className = 'card-header';
  var h2Ext = document.createElement('h2');
  h2Ext.textContent = 'Ostatní vlastníci';
  hdrExt.appendChild(h2Ext);
  cardExt.appendChild(hdrExt);
  var bodyExt = document.createElement('div');
  bodyExt.className = 'card-body';
  cardExt.appendChild(bodyExt);
  el.appendChild(cardExt);

  var loadingExt = makeLoadingEl();
  bodyExt.appendChild(loadingExt);

  // Paralelní načítání
  Promise.all([
    Api.apiGet('api/vlastnici.php'),
    Api.apiGet('api/vlastnici_ext.php?action=list'),
  ]).then(function(results) {
    body.removeChild(loading);
    bodyExt.removeChild(loadingExt);

    var vlastnici    = results[0].vlastnici    || [];
    var vlastniciExt = results[1].vlastnici_ext || [];

    if (!vlastnici.length) {
      renderEmptyReg(body);
    } else {
      renderTableReg(body, vlastnici, isPriv);
    }

    if (!vlastniciExt.length) {
      var emptyMsg = document.createElement('p');
      emptyMsg.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
      emptyMsg.textContent = 'Žádní neregistrovaní vlastníci. Správce je může přidat ve Správě portálu.';
      bodyExt.appendChild(emptyMsg);
    } else {
      renderTableExt(bodyExt, vlastniciExt, isPriv);
    }
  }).catch(function(e) {
    loading.textContent = 'Chyba: ' + (e.message || 'Nepodařilo se načíst data.');
    loading.style.color = 'var(--danger)';
    loadingExt.style.display = 'none';
  });
});

/* ===== REGISTROVANÍ VLASTNÍCI ===== */

function renderEmptyReg(body) {
  body.appendChild(makeEmptyState('\uD83D\uDC65', 'Zatím nejsou registrováni žádní členové SVJ. Správce může pozvat vlastníky přes Správu portálu.'));
}

function exportVlastnici(format) {
  window.location.href = 'api/export.php?type=vlastnici&format=' + format;
}

function renderTableReg(body, vlastnici, isPriv) {
  if (isPriv) {
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px;';
    makeExportButtons(actions, 'vlastnici', 'btn btn-secondary');
    body.appendChild(actions);
  }

  var cols = ['Jméno', 'Jednotka', 'Role', 'Registrace'];
  if (isPriv) { cols.splice(1, 0, 'Telefon', 'E-mail'); cols.push(''); }

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

  var roleLabels = { admin: 'Správce', vybor: 'Výbor', vlastnik: 'Vlastník' };

  var tbody = document.createElement('tbody');
  vlastnici.forEach(function(v) {
    var tr = document.createElement('tr');

    var cells = [
      (v.jmeno || '') + ' ' + (v.prijmeni || ''),
    ];
    if (isPriv) {
      cells.push(v.telefon || '\u2014');
      cells.push(v.email   || '\u2014');
    }
    cells.push(v.cislo_jednotky || '\u2014');
    cells.push(roleLabels[v.role] || v.role);
    cells.push(v.created_at ? new Date(v.created_at).toLocaleDateString('cs-CZ') : '\u2014');

    cells.forEach(function(val, i) {
      var td = document.createElement('td');
      td.textContent = val;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });

    // ISIR — jen pro admin/výbor
    if (isPriv) {
      var tdIsir = document.createElement('td');
      tdIsir.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;';
      if (v.jmeno || v.prijmeni) {
        var link = document.createElement('a');
        link.href = 'https://isir.justice.cz/isir/usl/richtext.do'
          + '?dotaz.jmeno=' + encodeURIComponent(v.jmeno || '')
          + '&dotaz.prijmeni=' + encodeURIComponent(v.prijmeni || '');
        link.target = '_blank';
        link.rel    = 'noopener noreferrer';
        link.textContent = '\u2696\uFE0F ISIR';
        link.title  = 'Ověřit v Insolvenčním rejstříku (justice.cz)';
        link.style.cssText = 'font-size:0.82rem;color:var(--text-light);text-decoration:none;' +
          'border:1px solid var(--border);border-radius:4px;padding:5px 10px;white-space:nowrap;';
        tdIsir.appendChild(link);
      }
      tr.appendChild(tdIsir);
    }

    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  if (isPriv) {
    var note = document.createElement('div');
    note.style.cssText = 'margin-top:10px;font-size:0.82rem;color:var(--text-light);';
    note.textContent = '\u2696\uFE0F ISIR — odkaz otevře Insolvenční rejstřík se předvyplněným jménem. Pouze pro interní potřebu výboru.';
    body.appendChild(note);
  }

  var count = document.createElement('div');
  count.style.cssText = 'margin-top:' + (isPriv ? '4px' : '10px') + ';font-size:0.82rem;color:var(--text-light);';
  count.textContent = vlastnici.length + ' registrovaných členů SVJ';
  body.appendChild(count);
}

/* ===== NEREGISTROVANÍ VLASTNÍCI ===== */

function renderTableExt(body, list, isPriv) {
  var cols = ['Jméno', 'Jednotka'];
  if (isPriv) cols.splice(1, 0, 'Telefon', 'E-mail');
  cols.push('Poznámka');

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
  list.forEach(function(v) {
    var tr = document.createElement('tr');
    var cells = [(((v.jmeno || '') + ' ' + (v.prijmeni || '')).trim()) || '\u2014'];
    if (isPriv) { cells.push(v.telefon || '\u2014'); cells.push(v.email || '\u2014'); }
    cells.push(v.cislo_jednotky || '\u2014');
    cells.push(v.poznamka       || '\u2014');

    cells.forEach(function(val, i) {
      var td = document.createElement('td');
      td.textContent = val;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;font-size:0.82rem;color:var(--text-light);';
  note.textContent = list.length + ' evidovaných vlastníků \u00b7 Správa ve Správě portálu';
  body.appendChild(note);
}
