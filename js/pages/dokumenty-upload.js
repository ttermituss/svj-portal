/* ===== DOKUMENTY — UPLOAD KARTA (drag & drop) =====
 * Vyčleněno z dokumenty.js pro dodržení limitu 500 řádků.
 * Funkce: dokRenderUploadCard(el, onSuccess)
 */

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
  zoneSub.textContent = 'nebo klikn\u011bte pro v\xfdb\u011br \u00b7 PDF, Word, Excel, JPEG, PNG, MD, TXT \u00b7 max 20 MB';
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
  previewRemove.addEventListener('mouseenter', function() { previewRemove.style.background = 'var(--danger-light)'; previewRemove.style.color = 'var(--danger)'; });
  previewRemove.addEventListener('mouseleave', function() { previewRemove.style.background = 'var(--bg)'; previewRemove.style.color = 'var(--text-light)'; });
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
  applyGrid(); mq.addEventListener('change', applyGrid);

  /* makeFormField / makeFormField(select) / makeFormField(textarea) → js/ui.js */
  var nazevWrap = makeFormField('N\xe1zev dokumentu *', 'text', '', { placeholder: 'Nap\u0159. Stanovy SVJ 2024' });
  formGrid.appendChild(nazevWrap.el);

  var katWrap = makeFormField('Kategorie', 'select', '',
    { options: Object.entries(DOK_KATEGORIE).map(function(e) { return { value: e[0], label: e[1].ikona + ' ' + e[1].label }; }) });
  formGrid.appendChild(katWrap.el);

  var platnostWrap = makeFormField('Datum platnosti', 'date', '');
  formGrid.appendChild(platnostWrap.el);

  var pristupWrap = makeFormField('Viditelnost', 'select', '', { options: [
    { value: 'vsichni', label: '\uD83D\uDD13 V\u0161ichni \u010dlenov\xe9' },
    { value: 'vybor',   label: '\uD83D\uDD12 Pouze v\xfdbor' },
  ]});
  formGrid.appendChild(pristupWrap.el);

  var pozWrap = makeFormField('Pozn\xe1mka', 'textarea', '', { placeholder: 'Voliteln\xe1 pozn\xe1mka ke dokumentu\u2026', rows: 2 });
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
  progress.appendChild(progressBar); progress.appendChild(progressLabel);
  form.appendChild(progress);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px;';
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = '\u2191 Nahr\xe1t';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  btnRow.appendChild(saveBtn); btnRow.appendChild(cancelBtn);
  form.appendChild(btnRow);

  /* === Logika === */
  function dokSetFile(file) {
    if (!file) return;
    var ext = file.name.split('.').pop().toLowerCase();
    if (DOK_ALLOWED_EXT.indexOf(ext) === -1) {
      showToast('Nepodporovan\xfd form\xe1t \u201e.' + ext + '\u201c. Povoleny: PDF, Word, Excel, obr\xe1zky, MD, TXT', 'error');
      fileInput.value = ''; return;
    }
    if (file.size > 20 * 1024 * 1024) { showToast('Soubor je p\u0159\xedli\u0161 velk\xfd (max 20 MB).', 'error'); fileInput.value = ''; return; }
    previewIcon.textContent = dokFileIcon(ext);
    previewName.textContent = file.name;
    var fm = DOK_FILE_META[ext] || { ext: ext.toUpperCase() };
    previewMeta.textContent = (fm.ext || ext.toUpperCase()) + ' \u00b7 ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
    preview.style.display = 'flex'; zone.style.display = 'none'; form.style.display = '';
    if (!nazevWrap.input.value) nazevWrap.input.value = file.name.replace(/\.[^.]+$/, '');
    var kat = dokGuessKategorie(file.name);
    if (kat) katWrap.input.value = kat;
  }

  function dokClearFile() {
    fileInput.value = ''; preview.style.display = 'none'; zone.style.display = ''; form.style.display = 'none';
    progress.style.display = 'none'; progressFill.style.width = '0%'; nazevWrap.input.value = ''; pozWrap.input.value = ''; platnostWrap.input.value = '';
  }

  zone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() { if (fileInput.files[0]) dokSetFile(fileInput.files[0]); });
  previewRemove.addEventListener('click', dokClearFile);
  cancelBtn.addEventListener('click', dokClearFile);

  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; zone.style.background = 'var(--accent-light)'; zoneIcon.style.opacity = '1'; });
  zone.addEventListener('dragleave', function() { zone.style.borderColor = 'var(--border)'; zone.style.background = 'var(--bg)'; zoneIcon.style.opacity = '.5'; });
  zone.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation();
    zone.style.borderColor = 'var(--border)'; zone.style.background = 'var(--bg)'; zoneIcon.style.opacity = '.5';
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { try { var dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; } catch (_) {} dokSetFile(f); }
  });

  saveBtn.addEventListener('click', function() {
    var file = fileInput.files[0];
    if (!file) { showToast('Vyberte soubor.', 'error'); return; }
    var nazev = nazevWrap.input.value.trim();
    if (!nazev) { showToast('Zadejte n\xe1zev dokumentu.', 'error'); return; }
    saveBtn.disabled = true; cancelBtn.disabled = true; progress.style.display = '';
    var pct = 0;
    var pTimer = setInterval(function() { pct = Math.min(pct + Math.random() * 15, 85); progressFill.style.width = pct + '%'; }, 200);
    var fd = new FormData();
    fd.append('nazev', nazev); fd.append('kategorie', katWrap.input.value);
    fd.append('pristup', pristupWrap.input.value); fd.append('datum_platnosti', platnostWrap.input.value);
    fd.append('popis', pozWrap.input.value.trim()); fd.append('soubor', file);
    fetch('api/dokumenty.php?action=upload', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        clearInterval(pTimer); progressFill.style.width = '100%';
        setTimeout(function() { dokClearFile(); showToast('Dokument nahr\xe1n'); handleGdriveFeedback(data); onSuccess(); }, 300);
      })
      .catch(function(e) {
        clearInterval(pTimer); showToast(e.message || 'Chyba p\u0159i nahr\xe1v\xe1n\xed.', 'error');
        saveBtn.disabled = false; cancelBtn.disabled = false; progress.style.display = 'none';
      });
  });
}
