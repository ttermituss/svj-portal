/* ===== DOKUMENTY PAGE ===== */

var DOK_KATEGORIE = {
  stanovy:  { label: 'Stanovy',           ikona: '\uD83D\uDCDC' },
  zapisy:   { label: 'Z\xe1pisy ze sch\u016fz\xed', ikona: '\uD83D\uDCDD' },
  smlouvy:  { label: 'Smlouvy',           ikona: '\uD83E\uDD1D' },
  pojistky: { label: 'Pojistky',          ikona: '\uD83D\uDEE1\uFE0F' },
  revize:   { label: 'Revize',            ikona: '\uD83D\uDD27' },
  ostatni:  { label: 'Ostatn\xed',        ikona: '\uD83D\uDCC1' },
};

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

  // Karta nahrání (jen admin/výbor)
  if (isPriv) {
    dokRenderUploadCard(el, user, function() { dokLoadList(listWrap, user); });
  }

  // Karta seznam
  var listCard = document.createElement('div');
  listCard.className = 'card';
  var listBody = document.createElement('div');
  listBody.className = 'card-body';
  listCard.appendChild(listBody);
  el.appendChild(listCard);

  var listWrap = document.createElement('div');
  listBody.appendChild(listWrap);

  dokLoadList(listWrap, user);
});

/* ===== UPLOAD KARTA ===== */

function dokRenderUploadCard(el, user, onSuccess) {
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

  // Název
  var nazevWrap = dokMakeField('N\xe1zev dokumentu', 'text', 'dok_nazev', '');
  body.appendChild(nazevWrap.el);

  // Kategorie
  var katWrap = document.createElement('div');
  katWrap.style.marginBottom = '14px';
  var katLabel = document.createElement('label');
  katLabel.textContent = 'Kategorie';
  katLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var katSelect = document.createElement('select');
  katSelect.className = 'form-input';
  katSelect.style.maxWidth = '240px';
  Object.entries(DOK_KATEGORIE).forEach(function(entry) {
    var opt = document.createElement('option');
    opt.value = entry[0];
    opt.textContent = entry[1].ikona + ' ' + entry[1].label;
    katSelect.appendChild(opt);
  });
  katWrap.appendChild(katLabel);
  katWrap.appendChild(katSelect);
  body.appendChild(katWrap);

  // Přístup
  var pristupWrap = document.createElement('div');
  pristupWrap.style.marginBottom = '14px';
  var pristupLabel = document.createElement('label');
  pristupLabel.textContent = 'Viditelnost';
  pristupLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pristupSelect = document.createElement('select');
  pristupSelect.className = 'form-input';
  pristupSelect.style.maxWidth = '240px';
  [['vsichni', 'Všichni členové'], ['vybor', 'Pouze výbor']].forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o[0];
    opt.textContent = o[1];
    pristupSelect.appendChild(opt);
  });
  pristupWrap.appendChild(pristupLabel);
  pristupWrap.appendChild(pristupSelect);
  body.appendChild(pristupWrap);

  // Datum platnosti
  var platnostWrap = dokMakeField('Datum platnosti (nepovinné)', 'date', 'dok_platnost', '');
  body.appendChild(platnostWrap.el);

  // Popis
  var popisWrap = document.createElement('div');
  popisWrap.style.marginBottom = '14px';
  var popisLabel = document.createElement('label');
  popisLabel.textContent = 'Pozn\xe1mka (nepovinné)';
  popisLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var popisInput = document.createElement('textarea');
  popisInput.className = 'form-input';
  popisInput.rows = 2;
  popisWrap.appendChild(popisLabel);
  popisWrap.appendChild(popisInput);
  body.appendChild(popisWrap);

  // Soubor
  var souborWrap = document.createElement('div');
  souborWrap.style.marginBottom = '16px';
  var souborLabel = document.createElement('label');
  souborLabel.textContent = 'Soubor (PDF, Word, Excel, JPEG, PNG — max 20 MB)';
  souborLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var souborInput = document.createElement('input');
  souborInput.type = 'file';
  souborInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
  souborInput.className = 'form-input';
  souborWrap.appendChild(souborLabel);
  souborWrap.appendChild(souborInput);
  body.appendChild(souborWrap);

  // Tlačítko
  var uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn btn-primary';
  uploadBtn.textContent = 'Nahr\xe1t';
  body.appendChild(uploadBtn);

  card.appendChild(body);
  el.appendChild(card);

  uploadBtn.addEventListener('click', function() {
    var nazev = nazevWrap.input.value.trim();
    if (!nazev) { showToast('Zadejte n\xe1zev dokumentu.', 'error'); return; }
    if (!souborInput.files[0]) { showToast('Vyberte soubor.', 'error'); return; }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Nahr\xe1v\xe1m\u2026';

    var fd = new FormData();
    fd.append('nazev', nazev);
    fd.append('kategorie', katSelect.value);
    fd.append('pristup', pristupSelect.value);
    fd.append('datum_platnosti', platnostWrap.input.value);
    fd.append('popis', popisInput.value.trim());
    fd.append('soubor', souborInput.files[0]);

    fetch('api/dokumenty.php?action=upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        showToast('Dokument nahr\xe1n');
        nazevWrap.input.value = '';
        popisInput.value = '';
        platnostWrap.input.value = '';
        souborInput.value = '';
        onSuccess();
      })
      .catch(function(e) { showToast(e.message || 'Chyba p\u0159i nahr\xe1v\xe1n\xed.', 'error'); })
      .finally(function() { uploadBtn.disabled = false; uploadBtn.textContent = 'Nahr\xe1t'; });
  });
}

/* ===== SEZNAM DOKUMENTŮ ===== */

function dokLoadList(wrap, user) {
  wrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;padding:8px 0;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  wrap.appendChild(loading);

  Api.apiGet('api/dokumenty.php?action=list')
    .then(function(data) { dokRenderList(wrap, data.dokumenty, user); })
    .catch(function() {
      wrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed dokument\u016f.';
      wrap.appendChild(err);
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

  // Seskupit podle kategorie
  var byKat = {};
  docs.forEach(function(d) {
    if (!byKat[d.kategorie]) byKat[d.kategorie] = [];
    byKat[d.kategorie].push(d);
  });

  var dnes = new Date();
  dnes.setHours(0, 0, 0, 0);

  Object.keys(DOK_KATEGORIE).forEach(function(kat) {
    if (!byKat[kat] || !byKat[kat].length) return;

    var meta = DOK_KATEGORIE[kat];

    var section = document.createElement('div');
    section.style.marginBottom = '24px';

    var heading = document.createElement('div');
    heading.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;' +
      'padding-bottom:6px;border-bottom:1px solid var(--border);';
    var hIcon = document.createElement('span');
    hIcon.textContent = meta.ikona;
    var hLabel = document.createElement('span');
    hLabel.style.cssText = 'font-weight:600;font-size:0.9rem;';
    hLabel.textContent = meta.label;
    heading.appendChild(hIcon);
    heading.appendChild(hLabel);
    section.appendChild(heading);

    byKat[kat].forEach(function(doc) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:10px 0;' +
        'border-bottom:1px solid var(--border);flex-wrap:wrap;';

      // Info
      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      var nazevEl = document.createElement('div');
      nazevEl.style.cssText = 'font-weight:500;font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      nazevEl.textContent = doc.nazev;
      info.appendChild(nazevEl);

      var metaRow = document.createElement('div');
      metaRow.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:2px;display:flex;gap:12px;flex-wrap:wrap;';

      var uploaderEl = document.createElement('span');
      uploaderEl.textContent = (doc.jmeno + ' ' + doc.prijmeni).trim() + ' \u00b7 ' + dokFormatDatum(doc.created_at.split(' ')[0]);
      metaRow.appendChild(uploaderEl);

      if (doc.pristup === 'vybor') {
        var privBadge = document.createElement('span');
        privBadge.textContent = '\uD83D\uDD12 Jen v\xfdbor';
        privBadge.style.color = 'var(--text-light)';
        metaRow.appendChild(privBadge);
      }

      if (doc.datum_platnosti) {
        var platnost = new Date(doc.datum_platnosti);
        var dniDo = Math.floor((platnost - dnes) / 86400000);
        var platEl = document.createElement('span');
        if (dniDo < 0) {
          platEl.style.color = 'var(--danger)';
          platEl.textContent = '\u26a0 Platnost vypr\u0161ela (' + dokFormatDatum(doc.datum_platnosti) + ')';
        } else if (dniDo <= 90) {
          platEl.style.color = '#d44000';
          platEl.textContent = '\u26a0 Platnost do ' + dokFormatDatum(doc.datum_platnosti) + ' (za ' + dniDo + ' dn\xed)';
        } else {
          platEl.textContent = 'Platnost do ' + dokFormatDatum(doc.datum_platnosti);
        }
        metaRow.appendChild(platEl);
      }

      info.appendChild(metaRow);

      if (doc.popis) {
        var popisEl = document.createElement('div');
        popisEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:3px;';
        popisEl.textContent = doc.popis;
        info.appendChild(popisEl);
      }

      row.appendChild(info);

      // Akce
      var akce = document.createElement('div');
      akce.style.cssText = 'display:flex;gap:6px;flex-shrink:0;align-items:center;';

      var dlBtn = document.createElement('a');
      dlBtn.className = 'btn btn-secondary btn-sm';
      dlBtn.textContent = 'St\xe1hnout';
      dlBtn.href = 'api/dokumenty.php?action=download&id=' + doc.id;
      dlBtn.target = '_blank';
      akce.appendChild(dlBtn);

      if (isPriv) {
        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = 'Smazat';
        delBtn.addEventListener('click', function() {
          showConfirmModal(
            'Smazat dokument?',
            '\u201e' + doc.nazev + '\u201c bude trvale odstraněn.',
            function() {
              Api.apiPost('api/dokumenty.php?action=delete', { id: doc.id })
                .then(function() {
                  showToast('Dokument smaz\xe1n');
                  row.remove();
                })
                .catch(function(e) { showToast(e.message || 'Chyba p\u0159i maz\xe1n\xed.', 'error'); });
            }
          );
        });
        akce.appendChild(delBtn);
      }

      row.appendChild(akce);
      section.appendChild(row);
    });

    wrap.appendChild(section);
  });
}

/* ===== HELPERY ===== */

function dokMakeField(labelText, type, id, value) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = labelText;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var inp = document.createElement('input');
  inp.type = type; inp.id = id; inp.className = 'form-input'; inp.value = value;
  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return { el: wrap, input: inp };
}

function dokFormatDatum(dateStr) {
  if (!dateStr) return '';
  var p = dateStr.split('-');
  return p.length === 3 ? p[2] + '. ' + p[1] + '. ' + p[0] : dateStr;
}
