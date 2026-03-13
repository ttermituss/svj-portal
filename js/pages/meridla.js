/* ===== Měřidla — stránka #meridla ===== */

var MER_TYPY = [
  { value: 'voda_studena', label: 'Studen\xe1 voda', icon: '\uD83D\uDCA7', unit: 'm\u00b3' },
  { value: 'voda_tepla',   label: 'Tepl\xe1 voda',   icon: '\uD83C\uDF21', unit: 'm\u00b3' },
  { value: 'plyn',         label: 'Plyn',             icon: '\uD83D\uDD25', unit: 'm\u00b3' },
  { value: 'elektrina',    label: 'Elekt\u0159ina',   icon: '\u26A1',       unit: 'kWh' },
  { value: 'teplo',        label: 'Teplo',            icon: '\u2668\uFE0F', unit: 'GJ' },
  { value: 'jine',         label: 'Jin\xe9',          icon: '\uD83D\uDD27', unit: '' },
];

function merTypInfo(typ) {
  return MER_TYPY.find(function(t) { return t.value === typ; }) || MER_TYPY[5];
}

function merCejchStatus(datumPristi) {
  if (!datumPristi) return 'ok';
  var dt = new Date(datumPristi);
  var dnes = new Date(); dnes.setHours(0,0,0,0);
  var dni = Math.floor((dt - dnes) / 86400000);
  if (dni < 0) return 'expired';
  if (dni <= 90) return 'warning';
  return 'ok';
}

Router.register('meridla', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { el.textContent = 'Nen\xed p\u0159i\u0159azeno SVJ.'; return; }

  var isPriv = user.role === 'admin' || user.role === 'vybor';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

  var title = document.createElement('h1');
  title.style.cssText = 'margin:0;font-size:1.5rem;';
  title.textContent = '\uD83D\uDCA7 M\u011b\u0159idla a ode\u010dty';
  header.appendChild(title);

  if (isPriv) {
    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ P\u0159idat m\u011b\u0159idlo';
    addBtn.addEventListener('click', function() {
      merShowModal(null, user, function() { merLoadList(listWrap, user); });
    });
    btnGroup.appendChild(addBtn);

    var batchBtn = document.createElement('button');
    batchBtn.className = 'btn btn-secondary';
    batchBtn.textContent = '\uD83D\uDCCB Hromadn\u00fd ode\u010det';
    batchBtn.addEventListener('click', function() {
      merHromadnyModal(user, function() { merLoadList(listWrap, user); });
    });
    btnGroup.appendChild(batchBtn);

    var exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.textContent = '\uD83D\uDCE4 Export';
    exportBtn.addEventListener('click', function() { merShowExportMenu(exportBtn); });
    btnGroup.appendChild(exportBtn);

    header.appendChild(btnGroup);
  }

  el.appendChild(header);

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 20px;font-size:0.9rem;color:var(--text-light);';
  hint.textContent = 'Evidence vodom\u011br\u016f, plynom\u011br\u016f, elektrom\u011br\u016f a m\u011b\u0159i\u010d\u016f tepla. Ode\u010dty, spot\u0159eba, upozorn\u011bn\xed na cejch.';
  el.appendChild(hint);

  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  merLoadList(listWrap, user);
});

function merLoadList(listWrap, user) {
  listWrap.replaceChildren();
  var ld = document.createElement('p');
  ld.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  ld.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(ld);

  Api.apiGet('api/meridla.php?action=list')
    .then(function(data) { merRenderList(listWrap, data.meridla || [], user); })
    .catch(function() {
      listWrap.replaceChildren();
      var e = document.createElement('p');
      e.style.color = 'var(--danger)';
      e.textContent = 'Chyba.';
      listWrap.appendChild(e);
    });
}

function merRenderList(listWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = user.role === 'admin' || user.role === 'vybor';

  if (!items.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    var emI = document.createElement('div');
    emI.className = 'empty-icon'; emI.textContent = '\uD83D\uDCA7';
    var emP = document.createElement('p');
    emP.textContent = '\u017d\xe1dn\xe1 m\u011b\u0159idla.';
    empty.appendChild(emI); empty.appendChild(emP);
    listWrap.appendChild(empty);
    return;
  }

  // Seskupení: společné, pak dle jednotky
  var spolecne = items.filter(function(m) { return m.umisteni_typ === 'spolecne'; });
  var jednotky = items.filter(function(m) { return m.umisteni_typ === 'jednotka'; });

  if (spolecne.length) {
    merRenderGroup(listWrap, 'Spole\u010dn\xe1 m\u011b\u0159idla', spolecne, isPriv, user);
  }

  // Seskupit dle čísla jednotky
  var groups = {};
  jednotky.forEach(function(m) {
    var key = m.cislo_jednotky || 'Nep\u0159i\u0159azeno';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  Object.keys(groups).sort().forEach(function(key) {
    merRenderGroup(listWrap, 'Jednotka ' + key, groups[key], isPriv, user);
  });
}

function merRenderGroup(parent, title, items, isPriv, user) {
  var sekce = document.createElement('div');
  sekce.style.marginBottom = '24px';

  var sHead = document.createElement('div');
  sHead.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);' +
    'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;';
  sHead.textContent = title + ' (' + items.length + ')';
  sekce.appendChild(sHead);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;';

  items.forEach(function(m) {
    grid.appendChild(merRenderCard(m, isPriv, user, parent));
  });

  sekce.appendChild(grid);
  parent.appendChild(sekce);
}

function merRenderCard(m, isPriv, user, listWrap) {
  var info = merTypInfo(m.typ);
  var cejch = merCejchStatus(m.datum_pristi_cejch);

  var card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);' +
    'border-radius:8px;padding:14px 16px;';

  // Header: icon + typ + výrobní číslo
  var top = document.createElement('div');
  top.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

  var iconEl = document.createElement('span');
  iconEl.style.fontSize = '1.3rem';
  iconEl.textContent = info.icon;
  top.appendChild(iconEl);

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'flex:1;min-width:0;';
  var typEl = document.createElement('div');
  typEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  typEl.textContent = info.label;
  nameEl.appendChild(typEl);
  if (m.vyrobni_cislo) {
    var vcEl = document.createElement('div');
    vcEl.style.cssText = 'font-size:0.78rem;color:var(--text-light);';
    vcEl.textContent = 'V\u010d: ' + m.vyrobni_cislo;
    nameEl.appendChild(vcEl);
  }
  top.appendChild(nameEl);

  // Cejch badge
  if (m.datum_pristi_cejch) {
    var badge = document.createElement('span');
    badge.style.cssText = 'padding:4px 10px;border-radius:12px;font-size:0.82rem;font-weight:600;color:#fff;flex-shrink:0;';
    if (cejch === 'expired') { badge.style.background = 'var(--danger)'; badge.textContent = 'Cejch!'; }
    else if (cejch === 'warning') { badge.style.background = '#f08600'; badge.textContent = 'Brzy'; }
    else { badge.style.background = 'var(--accent)'; badge.textContent = 'OK'; }
    top.appendChild(badge);
  }

  if (!m.aktivni || m.aktivni === '0') {
    var inact = document.createElement('span');
    inact.style.cssText = 'padding:4px 10px;border-radius:12px;font-size:0.82rem;font-weight:600;' +
      'color:var(--text-light);background:var(--bg-card);border:1px solid var(--border);flex-shrink:0;';
    inact.textContent = 'Neaktivn\xed';
    top.appendChild(inact);
  }

  card.appendChild(top);

  // Detaily
  var details = document.createElement('div');
  details.style.cssText = 'font-size:0.83rem;color:var(--text-light);';

  if (m.misto) merDetailRow(details, 'M\xedsto', m.misto);
  if (m.posledni_hodnota !== null && m.posledni_hodnota !== undefined) {
    merDetailRow(details, 'Posledn\xed ode\u010det',
      parseFloat(m.posledni_hodnota).toLocaleString('cs-CZ') + ' ' + (m.jednotka_mereni || '') +
      ' (' + formatDatum(m.posledni_datum) + ')');
  } else {
    merDetailRow(details, 'Ode\u010dty', '\u017e\xe1dn\xe9');
  }
  if (m.datum_pristi_cejch) {
    merDetailRow(details, 'P\u0159\xed\u0161t\xed cejch', formatDatum(m.datum_pristi_cejch));
  }
  if (m.poznamka) merDetailRow(details, 'Pozn.', m.poznamka);

  card.appendChild(details);

  // Akce
  var akce = document.createElement('div');
  akce.style.cssText = 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;';

  var odectyBtn = document.createElement('button');
  odectyBtn.className = 'btn btn-secondary btn-sm';
  var cnt = parseInt(m.odectu_pocet) || 0;
  odectyBtn.textContent = '\uD83D\uDCCA Ode\u010dty' + (cnt > 0 ? ' (' + cnt + ')' : '');
  odectyBtn.addEventListener('click', function() {
    merOdectyModal(m, user, function() { merLoadList(listWrap, user); });
  });
  akce.appendChild(odectyBtn);

  if (cnt >= 2) {
    var grafBtn = document.createElement('button');
    grafBtn.className = 'btn btn-secondary btn-sm';
    grafBtn.textContent = '\uD83D\uDCC8 Graf';
    grafBtn.addEventListener('click', function() { merGrafModal(m); });
    akce.appendChild(grafBtn);
  }

  if (isPriv) {
    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      merShowModal(m, user, function() { merLoadList(listWrap, user); });
    });
    akce.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat m\u011b\u0159idlo?',
        info.label + (m.vyrobni_cislo ? ' (' + m.vyrobni_cislo + ')' : '') + ' bude odstran\u011bno v\u010detn\u011b v\u0161ech ode\u010dt\u016f.',
        function() {
          Api.apiPost('api/meridla.php?action=delete', { id: m.id })
            .then(function() { showToast('M\u011b\u0159idlo smaz\xe1no'); merLoadList(listWrap, user); })
            .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
        });
    });
    akce.appendChild(delBtn);
  }

  card.appendChild(akce);
  return card;
}

function merDetailRow(parent, label, value) {
  var row = document.createElement('div');
  row.style.cssText = 'margin-bottom:2px;';
  var lbl = document.createElement('span');
  lbl.style.fontWeight = '500';
  lbl.textContent = label + ': ';
  row.appendChild(lbl);
  var val = document.createElement('span');
  val.textContent = value;
  row.appendChild(val);
  parent.appendChild(row);
}

function merShowExportMenu(anchor) {
  var existing = document.getElementById('mer-export-menu');
  if (existing) { existing.remove(); return; }

  var menu = document.createElement('div');
  menu.id = 'mer-export-menu';
  menu.style.cssText = 'position:absolute;background:var(--bg-card);border:1px solid var(--border);'
    + 'border-radius:var(--radius);box-shadow:var(--shadow-lg);padding:6px 0;z-index:100;min-width:120px;';

  ['CSV', 'XLSX', 'PDF'].forEach(function(fmt) {
    var item = document.createElement('a');
    item.style.cssText = 'display:block;padding:8px 16px;font-size:0.85rem;color:var(--text);'
      + 'text-decoration:none;cursor:pointer;';
    item.textContent = fmt;
    item.href = 'api/export.php?type=meridla&format=' + fmt.toLowerCase();
    item.addEventListener('click', function() { menu.remove(); });
    item.addEventListener('mouseenter', function() { item.style.background = 'var(--bg-hover)'; });
    item.addEventListener('mouseleave', function() { item.style.background = ''; });
    menu.appendChild(item);
  });

  var rect = anchor.getBoundingClientRect();
  menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  menu.style.left = rect.left + 'px';
  document.body.appendChild(menu);

  setTimeout(function() {
    document.addEventListener('click', function handler() {
      menu.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}
