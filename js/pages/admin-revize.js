/* ===== Evidence revizí a kontrol ===== */

var REVIZE_TYPY = [
  { value: 'vytah',     label: 'V\xfdtah',              interval: 36, icon: '\uD83D\uDEE0' },
  { value: 'elektro',   label: 'Elektroinstalace',      interval: 60, icon: '\u26A1' },
  { value: 'plyn',      label: 'Plyn',                  interval: 36, icon: '\uD83D\uDD25' },
  { value: 'hromosvod', label: 'Hromosvod',             interval: 60, icon: '\u26C8' },
  { value: 'hasici',    label: 'Hasi\u010d\xed p\u0159\xedstroje', interval: 12, icon: '\uD83E\uDDEF' },
  { value: 'jine',      label: 'Jin\xe9',               interval: null, icon: '\uD83D\uDD27' },
];

function revizeTypLabel(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.label : typ;
}
function revizeTypIcon(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.icon : '\uD83D\uDD27';
}
function revizeDefaultInterval(typ) {
  var t = REVIZE_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.interval : null;
}

/* Sdílený cache kontaktů pro selecty */
var _revKontaktyCache = null;
function revizeLoadKontakty() {
  if (_revKontaktyCache) return Promise.resolve(_revKontaktyCache);
  return Api.apiGet('api/kontakty.php?action=list').then(function(d) {
    _revKontaktyCache = d.kontakty || [];
    return _revKontaktyCache;
  }).catch(function() { return []; });
}

/* ── Mini karta pro stránku O domě (read-only) ───── */
function renderRevizeMiniCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Evidence reviz\xed');
  var body = card.body;

  var listWrap = document.createElement('div');
  body.appendChild(listWrap);

  Api.apiGet('api/revize.php?action=list')
    .then(function(data) {
      var items = data.revize || [];
      if (!items.length) {
        var empty = document.createElement('p');
        empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
        empty.textContent = '\u017d\xe1dn\xe9 revize.';
        listWrap.appendChild(empty);
        return;
      }
      items.forEach(function(rev) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;' +
          'border-bottom:1px solid var(--border);font-size:0.9rem;';

        var icon = document.createElement('span');
        icon.textContent = revizeTypIcon(rev.typ);
        icon.style.cssText = 'font-size:1.1rem;flex-shrink:0;';
        row.appendChild(icon);

        var name = document.createElement('span');
        name.style.cssText = 'flex:1;min-width:0;';
        name.textContent = rev.nazev;
        row.appendChild(name);

        var status = revizeStatus(rev.datum_pristi);
        var badge = document.createElement('span');
        badge.style.cssText = 'padding:4px 10px;border-radius:12px;font-size:0.82rem;font-weight:600;color:#fff;flex-shrink:0;';
        if (status === 'expired') { badge.style.background = 'var(--danger)'; badge.textContent = 'Prohl\xe1\u0161l\xe1'; }
        else if (status === 'warning') { badge.style.background = 'var(--warning-dark, #f08600)'; badge.textContent = 'Brzy'; }
        else { badge.style.background = 'var(--accent)'; badge.textContent = 'OK'; }
        row.appendChild(badge);

        listWrap.appendChild(row);
      });
    })
    .catch(function() {});

  var link = document.createElement('a');
  link.href = '#revize';
  link.className = 'btn btn-secondary btn-sm';
  link.style.marginTop = '12px';
  link.textContent = '\uD83D\uDD27 Zobrazit detail reviz\xed';
  body.appendChild(link);

  el.appendChild(card.card);
}

function revizeLoad(listWrap, formWrap, user) {
  listWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/revize.php?action=list')
    .then(function(data) { revizeRenderList(listWrap, formWrap, data.revize, user); })
    .catch(function() {
      listWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed reviz\xed.';
      listWrap.appendChild(err);
    });
}

function revizeRenderList(listWrap, formWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = isPrivileged(user);

  if (!items.length) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0 0 4px;';
    empty.textContent = 'Zat\xedm nejsou evidov\xe1ny \u017e\xe1dn\xe9 revize.';
    listWrap.appendChild(empty);
    return;
  }

  items.forEach(function(rev) {
    listWrap.appendChild(revizeMakeRow(rev, isPriv, listWrap, formWrap, user));
  });
}

function revizeMakeRow(rev, isPriv, listWrap, formWrap, user) {
  var status = revizeStatus(rev.datum_pristi);

  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:12px 0;' +
    'border-bottom:1px solid var(--border);flex-wrap:wrap;';

  // Ikona
  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = 'font-size:1.4rem;flex-shrink:0;width:36px;text-align:center;padding-top:2px;';
  iconWrap.textContent = revizeTypIcon(rev.typ);
  row.appendChild(iconWrap);

  // Info
  var info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:180px;';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  nameEl.textContent = rev.nazev;
  info.appendChild(nameEl);

  var typEl = document.createElement('div');
  typEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:1px;';
  typEl.textContent = revizeTypLabel(rev.typ);
  info.appendChild(typEl);

  var datesEl = document.createElement('div');
  datesEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  datesEl.textContent = 'Naposledy: ' + formatDatum(rev.datum_posledni);
  if (rev.interval_mesice) {
    datesEl.textContent += ' \u00b7 Interval: ' + rev.interval_mesice + ' m\u011bs.';
  }
  info.appendChild(datesEl);

  // Kontakt
  if (rev.kontakt_nazev) {
    var kontEl = document.createElement('div');
    kontEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
    kontEl.textContent = '\uD83D\uDCDE ' + rev.kontakt_nazev;
    info.appendChild(kontEl);
  }

  // Náklady
  if (rev.naklady && parseFloat(rev.naklady) > 0) {
    var nakEl = document.createElement('div');
    nakEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
    nakEl.textContent = '\uD83D\uDCB0 ' + parseFloat(rev.naklady).toLocaleString('cs-CZ') + ' K\u010d';
    info.appendChild(nakEl);
  }

  if (rev.poznamka) {
    var pozEl = document.createElement('div');
    pozEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:3px;';
    pozEl.textContent = rev.poznamka;
    info.appendChild(pozEl);
  }

  row.appendChild(info);

  // Status badge + akce
  var rightCol = document.createElement('div');
  rightCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;';

  if (rev.datum_pristi) {
    var badge = document.createElement('span');
    badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:20px;' +
      'font-size:0.82rem;font-weight:600;white-space:nowrap;';
    if (status === 'expired') {
      badge.style.background = 'var(--danger)'; badge.style.color = '#fff';
      badge.textContent = '\u26A0 Prohl\xe1\u0161l\xe1!';
    } else if (status === 'warning') {
      badge.style.background = 'var(--warning-dark, #f08600)'; badge.style.color = '#fff';
      badge.textContent = '\u26A0 Brzy vypr\u0161\xed';
    } else {
      badge.style.background = 'var(--accent)'; badge.style.color = '#fff';
      badge.textContent = '\u2713 OK';
    }
    rightCol.appendChild(badge);

    var pristiEl = document.createElement('div');
    pristiEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);text-align:right;';
    pristiEl.textContent = 'P\u0159\xed\u0161t\xed: ' + formatDatum(rev.datum_pristi);
    rightCol.appendChild(pristiEl);
  }

  // Akce
  var akceRow = document.createElement('div');
  akceRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;';

  if (rev.soubor_nazev) {
    var dlBtn = document.createElement('a');
    dlBtn.className = 'btn btn-secondary btn-sm';
    dlBtn.textContent = '\uD83D\uDCC4 PDF';
    dlBtn.href = 'api/revize.php?action=download&id=' + rev.id;
    dlBtn.target = '_blank';
    akceRow.appendChild(dlBtn);
  }

  // Historie tlačítko
  var histCount = parseInt(rev.historie_pocet) || 0;
  var histBtn = document.createElement('button');
  histBtn.className = 'btn btn-secondary btn-sm';
  histBtn.textContent = '\uD83D\uDCC5 Historie' + (histCount > 0 ? ' (' + histCount + ')' : '');
  histBtn.addEventListener('click', function() {
    revHistShowModal(rev, user, function() { revizeLoad(listWrap, formWrap, user); });
  });
  akceRow.appendChild(histBtn);

  if (isPriv) {
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      revizeShowForm(formWrap, rev, listWrap, user, null);
    });
    akceRow.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal(
        'Smazat revizi?',
        'Odstra\u010d\xed z\xe1znam \u201e' + rev.nazev + '\u201c v\u010detn\u011b historie a PDF.',
        function() {
          Api.apiPost('api/revize.php?action=delete&id=' + rev.id, {})
            .then(function() {
              showToast('Revize smaz\xe1na');
              revizeLoad(listWrap, formWrap, user);
            })
            .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
        }
      );
    });
    akceRow.appendChild(delBtn);
  }

  rightCol.appendChild(akceRow);
  row.appendChild(rightCol);
  return row;
}

// status: 'ok' | 'warning' (< 60 dní) | 'expired'
function revizeStatus(datumPristi) {
  var dni = daysUntil(datumPristi);
  if (dni === null) return 'ok';
  if (dni < 0)   return 'expired';
  if (dni <= 60) return 'warning';
  return 'ok';
}
