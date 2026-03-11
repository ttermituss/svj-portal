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

  var user = Auth.getUser();
  var isPriv = user && (user.role === 'admin' || user.role === 'vybor');

  Api.apiGet('api/jednotky.php')
    .then(function(data) {
      body.removeChild(loading);
      if (!data.jednotky || !data.jednotky.length) {
        renderEmpty(body);
      } else {
        renderTable(body, data.jednotky, isPriv);
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

function renderTable(body, jednotky, isPriv) {
  var svj = Auth.getSvj() || {};

  var plombyCount = jednotky.filter(function(j) { return j.plomba_aktivni; }).length;
  if (plombyCount && isPriv) {
    var warn = document.createElement('div');
    warn.className = 'info-box info-box-danger';
    warn.style.marginBottom = '14px';
    warn.textContent = '\u26A0\uFE0F Pozor: ' + plombyCount + ' jednotek má aktivní plombu v Katastru nemovitostí. Doporučujeme prověřit.';
    body.appendChild(warn);
  }

  // Tlačítka: tisk QR + export
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:12px;';

  var printBtn = document.createElement('button');
  printBtn.className = 'btn btn-secondary';
  printBtn.style.cssText = 'font-size:0.85rem;';
  printBtn.textContent = '\uD83D\uDCF1 Tisknout QR kódy';
  printBtn.addEventListener('click', function() { jednotkyPrintQr(jednotky, svj); });
  actions.appendChild(printBtn);

  ['xlsx', 'csv'].forEach(function(fmt) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.cssText = 'font-size:0.82rem;';
    btn.textContent = fmt === 'xlsx' ? '\uD83D\uDCCA Export XLSX' : '\uD83D\uDCC4 Export CSV';
    btn.addEventListener('click', function() {
      window.location.href = 'api/export.php?type=jednotky&format=' + fmt;
    });
    actions.appendChild(btn);
  });

  body.appendChild(actions);

  var cols = ['Č. j.', 'Využití', 'Podíl', 'LV', 'K.ú.', 'QR'];
  if (isPriv) cols.push('');

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  cols.forEach(function(c) {
    var th = document.createElement('th');
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);' +
                       'color:var(--text-light);font-weight:600;white-space:nowrap;';
    if (c === '') {
      var icon = document.createElement('span');
      icon.textContent = '\u26A0\uFE0F';
      icon.title = 'Plomba v KN — pro aktuální stav proveďte Aktualizaci z KN ve Správě portálu';
      icon.style.cssText = 'cursor:help;opacity:0.5;font-size:0.9em;';
      th.appendChild(icon);
    } else {
      th.textContent = c;
    }
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');
  jednotky.forEach(function(j) {
    var tr = document.createElement('tr');
    if (isPriv && j.plomba_aktivni) tr.style.background = 'var(--danger-bg, rgba(220,53,69,0.06))';

    var podil = (j.podil_citatel && j.podil_jmenovatel)
      ? j.podil_citatel + '\u202f/\u202f' + j.podil_jmenovatel
      : '\u2014';

    var vals = [
      j.cislo_jednotky,
      j.zpusob_vyuziti || j.typ_jednotky || '\u2014',
      podil,
      j.lv || '\u2014',
      j.katastralni_uzemi || '\u2014',
    ];
    vals.forEach(function(v, i) {
      var td = document.createElement('td');
      td.textContent = v;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);' +
        (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });

    // QR tlačítko
    var tdQr = document.createElement('td');
    tdQr.style.cssText = 'padding:6px 12px;border-bottom:1px solid var(--border);';
    var qrBtn = document.createElement('button');
    qrBtn.className = 'btn btn-secondary';
    qrBtn.style.cssText = 'font-size:0.75rem;padding:4px 8px;min-height:32px;';
    qrBtn.textContent = 'QR';
    qrBtn.title = 'Zobrazit QR kód jednotky';
    qrBtn.addEventListener('click', function() {
      jednotkyShowQrModal(j, svj);
    });
    tdQr.appendChild(qrBtn);
    tr.appendChild(tdQr);

    // Plomba badge — jen pro admin/vybor
    if (isPriv) {
      var tdPlomba = document.createElement('td');
      tdPlomba.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
      if (j.plomba_aktivni) {
        var badge = document.createElement('span');
        badge.className = 'badge badge-danger';
        badge.textContent = '\u26A0\uFE0F Plomba';
        badge.title = 'Na této jednotce je aktivní plomba v Katastru nemovitostí';
        tdPlomba.appendChild(badge);
      }
      tr.appendChild(tdPlomba);
    }

    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:10px;font-size:0.78rem;color:var(--text-light);';
  note.textContent = 'Zdroj: Katastr nemovitostí (ČÚZK API KN) \u00b7 ' + jednotky.length + ' jednotek';
  body.appendChild(note);
}

function jednotkyQrText(j, svj) {
  var lines = [
    'Jednotka \u010d. ' + (j.cislo_jednotky || ''),
    'SVJ: ' + (svj.nazev || ''),
  ];
  if (j.katastralni_uzemi) lines.push('K.\u00fa.: ' + j.katastralni_uzemi);
  if (j.lv) lines.push('LV: ' + j.lv);
  if (j.zpusob_vyuziti || j.typ_jednotky) lines.push('Vyu\u017eit\xed: ' + (j.zpusob_vyuziti || j.typ_jednotky));
  return lines.join('\n');
}

function jednotkyQrUrl(text, size) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || '250x250') +
    '&data=' + encodeURIComponent(text);
}

function jednotkyShowQrModal(j, svj) {
  var text = jednotkyQrText(j, svj);
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:28px 32px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.25);';

  var title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 4px;font-size:1.1rem;';
  title.textContent = 'QR kód — jednotka \u010d. ' + (j.cislo_jednotky || '');
  modal.appendChild(title);

  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:16px;';
  sub.textContent = svj.nazev || '';
  modal.appendChild(sub);

  var img = document.createElement('img');
  img.src = jednotkyQrUrl(text, '250x250');
  img.alt = 'QR kód jednotky ' + (j.cislo_jednotky || '');
  img.style.cssText = 'width:200px;height:200px;border-radius:8px;border:1px solid var(--border);';
  modal.appendChild(img);

  var info = document.createElement('pre');
  info.style.cssText = 'text-align:left;font-size:0.75rem;color:var(--text-light);margin:12px 0 0;background:var(--bg-hover);border-radius:6px;padding:8px 12px;white-space:pre-wrap;word-break:break-word;';
  info.textContent = text;
  modal.appendChild(info);

  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:16px;';

  var printBtn = document.createElement('button');
  printBtn.className = 'btn btn-secondary';
  printBtn.textContent = '\uD83D\uDDA8\uFE0F Tisknout';
  printBtn.addEventListener('click', function() {
    jednotkyPrintQr([j], svj);
  });
  btns.appendChild(printBtn);

  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Zavřít';
  closeBtn.addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
  btns.appendChild(closeBtn);

  modal.appendChild(btns);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

function jednotkyPrintQr(jednotky, svj) {
  var items = jednotky.map(function(j) {
    var text = jednotkyQrText(j, svj);
    var url = jednotkyQrUrl(text, '180x180');
    return '<div style="display:inline-block;width:200px;margin:12px;text-align:center;vertical-align:top;page-break-inside:avoid;">' +
      '<img src="' + url + '" width="180" height="180" style="border:1px solid #ccc;border-radius:4px;" />' +
      '<div style="font-size:12px;font-weight:600;margin-top:6px;">' + escHtml(j.cislo_jednotky || '') + '</div>' +
      '<div style="font-size:10px;color:#666;margin-top:2px;">' + escHtml(j.katastralni_uzemi || '') + '</div>' +
      '</div>';
  }).join('');

  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR k\xf3dy jednotek</title>' +
    '<style>body{font-family:sans-serif;padding:20px;}h2{margin-bottom:4px;}p{color:#666;font-size:13px;margin-bottom:20px;}</style></head>' +
    '<body><h2>QR k\xf3dy jednotek</h2><p>' + escHtml(svj.nazev || '') + '</p>' +
    '<div>' + items + '</div></body></html>');
  win.document.close();
  win.onload = function() { win.print(); };
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
