/* ===== DATOVÁ SCHRÁNKA — archiv zpráv ===== */

Router.register('datovka', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (user.role !== 'admin' && user.role !== 'vybor') {
    Router.navigate('home'); return;
  }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = '\uD83D\uDCEC Datová schránka';
  var sub = document.createElement('p');
  sub.textContent = 'Archiv zpráv z datové schránky SVJ — nahrávejte soubory .zfo stažené z portálu mojedatovaschranka.cz';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // Tabs
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--border);';
  var tabs = [
    { id: 'zpravy',   label: '\uD83D\uDCCB Zprávy' },
    { id: 'pruvodce', label: '\uD83D\uDCD6 Průvodce' },
  ];
  var tabPanels = {};
  var tabBtns   = {};

  tabs.forEach(function(t) {
    var btn = document.createElement('button');
    btn.style.cssText = 'background:none;border:none;padding:10px 18px;cursor:pointer;font-size:0.92rem;' +
      'color:var(--text-light);border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s;';
    btn.textContent = t.label;
    btn.addEventListener('click', function() { datovkaSwitchTab(t.id, tabBtns, tabPanels); });
    tabBtns[t.id] = btn;
    tabBar.appendChild(btn);

    var panel = document.createElement('div');
    panel.style.display = 'none';
    tabPanels[t.id] = panel;
    el.appendChild(panel);
  });
  el.insertBefore(tabBar, tabPanels['zpravy']);

  renderDatovkaZpravy(tabPanels['zpravy'], user);
  renderDatovkaPruvodce(tabPanels['pruvodce']);
  datovkaSwitchTab('zpravy', tabBtns, tabPanels);
});

function datovkaSwitchTab(id, btns, panels) {
  Object.keys(btns).forEach(function(k) {
    var active = k === id;
    btns[k].style.color     = active ? 'var(--primary)' : 'var(--text-light)';
    btns[k].style.fontWeight= active ? '600' : '400';
    btns[k].style.borderBottomColor = active ? 'var(--primary)' : 'transparent';
    panels[k].style.display = active ? '' : 'none';
  });
}

/* ===== ZÁLOŽKA: ZPRÁVY ===== */

function renderDatovkaZpravy(el, user) {
  var card = document.createElement('div');
  card.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  // Upload sekce
  var uploadBox = document.createElement('div');
  uploadBox.style.cssText = 'border:2px dashed var(--border);border-radius:8px;padding:20px;' +
    'text-align:center;margin-bottom:20px;transition:border-color .2s;';

  var uploadIcon = document.createElement('div');
  uploadIcon.style.cssText = 'font-size:2rem;margin-bottom:8px;';
  uploadIcon.textContent = '\uD83D\uDCEC';

  var uploadText = document.createElement('div');
  uploadText.style.cssText = 'font-size:0.9rem;color:var(--text-light);margin-bottom:12px;';
  uploadText.textContent = 'Přetáhněte soubor .zfo sem, nebo klikněte pro výběr';

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.zfo';
  fileInput.style.display = 'none';

  var uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn btn-primary';
  uploadBtn.textContent = 'Nahrát .zfo zprávu';
  uploadBtn.addEventListener('click', function() { fileInput.click(); });

  var uploadStatus = document.createElement('div');
  uploadStatus.style.cssText = 'margin-top:10px;font-size:0.88rem;';

  uploadBox.appendChild(uploadIcon);
  uploadBox.appendChild(uploadText);
  uploadBox.appendChild(uploadBtn);
  uploadBox.appendChild(fileInput);
  uploadBox.appendChild(uploadStatus);
  body.appendChild(uploadBox);

  // Drag & drop
  uploadBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = 'var(--primary)';
  });
  uploadBox.addEventListener('dragleave', function() {
    uploadBox.style.borderColor = 'var(--border)';
  });
  uploadBox.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadBox.style.borderColor = 'var(--border)';
    var f = e.dataTransfer.files[0];
    if (f) datovkaUploadFile(f, uploadStatus, listWrap, user);
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) datovkaUploadFile(fileInput.files[0], uploadStatus, listWrap, user);
    fileInput.value = '';
  });

  // Seznam zpráv
  var listWrap = document.createElement('div');
  body.appendChild(listWrap);

  datovkaLoadList(listWrap, user);
}

function datovkaUploadFile(file, statusEl, listWrap, user) {
  if (!file.name.toLowerCase().endsWith('.zfo')) {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = 'Chyba: pouze soubory .zfo jsou podporovány.';
    return;
  }

  statusEl.style.color = 'var(--text-light)';
  statusEl.textContent = 'Nahrávám a zpracovávám\u2026';

  var fd = new FormData();
  fd.append('zfo', file);

  fetch('api/datovka.php?action=upload', {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = 'Chyba: ' + data.error.message;
      return;
    }
    statusEl.style.color = 'var(--accent)';
    statusEl.textContent = '\u2713 Zpráva \u201e' + data.annotation + '\u201c nahrána (' + data.prilohy + ' příloh)';
    datovkaLoadList(listWrap, user);
  })
  .catch(function() {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = 'Chyba při nahrávání.';
  });
}

function datovkaLoadList(wrap, user) {
  wrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Načítám zprávy\u2026';
  wrap.appendChild(loading);

  Api.apiGet('api/datovka.php?action=list')
    .then(function(data) {
      wrap.removeChild(loading);
      if (!data.zpravy || !data.zpravy.length) {
        var empty = makeEmptyState('\uD83D\uDCEC', 'Archiv je prázdný. Nahrajte první .zfo zprávu výše.');
        wrap.appendChild(empty);
      } else {
        datovkaRenderList(wrap, data.zpravy, user);
      }
    })
    .catch(function(e) {
      loading.textContent = 'Chyba: ' + (e.message || 'Nelze načíst zprávy.');
      loading.style.color = 'var(--danger)';
    });
}

function datovkaRenderList(wrap, zpravy, user) {
  var count = document.createElement('div');
  count.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-bottom:10px;';
  count.textContent = zpravy.length + ' zpráv v archivu';
  wrap.appendChild(count);

  zpravy.forEach(function(z) {
    var card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:14px 16px;' +
      'margin-bottom:10px;cursor:pointer;transition:background .15s;';
    card.addEventListener('mouseenter', function() { card.style.background = 'var(--bg-hover)'; });
    card.addEventListener('mouseleave', function() { card.style.background = ''; });

    var row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;align-items:flex-start;gap:10px;justify-content:space-between;flex-wrap:wrap;';

    var sender = document.createElement('div');
    sender.style.cssText = 'font-weight:600;font-size:0.92rem;flex:1;min-width:0;';
    sender.textContent = z.sender || '(neznámý odesílatel)';

    var dateStr = z.ts_zpravy || z.uploaded_at;
    var dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);white-space:nowrap;flex-shrink:0;';
    dateEl.textContent = datovkaFmtDate(dateStr);

    row1.appendChild(sender);
    row1.appendChild(dateEl);

    var row2 = document.createElement('div');
    row2.style.cssText = 'font-size:0.88rem;color:var(--text-secondary,var(--text-light));margin-top:4px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    row2.textContent = z.annotation;

    var row3 = document.createElement('div');
    row3.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;';

    if (z.sender_isds) {
      var isdsEl = document.createElement('span');
      isdsEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);font-family:monospace;';
      isdsEl.textContent = 'ID: ' + z.sender_isds;
      row3.appendChild(isdsEl);
    }

    if (z.personal_delivery) {
      var pd = document.createElement('span');
      pd.className = 'badge badge-warning';
      pd.textContent = 'Do vlastních rukou';
      row3.appendChild(pd);
    }

    var cnt = document.createElement('span');
    cnt.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
    cnt.textContent = '\uD83D\uDCCE ' + z.prilohy_count + ' příloh';
    row3.appendChild(cnt);

    // Tlačítka
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-left:auto;';

    var detBtn = document.createElement('button');
    detBtn.className = 'btn btn-secondary btn-sm';
    detBtn.textContent = 'Zobrazit';
    detBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      datovkaShowDetail(z.id);
    });
    btnRow.appendChild(detBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-secondary btn-sm';
    delBtn.style.color = 'var(--danger)';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showConfirmModal(
        'Smazat zprávu?',
        'Budou smazána i všechna přílohy. Akce je nevratná.',
        function() {
          Api.apiPost('api/datovka.php?action=delete', { id: z.id })
            .then(function() { datovkaLoadList(wrap, user); })
            .catch(function(err) { showToast(err.message || 'Chyba při mazání', 'error'); });
        }
      );
    });
    btnRow.appendChild(delBtn);
    row3.appendChild(btnRow);

    card.appendChild(row1);
    card.appendChild(row2);
    card.appendChild(row3);
    card.addEventListener('click', function() { datovkaShowDetail(z.id); });
    wrap.appendChild(card);
  });
}

function datovkaShowDetail(zpravaId) {
  Api.apiGet('api/datovka.php?action=detail&id=' + zpravaId)
    .then(function(data) { datovkaOpenModal(data.zprava, data.prilohy); })
    .catch(function(e) { showToast(e.message || 'Chyba při načítání', 'error'); });
}

function datovkaOpenModal(z, prilohy) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;' +
    'display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:700px;' +
    'box-shadow:0 12px 48px rgba(0,0,0,0.3);overflow:hidden;';

  // Hlavička
  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:20px 24px 16px;border-bottom:1px solid var(--border);' +
    'display:flex;align-items:flex-start;gap:12px;';
  var hdrIcon = document.createElement('span');
  hdrIcon.style.fontSize = '1.5rem';
  hdrIcon.textContent = '\uD83D\uDCEC';
  var hdrInfo = document.createElement('div');
  hdrInfo.style.cssText = 'flex:1;min-width:0;';
  var hdrTitle = document.createElement('h3');
  hdrTitle.style.cssText = 'margin:0 0 4px;font-size:1rem;line-height:1.3;word-break:break-word;';
  hdrTitle.textContent = z.annotation;
  var hdrSub = document.createElement('div');
  hdrSub.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  hdrSub.textContent = 'Od: ' + z.sender + (z.sender_isds ? ' [' + z.sender_isds + ']' : '');
  hdrInfo.appendChild(hdrTitle);
  hdrInfo.appendChild(hdrSub);
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-light);flex-shrink:0;';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  hdr.appendChild(hdrIcon);
  hdr.appendChild(hdrInfo);
  hdr.appendChild(closeBtn);

  // Metadata
  var meta = document.createElement('div');
  meta.style.cssText = 'padding:16px 24px;border-bottom:1px solid var(--border);' +
    'display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:0.88rem;';
  var metaFields = [
    ['ID zprávy', z.dm_id],
    ['Datum', datovkaFmtDate(z.ts_zpravy || z.uploaded_at)],
    ['Příjemce', z.recipient],
    ['Č. jednací', z.sender_ref || '—'],
    ['Do vlastních rukou', z.personal_delivery ? 'Ano' : 'Ne'],
  ];
  metaFields.forEach(function(f) {
    var lbl = document.createElement('div');
    lbl.style.cssText = 'color:var(--text-light);white-space:nowrap;';
    lbl.textContent = f[0] + ':';
    var val = document.createElement('div');
    val.textContent = f[1];
    meta.appendChild(lbl);
    meta.appendChild(val);
  });

  // Přílohy
  var priBody = document.createElement('div');
  priBody.style.padding = '16px 24px 20px';

  var priTitle = document.createElement('div');
  priTitle.style.cssText = 'font-weight:600;font-size:0.9rem;margin-bottom:10px;';
  priTitle.textContent = 'Přílohy (' + prilohy.length + ')';
  priBody.appendChild(priTitle);

  if (!prilohy.length) {
    var np = document.createElement('div');
    np.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
    np.textContent = 'Zpráva neobsahuje žádné přílohy.';
    priBody.appendChild(np);
  }

  // Preview oblast
  var previewArea = document.createElement('div');
  previewArea.style.cssText = 'margin-top:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;display:none;';

  prilohy.forEach(function(p) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;' +
      'border-bottom:1px solid var(--border);';
    row.style.borderBottom = prilohy.indexOf(p) < prilohy.length - 1 ? '1px solid var(--border)' : 'none';

    var icon = document.createElement('span');
    icon.textContent = datovkaFileIcon(p.mimetype);
    icon.style.fontSize = '1.2rem';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    var fname = document.createElement('div');
    fname.style.cssText = 'font-size:0.88rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    fname.textContent = p.filename;
    var fmeta = document.createElement('div');
    fmeta.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
    fmeta.textContent = datovkaFmtSize(p.file_size) + ' · ' + p.mimetype;
    info.appendChild(fname);
    info.appendChild(fmeta);

    var btnGrp = document.createElement('div');
    btnGrp.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

    // Náhled (pro HTML, PDF)
    var canPreview = p.mimetype === 'text/html' || p.mimetype === 'application/pdf';
    if (canPreview) {
      var previewBtn = document.createElement('button');
      previewBtn.className = 'btn btn-secondary btn-sm';
      previewBtn.textContent = 'Náhled';
      previewBtn.addEventListener('click', function() {
        datovkaShowPreview(previewArea, p);
      });
      btnGrp.appendChild(previewBtn);
    }

    var dlBtn = document.createElement('a');
    dlBtn.className = 'btn btn-secondary btn-sm';
    dlBtn.href = 'api/datovka.php?action=download&priloha_id=' + p.id;
    dlBtn.download = p.filename;
    dlBtn.textContent = 'Stáhnout';
    btnGrp.appendChild(dlBtn);

    row.appendChild(icon);
    row.appendChild(info);
    row.appendChild(btnGrp);
    priBody.appendChild(row);
  });

  priBody.appendChild(previewArea);

  modal.appendChild(hdr);
  modal.appendChild(meta);
  modal.appendChild(priBody);
  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

function datovkaShowPreview(area, p) {
  area.style.display = '';
  area.replaceChildren();
  area.style.cssText = 'margin-top:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;';

  var pbar = document.createElement('div');
  pbar.style.cssText = 'padding:8px 12px;background:var(--bg-hover);border-bottom:1px solid var(--border);' +
    'display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--text-light);';
  pbar.textContent = 'Náhled: ' + p.filename;
  var closeP = document.createElement('button');
  closeP.style.cssText = 'margin-left:auto;background:none;border:none;cursor:pointer;font-size:1rem;color:var(--text-light);';
  closeP.textContent = '\u00d7';
  closeP.addEventListener('click', function() { area.style.display = 'none'; area.replaceChildren(); });
  pbar.appendChild(closeP);
  area.appendChild(pbar);

  if (p.mimetype === 'text/html') {
    var iframe = document.createElement('iframe');
    iframe.src = 'api/datovka.php?action=download&priloha_id=' + p.id + '&inline=1';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    iframe.style.cssText = 'width:100%;height:500px;border:none;background:#fff;';
    area.appendChild(iframe);
  } else if (p.mimetype === 'application/pdf') {
    var iframe2 = document.createElement('iframe');
    iframe2.src = 'api/datovka.php?action=download&priloha_id=' + p.id + '&inline=1';
    iframe2.style.cssText = 'width:100%;height:600px;border:none;';
    area.appendChild(iframe2);
  }
}

function datovkaFmtDate(s) {
  if (!s) return '—';
  var d = new Date(s.replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function datovkaFmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' kB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function datovkaFileIcon(mime) {
  if (mime === 'application/pdf') return '\uD83D\uDCC4';
  if (mime === 'text/html') return '\uD83C\uDF10';
  if (mime === 'text/xml' || mime === 'application/xml') return '\uD83D\uDCDD';
  if (mime.startsWith('image/')) return '\uD83D\uDDBC\uFE0F';
  return '\uD83D\uDCCE';
}
