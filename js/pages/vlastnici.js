/* ===== VLASTNICI PAGE ===== */

Router.register('vlastnici', function(el) {
  var user   = Auth.getUser();
  var isPriv = user && (user.role === 'admin' || user.role === 'vybor');

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Vlastníci';
  var sub = document.createElement('p');
  sub.textContent = 'Seznam členů SVJ registrovaných v portálu';
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
  loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  body.appendChild(loading);

  Api.apiGet('api/vlastnici.php')
    .then(function(data) {
      body.removeChild(loading);
      if (!data.vlastnici || !data.vlastnici.length) {
        renderEmpty(body);
      } else {
        renderTable(body, data.vlastnici, isPriv);
      }
    })
    .catch(function(e) {
      loading.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst vlastn\u00edky.');
      loading.style.color = 'var(--danger)';
    });
});

function renderEmpty(body) {
  var empty = document.createElement('div');
  empty.className = 'empty-state';
  var icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = '\uD83D\uDC65';
  var msg = document.createElement('p');
  msg.textContent = 'Zat\u00edm nejsou registrov\u00e1ni \u017e\u00e1dn\u00ed \u010dlenov\u00e9 SVJ. Spr\u00e1vce m\u016f\u017ee pozvat vlastn\u00edky p\u0159es Spr\u00e1vu port\u00e1lu.';
  empty.appendChild(icon);
  empty.appendChild(msg);
  body.appendChild(empty);
}

function renderTable(body, vlastnici, isPriv) {
  var cols = ['Jm\u00e9no', 'E-mail', 'Role', 'Registrace'];
  if (isPriv) cols.push('');

  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.9rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  cols.forEach(function(c) {
    var th = document.createElement('th');
    th.textContent = c;
    th.style.cssText = 'text-align:left;padding:8px 12px;border-bottom:2px solid var(--border);'
      + 'color:var(--text-light);font-weight:600;white-space:nowrap;';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  var roleLabels = { admin: 'Správce', vybor: 'Výbor', vlastnik: 'Vlastník' };

  var tbody = document.createElement('tbody');
  vlastnici.forEach(function(v) {
    var tr = document.createElement('tr');

    var vals = [
      (v.jmeno || '') + ' ' + (v.prijmeni || ''),
      isPriv ? (v.email || '\u2014') : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
      roleLabels[v.role] || v.role,
      v.created_at ? new Date(v.created_at).toLocaleDateString('cs-CZ') : '\u2014',
    ];

    vals.forEach(function(val, i) {
      var td = document.createElement('td');
      td.textContent = val;
      td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);'
        + (i === 0 ? 'font-weight:500;' : 'color:var(--text-light);');
      tr.appendChild(td);
    });

    // ISIR odkaz — jen pro admin/výbor
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
        link.title  = 'Ov\u011b\u0159it v Insolven\u010dn\u00edm rejst\u0159\u00edku (justice.cz)';
        link.style.cssText = 'font-size:0.8rem;color:var(--text-light);text-decoration:none;'
          + 'border:1px solid var(--border);border-radius:4px;padding:2px 7px;white-space:nowrap;';
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
    note.style.cssText = 'margin-top:10px;font-size:0.78rem;color:var(--text-light);';
    note.textContent = '\u2696\uFE0F ISIR — odkaz otev\u0159e Insolven\u010dn\u00ed rejst\u0159\u00edk se p\u0159edvypln\u011bn\u00fdm jm\u00e9nem. Pouze pro interní potřebu výboru.';
    body.appendChild(note);
  }

  var count = document.createElement('div');
  count.style.cssText = 'margin-top:' + (isPriv ? '4px' : '10px') + ';font-size:0.78rem;color:var(--text-light);';
  count.textContent = vlastnici.length + ' registrovan\u00fdch \u010dlen\u016f SVJ';
  body.appendChild(count);
}
