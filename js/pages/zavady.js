/* ===== HLÁŠENÍ ZÁVAD — PAGE ===== */

var ZAVADY_STAVY = {
  nova:      { label: 'Nov\u00e1',       cls: 'badge-warning' },
  v_reseni:  { label: 'V \u0159e\u0161en\u00ed', cls: 'badge-info' },
  vyreseno:  { label: 'Vy\u0159e\u0161eno',     cls: 'badge-success' },
  zamitnuto: { label: 'Zam\u00edtnuto',          cls: '' },
};

var ZAVADY_PRIORITY = {
  nizka:     { label: 'N\u00edzk\u00e1',    cls: '' },
  normalni:  { label: 'Norm\u00e1ln\u00ed', cls: '' },
  vysoka:    { label: 'Vysok\u00e1',        cls: 'badge-warning' },
  kriticka:  { label: 'Kritick\u00e1',      cls: 'badge-danger' },
};

Router.register('zavady', function(el) {
  var user   = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { Router.navigate('home'); return; }
  var isPriv = user.role === 'admin' || user.role === 'vybor';

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Hl\u00e1\u0161en\u00ed z\u00e1vad';
  var sub = document.createElement('p');
  sub.textContent = 'Nahl\u00e1sit z\u00e1vadu a sledovat jej\u00ed \u0159e\u0161en\u00ed';
  title.appendChild(h1); title.appendChild(sub);
  el.appendChild(title);

  // Counts bar
  var countsBar = document.createElement('div');
  countsBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;';
  el.appendChild(countsBar);

  // Filter + actions bar
  var filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;';

  var filterSel = document.createElement('select');
  filterSel.className = 'form-input';
  filterSel.style.cssText = 'width:auto;min-width:160px;';
  [['', 'V\u0161echny z\u00e1vady'], ['nova', 'Nov\u00e9'], ['v_reseni', 'V \u0159e\u0161en\u00ed'],
   ['vyreseno', 'Vy\u0159e\u0161en\u00e9'], ['zamitnuto', 'Zam\u00edtnut\u00e9']].forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o[0]; opt.textContent = o[1];
    filterSel.appendChild(opt);
  });
  filterBar.appendChild(filterSel);

  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ Nahl\u00e1sit z\u00e1vadu';
  addBtn.style.marginLeft = 'auto';
  filterBar.appendChild(addBtn);

  if (isPriv) {
    ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.fontSize = '0.82rem';
      btn.textContent = fmt === 'pdf' ? '\uD83D\uDCC3 PDF' : fmt === 'xlsx' ? '\uD83D\uDCCA XLSX' : '\uD83D\uDCC4 CSV';
      btn.addEventListener('click', function() {
        window.location.href = 'api/export.php?type=zavady&format=' + fmt;
      });
      filterBar.appendChild(btn);
    });
  }

  el.appendChild(filterBar);

  // Create form (hidden by default)
  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  el.appendChild(formWrap);

  // List wrapper
  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  function reload() {
    zavadyLoadList(listWrap, countsBar, user, filterSel.value);
  }

  filterSel.addEventListener('change', reload);

  addBtn.addEventListener('click', function() {
    if (formWrap.style.display === 'none') {
      formWrap.style.display = '';
      addBtn.textContent = '\u2715 Zru\u0161it';
      zavadyRenderForm(formWrap, function() {
        formWrap.style.display = 'none';
        formWrap.replaceChildren();
        addBtn.textContent = '+ Nahl\u00e1sit z\u00e1vadu';
        reload();
      });
    } else {
      formWrap.style.display = 'none';
      formWrap.replaceChildren();
      addBtn.textContent = '+ Nahl\u00e1sit z\u00e1vadu';
    }
  });

  reload();
});

/* ===== COUNTS BAR ===== */

function zavadyRenderCounts(wrap, pocty) {
  wrap.replaceChildren();
  var total = 0;
  Object.keys(ZAVADY_STAVY).forEach(function(k) { total += (pocty[k] || 0); });

  [['', 'Celkem', total]].concat(
    Object.keys(ZAVADY_STAVY).map(function(k) { return [k, ZAVADY_STAVY[k].label, pocty[k] || 0]; })
  ).forEach(function(item) {
    var chip = document.createElement('div');
    chip.style.cssText = 'padding:6px 14px;border-radius:20px;font-size:0.85rem;font-weight:500;'
      + 'background:var(--bg-hover);border:1px solid var(--border);';
    chip.textContent = item[1] + ': ' + item[2];
    wrap.appendChild(chip);
  });
}

/* ===== LOAD LIST ===== */

function zavadyLoadList(wrap, countsBar, user, filterStav) {
  wrap.replaceChildren();
  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m z\u00e1vady\u2026';
  wrap.appendChild(loading);

  var url = 'api/zavady.php?action=list';
  if (filterStav) url += '&stav=' + filterStav;

  Api.apiGet(url)
    .then(function(data) {
      wrap.replaceChildren();
      zavadyRenderCounts(countsBar, data.pocty || {});

      if (!data.zavady || !data.zavady.length) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        var icon = document.createElement('div'); icon.className = 'icon'; icon.textContent = '\u2705';
        var msg = document.createElement('p');
        msg.textContent = filterStav
          ? '\u017d\u00e1dn\u00e9 z\u00e1vady v tomto stavu.'
          : 'Zat\u00edm nebyly nahl\u00e1\u0161eny \u017e\u00e1dn\u00e9 z\u00e1vady. To je dobr\u00e1 zpr\u00e1va!';
        empty.appendChild(icon); empty.appendChild(msg);
        wrap.appendChild(empty);
        return;
      }

      data.zavady.forEach(function(z) {
        wrap.appendChild(zavadyMakeCard(z, user, function() {
          zavadyLoadList(wrap, countsBar, user, filterStav);
        }));
      });
    })
    .catch(function(e) {
      wrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst z\u00e1vady.');
      wrap.appendChild(err);
    });
}

/* ===== CARD ===== */

function zavadyMakeCard(z, user, onRefresh) {
  var isPriv = user && (user.role === 'admin' || user.role === 'vybor');
  var stavInfo = ZAVADY_STAVY[z.stav] || { label: z.stav, cls: '' };
  var prioInfo = ZAVADY_PRIORITY[z.priorita] || { label: z.priorita, cls: '' };

  var card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'margin-bottom:14px;cursor:pointer;transition:box-shadow 0.15s;';
  card.addEventListener('mouseenter', function() { card.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; });
  card.addEventListener('mouseleave', function() { card.style.boxShadow = ''; });

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.cssText = 'display:flex;gap:14px;align-items:flex-start;';

  // Left: foto thumbnail or icon
  var thumb = document.createElement('div');
  thumb.style.cssText = 'width:56px;height:56px;border-radius:8px;flex-shrink:0;display:flex;'
    + 'align-items:center;justify-content:center;background:var(--bg-hover);font-size:1.5rem;overflow:hidden;';
  if (z.foto_nazev) {
    var img = document.createElement('img');
    img.src = 'api/zavady.php?action=photo&id=' + z.id;
    img.alt = 'Foto';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    thumb.appendChild(img);
  } else {
    thumb.textContent = '\uD83D\uDEE0\uFE0F';
  }
  body.appendChild(thumb);

  // Middle: info
  var info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';

  var titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px;';
  var titleEl = document.createElement('span');
  titleEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  titleEl.textContent = z.nazev;
  titleRow.appendChild(titleEl);

  var stavBadge = document.createElement('span');
  stavBadge.className = 'badge ' + stavInfo.cls;
  stavBadge.textContent = stavInfo.label;
  titleRow.appendChild(stavBadge);

  if (z.priorita !== 'normalni') {
    var prioBadge = document.createElement('span');
    prioBadge.className = 'badge ' + prioInfo.cls;
    prioBadge.textContent = prioInfo.label;
    titleRow.appendChild(prioBadge);
  }

  info.appendChild(titleRow);

  var meta = document.createElement('div');
  meta.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  var parts = [];
  if (z.lokace) parts.push('\uD83D\uDCCD ' + z.lokace);
  parts.push('\uD83D\uDC64 ' + ((z.autor_jmeno || '') + ' ' + (z.autor_prijmeni || '')).trim());
  parts.push(new Date(z.created_at).toLocaleDateString('cs-CZ'));
  if (z.zodpovedna_osoba) parts.push('\u2192 ' + z.zodpovedna_osoba);
  if (z.pocet_komentaru > 0) parts.push('\uD83D\uDCAC ' + z.pocet_komentaru);
  meta.textContent = parts.join(' \u00b7 ');
  info.appendChild(meta);

  body.appendChild(info);
  card.appendChild(body);

  card.addEventListener('click', function() {
    zavadyShowDetail(z.id, user, onRefresh);
  });

  return card;
}

/* ===== CREATE FORM ===== */

function zavadyRenderForm(wrap, onCreated) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Nov\u00e1 z\u00e1vada';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  function mkField(labelText, type, id, placeholder, required) {
    var w = document.createElement('div');
    w.style.marginBottom = '14px';
    var lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.textContent = labelText + (required ? ' *' : '');
    lbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;';
    w.appendChild(lbl);
    var inp;
    if (type === 'textarea') {
      inp = document.createElement('textarea');
      inp.rows = 3;
    } else if (type === 'select') {
      inp = document.createElement('select');
    } else if (type === 'file') {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/jpeg,image/png,image/webp';
    } else {
      inp = document.createElement('input');
      inp.type = type;
    }
    inp.id = id;
    inp.className = 'form-input';
    if (placeholder) inp.placeholder = placeholder;
    w.appendChild(inp);
    return { el: w, input: inp };
  }

  var fNazev  = mkField('N\u00e1zev z\u00e1vady', 'text', 'z-nazev', 'Nap\u0159. Prasklina na strop\u011b ve 3. pat\u0159e', true);
  var fPopis  = mkField('Popis', 'textarea', 'z-popis', 'Podrobn\u011bj\u0161\u00ed popis z\u00e1vady\u2026', true);
  var fLokace = mkField('M\u00edsto v dom\u011b', 'text', 'z-lokace', 'Nap\u0159. 3. patro, chodba');
  var fPrior  = mkField('Priorita', 'select', 'z-priorita');
  var fFoto   = mkField('Fotka (voliteln\u00e1, max 5 MB)', 'file', 'z-foto');

  [['nizka', 'N\u00edzk\u00e1'], ['normalni', 'Norm\u00e1ln\u00ed'], ['vysoka', 'Vysok\u00e1'], ['kriticka', 'Kritick\u00e1']].forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o[0]; opt.textContent = o[1];
    if (o[0] === 'normalni') opt.selected = true;
    fPrior.input.appendChild(opt);
  });

  [fNazev, fPopis, fLokace, fPrior, fFoto].forEach(function(f) { body.appendChild(f.el); });

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  body.appendChild(errBox);

  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Odeslat hl\u00e1\u0161en\u00ed';
  body.appendChild(submitBtn);

  submitBtn.addEventListener('click', function() {
    var nazev = fNazev.input.value.trim();
    var popis = fPopis.input.value.trim();
    if (!nazev) { errBox.textContent = 'Zadejte n\u00e1zev z\u00e1vady.'; errBox.style.display = ''; return; }
    if (!popis) { errBox.textContent = 'Zadejte popis z\u00e1vady.'; errBox.style.display = ''; return; }
    errBox.style.display = 'none';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Odes\u00edl\u00e1m\u2026';

    var fd = new FormData();
    fd.append('nazev', nazev);
    fd.append('popis', popis);
    fd.append('lokace', fLokace.input.value.trim());
    fd.append('priorita', fPrior.input.value);
    if (fFoto.input.files && fFoto.input.files[0]) {
      fd.append('foto', fFoto.input.files[0]);
    }

    fetch('api/zavady.php?action=add', {
      method: 'POST',
      credentials: 'same-origin',
      body: fd,
    })
      .then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error || 'Chyba'); return d; }); })
      .then(function(data) { showToast('Z\u00e1vada nahl\u00e1\u0161ena.'); handleGdriveFeedback(data); onCreated(); })
      .catch(function(e) { errBox.textContent = e.message; errBox.style.display = ''; })
      .finally(function() { submitBtn.disabled = false; submitBtn.textContent = 'Odeslat hl\u00e1\u0161en\u00ed'; });
  });

  card.appendChild(body);
  wrap.appendChild(card);
}
