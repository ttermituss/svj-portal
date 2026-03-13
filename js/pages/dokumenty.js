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

  var isPriv = user.role === 'admin' || user.role === 'vybor';
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

/* ===== UPLOAD KARTA — drag & drop ===== */

function dokRenderUploadCard(el, onSuccess) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '24px';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.textContent = 'Nahr\xe1t dokument';
  hdr.appendChild(h2);
  card.appendChild(hdr);
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.' + DOK_ALLOWED_EXT.join(',.');
  fileInput.style.display = 'none';
  body.appendChild(fileInput);

  // Drop zóna
  var zone = document.createElement('div');
  zone.style.cssText = 'border:2px dashed var(--border);border-radius:var(--radius-lg);' +
    'padding:40px 20px;text-align:center;cursor:pointer;' +
    'transition:border-color .2s,background .2s;background:var(--bg);user-select:none;';
  body.appendChild(zone);

  var zoneIcon = document.createElement('div');
  zoneIcon.style.cssText = 'font-size:2.5rem;margin-bottom:10px;opacity:.5;transition:opacity .2s;';
  zoneIcon.textContent = '\uD83D\uDCC2';
  zone.appendChild(zoneIcon);
  var zoneTitle = document.createElement('div');
  zoneTitle.style.cssText = 'font-size:1rem;font-weight:600;color:var(--text);margin-bottom:4px;';
  zoneTitle.textContent = 'P\u0159et\xe1hn\u011bte soubor sem';
  zone.appendChild(zoneTitle);
  var zoneSub = document.createElement('div');
  zoneSub.style.cssText = 'font-size:0.82rem;color:var(--text-muted);';
  zoneSub.textContent = 'nebo klikn\u011bte pro v\xfd b\u011br \u00b7 PDF, Word, Excel, JPEG, PNG, MD, TXT \u00b7 max 20 MB';
  zone.appendChild(zoneSub);

  // File preview chip
  var preview = document.createElement('div');
  preview.style.cssText = 'display:none;margin-top:16px;padding:12px 16px;' +
    'background:var(--bg-hover);border:1px solid var(--border);border-radius:var(--radius);' +
    'align-items:center;gap:12px;';
  body.appendChild(preview);
  var previewIcon = document.createElement('span');
  previewIcon.style.cssText = 'font-size:1.6rem;flex-shrink:0;';
  preview.appendChild(previewIcon);
  var previewInfo = document.createElement('div');
  previewInfo.style.cssText = 'flex:1;min-width:0;';
  preview.appendChild(previewInfo);
  var previewName = document.createElement('div');
  previewName.style.cssText = 'font-weight:600;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  previewInfo.appendChild(previewName);
  var previewMeta = document.createElement('div');
  previewMeta.style.cssText = 'font-size:.78rem;color:var(--text-muted);margin-top:2px;';
  previewInfo.appendChild(previewMeta);
  var previewRemove = document.createElement('button');
  previewRemove.style.cssText = 'flex-shrink:0;width:28px;height:28px;border:none;border-radius:50%;' +
    'background:var(--bg);color:var(--text-light);font-size:1.1rem;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;';
  previewRemove.textContent = '\u00d7';
  previewRemove.addEventListener('mouseenter', function() {
    previewRemove.style.background = 'var(--danger-light)';
    previewRemove.style.color = 'var(--danger)';
  });
  previewRemove.addEventListener('mouseleave', function() {
    previewRemove.style.background = 'var(--bg)';
    previewRemove.style.color = 'var(--text-light)';
  });
  preview.appendChild(previewRemove);

  // Formulář metadat
  var form = document.createElement('div');
  form.style.cssText = 'display:none;margin-top:20px;';
  body.appendChild(form);

  var formGrid = document.createElement('div');
  formGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;';
  form.appendChild(formGrid);
  var mq = window.matchMedia('(max-width:600px)');
  function applyGrid() { formGrid.style.gridTemplateColumns = mq.matches ? '1fr' : '1fr 1fr'; }
  applyGrid();
  mq.addEventListener('change', applyGrid);

  var nazevWrap = dokMakeField('N\xe1zev dokumentu *', 'text', 'dok_nazev', '');
  nazevWrap.input.placeholder = 'Nap\u0159. Stanovy SVJ 2024';
  formGrid.appendChild(nazevWrap.el);

  var katWrap = dokMakeSelectField('Kategorie', 'dok_kat',
    Object.entries(DOK_KATEGORIE).map(function(e) { return { value: e[0], label: e[1].ikona + ' ' + e[1].label }; }));
  formGrid.appendChild(katWrap.el);

  var platnostWrap = dokMakeField('Datum platnosti', 'date', 'dok_platnost', '');
  formGrid.appendChild(platnostWrap.el);

  var pristupWrap = dokMakeSelectField('Viditelnost', 'dok_pristup', [
    { value: 'vsichni', label: '\uD83D\uDD13 V\u0161ichni \u010dlenov\xe9' },
    { value: 'vybor',   label: '\uD83D\uDD12 Pouze v\xfdbor' },
  ]);
  formGrid.appendChild(pristupWrap.el);

  var pozWrap = dokMakeTextareaField('Pozn\xe1mka');
  pozWrap.el.style.gridColumn = '1 / -1';
  form.appendChild(pozWrap.el);

  // Progress bar
  var progress = document.createElement('div');
  progress.style.cssText = 'display:none;margin-top:16px;';
  var progressBar = document.createElement('div');
  progressBar.style.cssText = 'height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:6px;';
  var progressFill = document.createElement('div');
  progressFill.style.cssText = 'height:100%;width:0%;background:var(--accent);transition:width .3s;';
  progressBar.appendChild(progressFill);
  var progressLabel = document.createElement('div');
  progressLabel.style.cssText = 'font-size:.8rem;color:var(--text-muted);';
  progressLabel.textContent = 'Nahr\xe1v\xe1m\u2026';
  progress.appendChild(progressBar);
  progress.appendChild(progressLabel);
  form.appendChild(progress);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = '\u2191 Nahr\xe1t';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  form.appendChild(btnRow);

  /* === Logika === */

  function dokSetFile(file) {
    if (!file) return;
    var ext = file.name.split('.').pop().toLowerCase();
    if (DOK_ALLOWED_EXT.indexOf(ext) === -1) {
      showToast('Nepodporovan\xfd form\xe1t \u201e.' + ext + '\u201c. Povoleny: PDF, Word, Excel, obrázky, MD, TXT', 'error');
      fileInput.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('Soubor je p\u0159\xedli\u0161 velk\xfd (max 20 MB).', 'error');
      fileInput.value = '';
      return;
    }
    var fm = DOK_FILE_META[ext] || { ext: ext.toUpperCase(), bg: 'var(--bg-hover)', fg: 'var(--text-light)' };
    previewIcon.textContent = dokFileIcon(ext);
    previewName.textContent = file.name;
    previewMeta.textContent = fm.ext + ' \u00b7 ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
    preview.style.display = 'flex';
    zone.style.display = 'none';
    form.style.display = '';
    if (!nazevWrap.input.value) nazevWrap.input.value = file.name.replace(/\.[^.]+$/, '');
    var kat = dokGuessKategorie(file.name);
    if (kat) katWrap.select.value = kat;
  }

  function dokClearFile() {
    fileInput.value = '';
    preview.style.display = 'none';
    zone.style.display = '';
    form.style.display = 'none';
    progress.style.display = 'none';
    progressFill.style.width = '0%';
    nazevWrap.input.value = '';
    pozWrap.textarea.value = '';
    platnostWrap.input.value = '';
  }

  zone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) dokSetFile(fileInput.files[0]);
  });
  previewRemove.addEventListener('click', dokClearFile);
  cancelBtn.addEventListener('click', dokClearFile);

  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--accent)';
    zone.style.background  = 'var(--accent-light)';
    zoneIcon.style.opacity = '1';
  });
  zone.addEventListener('dragleave', function() {
    zone.style.borderColor = 'var(--border)';
    zone.style.background  = 'var(--bg)';
    zoneIcon.style.opacity = '.5';
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    zone.style.borderColor = 'var(--border)';
    zone.style.background  = 'var(--bg)';
    zoneIcon.style.opacity = '.5';
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) {
      try { var dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; } catch (_) {}
      dokSetFile(f);
    }
  });

  saveBtn.addEventListener('click', function() {
    var file = fileInput.files[0];
    if (!file) { showToast('Vyberte soubor.', 'error'); return; }
    var nazev = nazevWrap.input.value.trim();
    if (!nazev) { showToast('Zadejte n\xe1zev dokumentu.', 'error'); return; }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    progress.style.display = '';

    var pct = 0;
    var pTimer = setInterval(function() {
      pct = Math.min(pct + Math.random() * 15, 85);
      progressFill.style.width = pct + '%';
    }, 200);

    var fd = new FormData();
    fd.append('nazev', nazev);
    fd.append('kategorie', katWrap.select.value);
    fd.append('pristup', pristupWrap.select.value);
    fd.append('datum_platnosti', platnostWrap.input.value);
    fd.append('popis', pozWrap.textarea.value.trim());
    fd.append('soubor', file);

    fetch('api/dokumenty.php?action=upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        clearInterval(pTimer);
        progressFill.style.width = '100%';
        setTimeout(function() { dokClearFile(); showToast('Dokument nahr\xe1n'); handleGdriveFeedback(data); onSuccess(); }, 300);
      })
      .catch(function(e) {
        clearInterval(pTimer);
        showToast(e.message || 'Chyba p\u0159i nahr\xe1v\xe1n\xed.', 'error');
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        progress.style.display = 'none';
      });
  });
}

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
  var isPriv = user.role === 'admin' || user.role === 'vybor';

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

  var dniDo = null;
  var isExpired = false;
  if (doc.datum_platnosti) {
    var platnost = new Date(doc.datum_platnosti);
    dniDo = Math.floor((platnost - dnes) / 86400000);
    isExpired = dniDo < 0;
  }

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
