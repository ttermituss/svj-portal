/* ===== Revize — závady zjištěné při revizi ===== */

var RZ_ZAVAZNOSTI = [
  { value: 'nizka',    label: 'N\u00edzk\u00e1',    color: 'var(--text-light)' },
  { value: 'stredni',  label: 'St\u0159edn\u00ed',   color: 'var(--warning-dark, #f08600)' },
  { value: 'vysoka',   label: 'Vysok\u00e1',         color: 'var(--danger)' },
  { value: 'kriticka', label: 'Kritick\u00e1',       color: '#b71c1c' },
];

var RZ_STAVY = [
  { value: 'nova',      label: 'Nov\u00e1',       icon: '\u26a0\ufe0f', color: 'var(--warning-dark, #f08600)' },
  { value: 'v_reseni',  label: 'V \u0159e\u0161en\u00ed', icon: '\uD83D\uDD27', color: 'var(--primary)' },
  { value: 'vyresena',  label: 'Vy\u0159e\u0161ena',      icon: '\u2705', color: 'var(--accent)' },
];

function rzZavaznostInfo(val) {
  return RZ_ZAVAZNOSTI.find(function(z) { return z.value === val; }) || RZ_ZAVAZNOSTI[1];
}

function rzStavInfo(val) {
  return RZ_STAVY.find(function(s) { return s.value === val; }) || RZ_STAVY[0];
}

/**
 * Render z\u00e1vady section inside a revize_historie row.
 * @param {HTMLElement} parent — container element
 * @param {object} historieRecord — the revize_historie record
 * @param {boolean} isPriv — admin/vybor
 */
function rzRenderSection(parent, historieRecord, isPriv) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);';

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';

  var title = document.createElement('span');
  title.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);';
  title.textContent = '\u26a0\ufe0f Z\u00e1vady';
  header.appendChild(title);

  if (isPriv) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-sm';
    addBtn.style.fontSize = '0.78rem';
    addBtn.textContent = '+ P\u0159idat z\u00e1vadu';
    addBtn.addEventListener('click', function() {
      rzShowForm(listWrap, historieRecord.id, null, isPriv);
    });
    header.appendChild(addBtn);
  }

  wrap.appendChild(header);

  var listWrap = document.createElement('div');
  wrap.appendChild(listWrap);
  parent.appendChild(wrap);

  rzReload(listWrap, historieRecord.id, isPriv);
}

function rzReload(listWrap, historieId, isPriv) {
  listWrap.replaceChildren();
  var loading = document.createElement('div');
  loading.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  loading.textContent = 'Na\u010d\u00edt\u00e1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/revize_zavady.php?action=list&revize_historie_id=' + historieId)
    .then(function(data) {
      listWrap.replaceChildren();
      var items = data.zavady || [];
      if (!items.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'font-size:0.82rem;color:var(--text-light);font-style:italic;';
        empty.textContent = '\u017d\u00e1dn\u00e9 z\u00e1vady.';
        listWrap.appendChild(empty);
        return;
      }
      items.forEach(function(z) {
        rzRenderRow(listWrap, z, historieId, isPriv);
      });
    })
    .catch(function() {
      listWrap.replaceChildren();
    });
}

function rzRenderRow(parent, zavada, historieId, isPriv) {
  var row = document.createElement('div');
  row.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border-light);font-size:0.82rem;';

  // Line 1: severity badge + description + status badge
  var line1 = document.createElement('div');
  line1.style.cssText = 'display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;';

  var sevInfo = rzZavaznostInfo(zavada.zavaznost);
  var sevBadge = document.createElement('span');
  sevBadge.className = 'badge';
  sevBadge.style.cssText = 'font-size:0.82rem;color:#fff;background:' + sevInfo.color + ';flex-shrink:0;';
  sevBadge.textContent = sevInfo.label;
  line1.appendChild(sevBadge);

  var desc = document.createElement('span');
  desc.style.cssText = 'flex:1;';
  desc.textContent = zavada.popis;
  line1.appendChild(desc);

  var stavInfo = rzStavInfo(zavada.stav);
  var stavBadge = document.createElement('span');
  stavBadge.className = 'badge';
  stavBadge.style.cssText = 'font-size:0.82rem;flex-shrink:0;';
  stavBadge.textContent = stavInfo.icon + ' ' + stavInfo.label;
  line1.appendChild(stavBadge);

  row.appendChild(line1);

  // Line 2: deadline + actions
  var line2 = document.createElement('div');
  line2.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:4px;font-size:0.82rem;color:var(--text-light);';

  if (zavada.termin_odstraneni) {
    var deadline = document.createElement('span');
    var dObj = new Date(zavada.termin_odstraneni + 'T00:00:00');
    var isOverdue = zavada.stav !== 'vyresena' && dObj < new Date();
    deadline.style.color = isOverdue ? 'var(--danger)' : 'var(--text-light)';
    deadline.textContent = '\u23f0 Term\u00edn: ' + dObj.toLocaleDateString('cs-CZ') + (isOverdue ? ' (po term\u00ednu!)' : '');
    line2.appendChild(deadline);
  }

  if (zavada.vyreseno_datum) {
    var solved = document.createElement('span');
    solved.textContent = '\u2705 ' + new Date(zavada.vyreseno_datum + 'T00:00:00').toLocaleDateString('cs-CZ');
    line2.appendChild(solved);
  }

  if (isPriv) {
    var spacer = document.createElement('span');
    spacer.style.flex = '1';
    line2.appendChild(spacer);

    // Status change buttons
    if (zavada.stav !== 'vyresena') {
      var nextStav = zavada.stav === 'nova' ? 'v_reseni' : 'vyresena';
      var nextInfo = rzStavInfo(nextStav);
      var stavBtn = document.createElement('button');
      stavBtn.className = 'btn btn-secondary btn-sm';
      stavBtn.style.fontSize = '0.72rem';
      stavBtn.textContent = nextInfo.icon + ' ' + nextInfo.label;
      stavBtn.addEventListener('click', function() {
        Api.apiPost('api/revize_zavady.php?action=updateStav', { id: zavada.id, stav: nextStav })
          .then(function() { rzReload(parent.parentElement, historieId, isPriv); })
          .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
      });
      line2.appendChild(stavBtn);
    }

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.style.fontSize = '0.72rem';
    editBtn.textContent = '\u270f\ufe0f';
    editBtn.title = 'Upravit';
    editBtn.addEventListener('click', function() {
      rzShowForm(parent.parentElement, historieId, zavada, isPriv);
    });
    line2.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-secondary btn-sm';
    delBtn.style.cssText = 'font-size:0.82rem;color:var(--danger);';
    delBtn.textContent = '\uD83D\uDDD1';
    delBtn.title = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal('Smazat z\u00e1vadu?', zavada.popis, function() {
        Api.apiPost('api/revize_zavady.php?action=delete', { id: zavada.id })
          .then(function() { rzReload(parent.parentElement, historieId, isPriv); })
          .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
      });
    });
    line2.appendChild(delBtn);
  }

  if (line2.childNodes.length) row.appendChild(line2);

  if (zavada.poznamka) {
    var note = document.createElement('div');
    note.style.cssText = 'font-size:0.82rem;color:var(--text-light);font-style:italic;margin-top:2px;';
    note.textContent = zavada.poznamka;
    row.appendChild(note);
  }

  parent.appendChild(row);
}

function rzShowForm(listWrap, historieId, existing, isPriv) {
  // Remove existing form if open
  var oldForm = listWrap.parentElement.querySelector('.rz-form');
  if (oldForm) oldForm.remove();

  var form = document.createElement('div');
  form.className = 'rz-form';
  form.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);'
    + 'padding:12px;margin-top:8px;';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:0.85rem;font-weight:600;margin-bottom:10px;';
  title.textContent = existing ? 'Upravit z\u00e1vadu' : 'Nov\u00e1 z\u00e1vada';
  form.appendChild(title);

  var popisInp = rzFormField(form, 'Popis z\u00e1vady *', 'text', existing ? existing.popis : '');
  var zavazSel = rzFormSelect(form, 'Z\u00e1va\u017enost', RZ_ZAVAZNOSTI, existing ? existing.zavaznost : 'stredni');
  var terminInp = rzFormField(form, 'Term\u00edn odstran\u011bn\u00ed', 'date', existing ? (existing.termin_odstraneni || '') : '');
  var stavSel = rzFormSelect(form, 'Stav', RZ_STAVY, existing ? existing.stav : 'nova');
  var pozInp = rzFormField(form, 'Pozn\u00e1mka', 'text', existing ? (existing.poznamka || '') : '');

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-sm';
  saveBtn.textContent = 'Ulo\u017eit';
  saveBtn.addEventListener('click', function() {
    if (!popisInp.value.trim()) { showToast('Vypl\u0148te popis', 'error'); return; }
    saveBtn.disabled = true;
    var payload = {
      revize_historie_id: historieId,
      id: existing ? existing.id : 0,
      popis: popisInp.value.trim(),
      zavaznost: zavazSel.value,
      termin_odstraneni: terminInp.value || null,
      stav: stavSel.value,
      poznamka: pozInp.value.trim() || null,
    };
    Api.apiPost('api/revize_zavady.php?action=save', payload)
      .then(function() {
        form.remove();
        rzReload(listWrap, historieId, isPriv);
        showToast('Z\u00e1vada ulo\u017eena');
      })
      .catch(function(e) { showToast(e.message || 'Chyba', 'error'); saveBtn.disabled = false; });
  });
  btnRow.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary btn-sm';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() { form.remove(); });
  btnRow.appendChild(cancelBtn);

  form.appendChild(btnRow);
  listWrap.parentElement.appendChild(form);
}

function rzFormField(parent, label, type, value) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:8px;';
  var lbl = document.createElement('label');
  lbl.style.cssText = 'display:block;font-size:0.82rem;color:var(--text-light);margin-bottom:3px;';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  var inp = document.createElement('input');
  inp.type = type;
  inp.className = 'form-control';
  inp.style.cssText = 'width:100%;padding:6px 10px;font-size:0.85rem;';
  inp.value = value;
  wrap.appendChild(inp);
  parent.appendChild(wrap);
  return inp;
}

function rzFormSelect(parent, label, options, selected) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:8px;';
  var lbl = document.createElement('label');
  lbl.style.cssText = 'display:block;font-size:0.82rem;color:var(--text-light);margin-bottom:3px;';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  var sel = document.createElement('select');
  sel.className = 'form-control';
  sel.style.cssText = 'width:100%;padding:6px 10px;font-size:0.85rem;';
  options.forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = (o.icon ? o.icon + ' ' : '') + o.label;
    if (o.value === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  wrap.appendChild(sel);
  parent.appendChild(wrap);
  return sel;
}
