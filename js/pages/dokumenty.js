/* ===== DOKUMENTY PAGE ===== */

var DOK_KATEGORIE = {
  stanovy:  { label: 'Stanovy',                ikona: '\uD83D\uDCDC' },
  zapisy:   { label: 'Z\xe1pisy ze sch\u016fz\xed', ikona: '\uD83D\uDCDD' },
  smlouvy:  { label: 'Smlouvy',                ikona: '\uD83E\uDD1D' },
  pojistky: { label: 'Pojistky',               ikona: '\uD83D\uDEE1\uFE0F' },
  revize:   { label: 'Revize',                 ikona: '\uD83D\uDD27' },
  ostatni:  { label: 'Ostatn\xed',             ikona: '\uD83D\uDCC1' },
};

var DOK_FILE_META = {
  pdf:  { ext: 'PDF',   bg: '#ffebee', fg: '#c62828', preview: true },
  doc:  { ext: 'DOC',   bg: '#e3f2fd', fg: '#1565c0', preview: false },
  docx: { ext: 'DOCX',  bg: '#e3f2fd', fg: '#1565c0', preview: false },
  xls:  { ext: 'XLS',   bg: '#e8f5e9', fg: '#2e7d32', preview: false },
  xlsx: { ext: 'XLSX',  bg: '#e8f5e9', fg: '#2e7d32', preview: false },
  jpg:  { ext: 'JPG',   bg: '#f3e5f5', fg: '#6a1b9a', preview: true },
  jpeg: { ext: 'JPEG',  bg: '#f3e5f5', fg: '#6a1b9a', preview: true },
  png:  { ext: 'PNG',   bg: '#f3e5f5', fg: '#6a1b9a', preview: true },
  md:   { ext: 'MD',    bg: '#eceff1', fg: '#455a64', preview: true },
  txt:  { ext: 'TXT',   bg: '#eceff1', fg: '#455a64', preview: true },
};

var DOK_ALLOWED_EXT = Object.keys(DOK_FILE_META);

Router.register('dokumenty', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Dokumenty';
  var sub = document.createElement('p');
  sub.textContent = 'Stanovy, z\xe1pisy, smlouvy a dal\u0161\xed dokumenty SVJ';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  var isPriv = isPrivileged(user);
  var listWrap = document.createElement('div');

  if (isPriv) dokRenderUploadCard(el, function() { dokLoadList(listWrap, user); });

  var listCard = document.createElement('div');
  listCard.className = 'card';
  var listBody = document.createElement('div');
  listBody.className = 'card-body';
  listCard.appendChild(listBody);
  listBody.appendChild(listWrap);
  el.appendChild(listCard);

  dokLoadList(listWrap, user);
});

/* Upload karta → dokumenty-upload.js */

/* ===== SEZNAM DOKUMENTŮ ===== */

function dokLoadList(wrap, user) {
  wrap.replaceChildren();
  var p = document.createElement('p');
  p.style.cssText = 'color:var(--text-light);font-size:.9rem;padding:12px 0;';
  p.textContent = 'Na\u010d\xedt\xe1m\u2026';
  wrap.appendChild(p);

  Api.apiGet('api/dokumenty.php?action=list')
    .then(function(data) { dokRenderList(wrap, data.dokumenty, user); })
    .catch(function() {
      wrap.replaceChildren();
      var e = document.createElement('p');
      e.style.cssText = 'color:var(--danger);font-size:.9rem;';
      e.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed dokument\u016f.';
      wrap.appendChild(e);
    });
}

function dokRenderList(wrap, docs, user) {
  wrap.replaceChildren();
  var isPriv = isPrivileged(user);

  if (!docs.length) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    var icon = document.createElement('div');
    icon.className = 'icon';
    icon.textContent = '\uD83D\uDCC1';
    var msg = document.createElement('p');
    msg.textContent = 'Zat\xedm nejsou nahr\xe1ny \u017e\xe1dn\xe9 dokumenty.';
    empty.appendChild(icon);
    empty.appendChild(msg);
    wrap.appendChild(empty);
    return;
  }

  var dnes = new Date();
  dnes.setHours(0, 0, 0, 0);

  var byKat = {};
  docs.forEach(function(d) {
    if (!byKat[d.kategorie]) byKat[d.kategorie] = [];
    byKat[d.kategorie].push(d);
  });

  var first = true;
  Object.keys(DOK_KATEGORIE).forEach(function(kat) {
    if (!byKat[kat] || !byKat[kat].length) return;
    var meta = DOK_KATEGORIE[kat];

    var groupHeader = document.createElement('div');
    groupHeader.style.cssText = 'display:flex;align-items:center;gap:6px;' +
      'margin:' + (first ? '4px' : '28px') + ' 0 10px;' +
      'font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;';
    first = false;
    var ghIcon = document.createElement('span');
    ghIcon.textContent = meta.ikona;
    var ghText = document.createElement('span');
    ghText.textContent = meta.label;
    var ghCount = document.createElement('span');
    ghCount.style.cssText = 'margin-left:auto;font-weight:500;color:var(--text-muted);';
    ghCount.textContent = byKat[kat].length + ' ' + (byKat[kat].length === 1 ? 'dokument' : 'dokumenty');
    groupHeader.appendChild(ghIcon);
    groupHeader.appendChild(ghText);
    groupHeader.appendChild(ghCount);
    wrap.appendChild(groupHeader);

    byKat[kat].forEach(function(doc) {
      wrap.appendChild(dokMakeCard(doc, isPriv, dnes, user));
    });
  });
}

function dokMakeCard(doc, isPriv, dnes, user) {
  var ext = (doc.soubor_nazev || '').split('.').pop().toLowerCase();
  var fm  = DOK_FILE_META[ext] || { ext: ext.toUpperCase(), bg: '#f5f5f5', fg: '#666', preview: false };

  var dniDo = doc.datum_platnosti ? daysUntil(doc.datum_platnosti) : null;
  var isExpired = dniDo !== null && dniDo < 0;

  var card = document.createElement('div');
  card.style.cssText = 'display:flex;align-items:center;gap:16px;padding:16px;' +
    'background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);' +
    'transition:box-shadow .15s;margin-bottom:8px;' +
    (isExpired ? 'border-left:3px solid var(--danger);' : '');
  card.addEventListener('mouseenter', function() { card.style.boxShadow = 'var(--shadow-lg)'; });
  card.addEventListener('mouseleave', function() { card.style.boxShadow = ''; });

  // Typ souboru — barevný label box
  var typeBox = document.createElement('div');
  typeBox.style.cssText = 'flex-shrink:0;width:48px;height:56px;border-radius:var(--radius);' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'background:' + fm.bg + ';gap:2px;';
  var typeIcon = document.createElement('div');
  typeIcon.style.cssText = 'font-size:1.3rem;line-height:1;';
  typeIcon.textContent = dokFileIcon(ext);
  var typeLabel = document.createElement('div');
  typeLabel.style.cssText = 'font-size:.6rem;font-weight:800;color:' + fm.fg + ';letter-spacing:.04em;';
  typeLabel.textContent = fm.ext;
  typeBox.appendChild(typeIcon);
  typeBox.appendChild(typeLabel);
  card.appendChild(typeBox);

  // Info
  var info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size:1rem;font-weight:600;color:var(--text);' +
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;';
  nameEl.textContent = doc.nazev;
  info.appendChild(nameEl);

  var badgeRow = document.createElement('div');
  badgeRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;';
  var katMeta = DOK_KATEGORIE[doc.kategorie];
  if (katMeta) {
    var katBadge = document.createElement('span');
    katBadge.className = 'badge badge-muted';
    katBadge.textContent = katMeta.ikona + ' ' + katMeta.label;
    badgeRow.appendChild(katBadge);
  }
  if (doc.pristup === 'vybor') {
    var lockBadge = document.createElement('span');
    lockBadge.className = 'badge badge-warning';
    lockBadge.textContent = '\uD83D\uDD12 Jen v\xfdbor';
    badgeRow.appendChild(lockBadge);
  }
  if (dniDo !== null) {
    var platBadge = document.createElement('span');
    if (isExpired) {
      platBadge.className = 'badge badge-danger';
      platBadge.textContent = '\u26a0 Vypr\u0161elo ' + dokFormatDatum(doc.datum_platnosti);
    } else if (dniDo <= 90) {
      platBadge.className = 'badge badge-warning';
      platBadge.textContent = '\u26a0 Vypr\u0161\xed za ' + dniDo + ' dn\xed';
    } else {
      platBadge.className = 'badge badge-muted';
      platBadge.textContent = 'Do ' + dokFormatDatum(doc.datum_platnosti);
    }
    badgeRow.appendChild(platBadge);
  }
  info.appendChild(badgeRow);

  var metaEl = document.createElement('div');
  metaEl.style.cssText = 'font-size:.78rem;color:var(--text-muted);';
  metaEl.textContent = (doc.jmeno + ' ' + doc.prijmeni).trim() + ' \u00b7 ' + dokFormatDatum(doc.created_at.split(' ')[0]);
  if (doc.popis) metaEl.textContent += ' \u00b7 ' + doc.popis;
  info.appendChild(metaEl);

  card.appendChild(info);

  // Akce
  var akce = document.createElement('div');
  akce.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:stretch;min-width:100px;';

  if (fm.preview) {
    var previewBtn = document.createElement('button');
    previewBtn.className = 'btn btn-secondary btn-sm';
    previewBtn.textContent = '\uD83D\uDC41 N\xe1hled';
    previewBtn.addEventListener('click', function() { dokShowPreview(doc); });
    akce.appendChild(previewBtn);
  }

  var dlBtn = document.createElement('a');
  dlBtn.className = 'btn btn-secondary btn-sm';
  dlBtn.textContent = '\u2193 St\xe1hnout';
  dlBtn.href = 'api/dokumenty.php?action=download&id=' + doc.id;
  dlBtn.target = '_blank';
  akce.appendChild(dlBtn);

  if (isPriv) {
    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat dokument?', '\u201e' + doc.nazev + '\u201c bude trvale odstraněn.', function() {
        Api.apiPost('api/dokumenty.php?action=delete', { id: doc.id })
          .then(function() { showToast('Dokument smaz\xe1n'); card.remove(); })
          .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
      });
    });
    akce.appendChild(delBtn);
  }

  card.appendChild(akce);
  return card;
}

/* ===== HELPERY ===== */

function dokFileIcon(ext) {
  var icons = { pdf: '\uD83D\uDCC4', doc: '\uD83D\uDCDD', docx: '\uD83D\uDCDD',
    xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA',
    jpg: '\uD83D\uDDBC\uFE0F', jpeg: '\uD83D\uDDBC\uFE0F', png: '\uD83D\uDDBC\uFE0F',
    md: '\uD83D\uDCCB', txt: '\uD83D\uDCCB' };
  return icons[ext] || '\uD83D\uDCC4';
}

function dokMakeField(labelText, type, id, value) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:.85rem;color:var(--text-light);';
  var inp = document.createElement('input');
  inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = value;
  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return { el: wrap, input: inp };
}

function dokMakeSelectField(labelText, id, options) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:.85rem;color:var(--text-light);';
  var sel = document.createElement('select');
  sel.id = id; sel.className = 'form-input';
  options.forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label;
    sel.appendChild(opt);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(sel);
  return { el: wrap, select: sel };
}

function dokMakeTextareaField(labelText) {
  var wrap = document.createElement('div');
  var lbl = document.createElement('label');
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:.85rem;color:var(--text-light);';
  var ta = document.createElement('textarea');
  ta.className = 'form-input'; ta.rows = 2;
  ta.placeholder = 'Voliteln\xe1 pozn\xe1mka ke dokumentu\u2026';
  wrap.appendChild(lbl);
  wrap.appendChild(ta);
  return { el: wrap, textarea: ta };
}

function dokGuessKategorie(filename) {
  var n = filename.toLowerCase();
  if (n.indexOf('stanov') !== -1) return 'stanovy';
  if (n.indexOf('z\xe1pis') !== -1 || n.indexOf('zapis') !== -1) return 'zapisy';
  if (n.indexOf('smlouv') !== -1) return 'smlouvy';
  if (n.indexOf('pojist') !== -1) return 'pojistky';
  if (n.indexOf('reviz') !== -1 || n.indexOf('inspek') !== -1) return 'revize';
  return null;
}

function dokFormatDatum(dateStr) {
  if (!dateStr) return '';
  var p = dateStr.split('-');
  return p.length === 3 ? p[2] + '. ' + p[1] + '. ' + p[0] : dateStr;
}
