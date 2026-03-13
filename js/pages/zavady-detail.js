/* ===== ZÁVADY — DETAIL MODAL ===== */

function zavadyShowDetail(zavadaId, user, onRefresh) {
  var isPriv = isPrivileged(user);

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;padding:0;'
    + 'max-width:640px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25);max-height:90vh;'
    + 'overflow-y:auto;';

  var loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'padding:32px;text-align:center;color:var(--text-light);';
  loadingEl.textContent = 'Na\u010d\u00edt\u00e1m detail\u2026';
  modal.appendChild(loadingEl);

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  function close() { document.body.removeChild(overlay); }

  Api.apiGet('api/zavady.php?action=get&id=' + zavadaId)
    .then(function(data) {
      modal.replaceChildren();
      renderDetail(modal, data.zavada, data.historie || [], user, isPriv, close, onRefresh);
    })
    .catch(function(e) {
      loadingEl.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst.');
      loadingEl.style.color = 'var(--danger)';
    });
}

function renderDetail(modal, z, historie, user, isPriv, closeFn, onRefresh) {
  var stavInfo = ZAVADY_STAVY[z.stav] || { label: z.stav, cls: '' };
  var prioInfo = ZAVADY_PRIORITY[z.priorita] || { label: z.priorita, cls: '' };

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:20px 24px 14px;border-bottom:1px solid var(--border);';

  var titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;';

  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1.1rem;flex:1;';
  titleEl.textContent = z.nazev;
  titleRow.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.style.cssText = 'padding:4px 10px;font-size:1rem;flex-shrink:0;';
  closeBtn.textContent = '\u2715';
  closeBtn.addEventListener('click', closeFn);
  titleRow.appendChild(closeBtn);
  hdr.appendChild(titleRow);

  var badgeRow = document.createElement('div');
  badgeRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';
  var sb = document.createElement('span');
  sb.className = 'badge ' + stavInfo.cls;
  sb.textContent = stavInfo.label;
  badgeRow.appendChild(sb);
  var pb = document.createElement('span');
  pb.className = 'badge ' + prioInfo.cls;
  pb.textContent = 'Priorita: ' + prioInfo.label;
  badgeRow.appendChild(pb);
  hdr.appendChild(badgeRow);
  modal.appendChild(hdr);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:18px 24px;';

  // Info grid
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:0.88rem;margin-bottom:16px;';

  function addRow(label, value) {
    if (!value) return;
    var lbl = document.createElement('div');
    lbl.style.cssText = 'color:var(--text-light);font-weight:500;';
    lbl.textContent = label;
    var val = document.createElement('div');
    val.textContent = value;
    grid.appendChild(lbl); grid.appendChild(val);
  }

  addRow('M\u00edsto', z.lokace);
  addRow('Nahl\u00e1sil/a', ((z.autor_jmeno || '') + ' ' + (z.autor_prijmeni || '')).trim());
  addRow('Datum', new Date(z.created_at).toLocaleString('cs-CZ'));
  addRow('Zodpov\u011bdn\u00e1 osoba', z.zodpovedna_osoba);
  if (z.uzavreno_at) addRow('Uzav\u0159eno', new Date(z.uzavreno_at).toLocaleString('cs-CZ'));
  body.appendChild(grid);

  // Popis
  var popisEl = document.createElement('div');
  popisEl.style.cssText = 'background:var(--bg-hover);border-radius:8px;padding:12px 14px;'
    + 'font-size:0.9rem;margin-bottom:16px;white-space:pre-wrap;word-break:break-word;';
  popisEl.textContent = z.popis;
  body.appendChild(popisEl);

  // Foto
  if (z.foto_cesta) {
    var fotoWrap = document.createElement('div');
    fotoWrap.style.cssText = 'margin-bottom:16px;';
    var img = document.createElement('img');
    img.src = 'api/zavady.php?action=photo&id=' + z.id;
    img.alt = 'Fotka z\u00e1vady';
    img.style.cssText = 'max-width:100%;max-height:300px;border-radius:8px;border:1px solid var(--border);cursor:pointer;';
    img.addEventListener('click', function() { window.open(img.src, '_blank'); });
    fotoWrap.appendChild(img);
    body.appendChild(fotoWrap);
  }

  // Admin controls
  if (isPriv) {
    var ctrlCard = document.createElement('div');
    ctrlCard.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:16px;';
    var ctrlHdr = document.createElement('div');
    ctrlHdr.style.cssText = 'font-weight:600;font-size:0.85rem;color:var(--text-light);'
      + 'text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;';
    ctrlHdr.textContent = 'Spr\u00e1va z\u00e1vady';
    ctrlCard.appendChild(ctrlHdr);

    var ctrlGrid = document.createElement('div');
    ctrlGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

    // Status select
    var stavWrap = document.createElement('div');
    var stavLbl = document.createElement('label');
    stavLbl.textContent = 'Stav';
    stavLbl.style.cssText = 'display:block;font-size:0.85rem;font-weight:500;margin-bottom:3px;';
    var stavSel = document.createElement('select');
    stavSel.className = 'form-input';
    Object.keys(ZAVADY_STAVY).forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k; opt.textContent = ZAVADY_STAVY[k].label;
      if (k === z.stav) opt.selected = true;
      stavSel.appendChild(opt);
    });
    stavWrap.appendChild(stavLbl); stavWrap.appendChild(stavSel);
    ctrlGrid.appendChild(stavWrap);

    // Priority select
    var prioWrap = document.createElement('div');
    var prioLbl = document.createElement('label');
    prioLbl.textContent = 'Priorita';
    prioLbl.style.cssText = 'display:block;font-size:0.85rem;font-weight:500;margin-bottom:3px;';
    var prioSel = document.createElement('select');
    prioSel.className = 'form-input';
    Object.keys(ZAVADY_PRIORITY).forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k; opt.textContent = ZAVADY_PRIORITY[k].label;
      if (k === z.priorita) opt.selected = true;
      prioSel.appendChild(opt);
    });
    prioWrap.appendChild(prioLbl); prioWrap.appendChild(prioSel);
    ctrlGrid.appendChild(prioWrap);

    ctrlCard.appendChild(ctrlGrid);

    // Zodpovedna osoba
    var zodpWrap = document.createElement('div');
    zodpWrap.style.marginTop = '10px';
    var zodpLbl = document.createElement('label');
    zodpLbl.textContent = 'Zodpov\u011bdn\u00e1 osoba / firma';
    zodpLbl.style.cssText = 'display:block;font-size:0.85rem;font-weight:500;margin-bottom:3px;';
    var zodpInp = document.createElement('input');
    zodpInp.type = 'text'; zodpInp.className = 'form-input';
    zodpInp.value = z.zodpovedna_osoba || '';
    zodpInp.placeholder = 'Nap\u0159. Spr\u00e1vcovsk\u00e1 firma s.r.o.';
    zodpWrap.appendChild(zodpLbl); zodpWrap.appendChild(zodpInp);
    ctrlCard.appendChild(zodpWrap);

    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.style.marginTop = '12px';
    saveBtn.textContent = 'Ulo\u017eit zm\u011bny';
    saveBtn.addEventListener('click', function() {
      saveBtn.disabled = true;
      Api.apiPost('api/zavady.php?action=update', {
        id: z.id,
        stav: stavSel.value,
        priorita: prioSel.value,
        zodpovedna_osoba: zodpInp.value.trim(),
      })
        .then(function() {
          showToast('Z\u00e1vada aktualizov\u00e1na.');
          closeFn(); onRefresh();
        })
        .catch(function(e) { showToast(e.message || 'Chyba', 'error'); saveBtn.disabled = false; });
    });
    ctrlCard.appendChild(saveBtn);

    // Delete button (admin only)
    if (user.role === 'admin') {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-secondary btn-sm';
      delBtn.style.cssText = 'margin-top:12px;margin-left:8px;color:var(--danger);';
      delBtn.textContent = 'Smazat z\u00e1vadu';
      delBtn.addEventListener('click', function() {
        showConfirmModal('Smazat z\u00e1vadu', 'Z\u00e1vada bude trvale smaz\u00e1na v\u010detn\u011b historie.', function() {
          Api.apiPost('api/zavady.php?action=delete', { id: z.id })
            .then(function() { showToast('Z\u00e1vada smaz\u00e1na.'); closeFn(); onRefresh(); })
            .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
        });
      });
      ctrlCard.appendChild(delBtn);
    }

    body.appendChild(ctrlCard);
  }

  // Timeline
  if (historie.length) {
    var tlHdr = document.createElement('div');
    tlHdr.style.cssText = 'font-weight:600;font-size:0.9rem;margin-bottom:10px;';
    tlHdr.textContent = 'Historie a koment\u00e1\u0159e';
    body.appendChild(tlHdr);

    var tl = document.createElement('div');
    tl.style.cssText = 'border-left:2px solid var(--border);padding-left:16px;margin-bottom:16px;';

    historie.forEach(function(h) {
      var item = document.createElement('div');
      item.style.cssText = 'margin-bottom:14px;position:relative;';

      var dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;left:-22px;top:4px;width:10px;height:10px;'
        + 'border-radius:50%;background:var(--border);';
      if (h.typ === 'komentar') dot.style.background = 'var(--accent)';
      if (h.typ === 'zmena_stavu') dot.style.background = 'var(--warning, #f59e0b)';
      item.appendChild(dot);

      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-bottom:2px;';
      var who = ((h.jmeno || '') + ' ' + (h.prijmeni || '')).trim();
      meta.textContent = who + ' \u00b7 ' + new Date(h.created_at).toLocaleString('cs-CZ');
      item.appendChild(meta);

      var content = document.createElement('div');
      content.style.cssText = 'font-size:0.88rem;';

      if (h.typ === 'zmena_stavu') {
        var oldS = ZAVADY_STAVY[h.stary_stav] || { label: h.stary_stav || '?' };
        var newS = ZAVADY_STAVY[h.novy_stav]  || { label: h.novy_stav || '?' };
        content.textContent = 'Zm\u011bna stavu: ' + (oldS.label || '') + ' \u2192 ' + newS.label;
        content.style.fontWeight = '500';
      } else if (h.typ === 'zmena_priority') {
        var oldP = ZAVADY_PRIORITY[h.stary_stav] || { label: h.stary_stav || '?' };
        var newP = ZAVADY_PRIORITY[h.novy_stav]  || { label: h.novy_stav || '?' };
        content.textContent = 'Zm\u011bna priority: ' + oldP.label + ' \u2192 ' + newP.label;
      } else if (h.typ === 'prirazeni') {
        content.textContent = 'P\u0159i\u0159azeno: ' + (h.text || '');
        content.style.fontWeight = '500';
      } else {
        content.style.cssText += 'background:var(--bg-hover);border-radius:6px;padding:8px 10px;'
          + 'white-space:pre-wrap;word-break:break-word;';
        content.textContent = h.text || '';
      }

      item.appendChild(content);
      tl.appendChild(item);
    });
    body.appendChild(tl);
  }

  // Comment form
  var commentWrap = document.createElement('div');
  commentWrap.style.cssText = 'border-top:1px solid var(--border);padding-top:14px;';

  var cmtLbl = document.createElement('label');
  cmtLbl.textContent = 'P\u0159idat koment\u00e1\u0159';
  cmtLbl.style.cssText = 'display:block;font-weight:500;font-size:0.88rem;margin-bottom:4px;';
  commentWrap.appendChild(cmtLbl);

  var cmtTa = document.createElement('textarea');
  cmtTa.className = 'form-input';
  cmtTa.rows = 2;
  cmtTa.placeholder = 'Va\u0161e pozn\u00e1mka k z\u00e1vad\u011b\u2026';
  commentWrap.appendChild(cmtTa);

  var cmtBtn = document.createElement('button');
  cmtBtn.className = 'btn btn-primary btn-sm';
  cmtBtn.style.marginTop = '8px';
  cmtBtn.textContent = 'Odeslat koment\u00e1\u0159';
  cmtBtn.addEventListener('click', function() {
    var txt = cmtTa.value.trim();
    if (!txt) { showToast('Koment\u00e1\u0159 nesm\u00ed b\u00fdt pr\u00e1zdn\u00fd.', 'error'); return; }
    cmtBtn.disabled = true;
    Api.apiPost('api/zavady.php?action=comment', { zavada_id: z.id, text: txt })
      .then(function() {
        showToast('Koment\u00e1\u0159 p\u0159id\u00e1n.');
        closeFn(); onRefresh();
      })
      .catch(function(e) { showToast(e.message || 'Chyba', 'error'); cmtBtn.disabled = false; });
  });
  commentWrap.appendChild(cmtBtn);
  body.appendChild(commentWrap);

  modal.appendChild(body);
}
