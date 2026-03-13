/* ===== Správa parkovacích míst ===== */

var PARK_TYPY = [
  { value: 'garaz',    label: 'Gar\xe1\u017e',            icon: '\uD83C\uDFD7' },
  { value: 'stani',    label: 'Gar\xe1\u017eov\xe9 st\xe1n\xed', icon: '\uD83D\uDE97' },
  { value: 'venkovni', label: 'Venkovn\xed st\xe1n\xed',  icon: '\uD83C\uDD7F' },
  { value: 'moto',     label: 'Motocykl',                  icon: '\uD83C\uDFCD' },
  { value: 'jine',     label: 'Jin\xe9',                   icon: '\uD83D\uDD11' },
];

function parkTypLabel(typ) {
  var t = PARK_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.label : typ;
}
function parkTypIcon(typ) {
  var t = PARK_TYPY.find(function(x) { return x.value === typ; });
  return t ? t.icon : '\uD83C\uDD7F';
}

function renderParkovaniCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Parkovac\xed m\xedsta');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Evidence parkovac\xedch m\xedst — gar\xe1\u017ee, gar\xe1\u017eov\xe1 a venkovn\xed st\xe1n\xed. P\u0159i\u0159azen\xed k jednotce nebo n\xe1jemci.';
  body.appendChild(hint);

  var isPriv = isPrivileged(user);

  var listWrap = document.createElement('div');
  body.appendChild(listWrap);

  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  body.appendChild(formWrap);

  var addBtn = null;
  if (isPriv) {
    addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.style.marginTop = '12px';
    addBtn.textContent = '+ P\u0159idat st\xe1n\xed';
    addBtn.addEventListener('click', function() {
      parkShowForm(formWrap, null, listWrap, user, addBtn);
    });
    body.appendChild(addBtn);
  }

  el.appendChild(card.card);
  parkLoad(listWrap, formWrap, user);
}

function parkLoad(listWrap, formWrap, user) {
  listWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/parkovani.php?action=list')
    .then(function(data) { parkRenderList(listWrap, formWrap, data.stani, user); })
    .catch(function() {
      listWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed.';
      listWrap.appendChild(err);
    });
}

function parkRenderList(listWrap, formWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = isPrivileged(user);

  if (!items.length) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0 0 4px;';
    empty.textContent = 'Zatím nejsou evidov\xe1na \u017e\xe1dn\xe1 parkovac\xed m\xedsta.';
    listWrap.appendChild(empty);
    return;
  }

  // Seskupení podle typu
  var grouped = {};
  PARK_TYPY.forEach(function(t) { grouped[t.value] = []; });
  items.forEach(function(s) {
    if (grouped[s.typ]) grouped[s.typ].push(s);
    else grouped['jine'].push(s);
  });

  PARK_TYPY.forEach(function(kat) {
    var skupina = grouped[kat.value];
    if (!skupina.length) return;

    var sekce = document.createElement('div');
    sekce.style.marginBottom = '14px';

    var sHead = document.createElement('div');
    sHead.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;';
    sHead.textContent = kat.icon + ' ' + kat.label + ' (' + skupina.length + ')';
    sekce.appendChild(sHead);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;';

    skupina.forEach(function(s) {
      var box = document.createElement('div');
      box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);' +
        'border-radius:6px;padding:10px 12px;';

      var cisloEl = document.createElement('div');
      cisloEl.style.cssText = 'font-weight:700;font-size:1rem;margin-bottom:4px;';
      cisloEl.textContent = 'St\xe1n\xed \u010d. ' + s.cislo;
      box.appendChild(cisloEl);

      if (s.cislo_jednotky) {
        var jedn = document.createElement('div');
        jedn.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
        jedn.textContent = 'Jednotka: ' + s.cislo_jednotky;
        box.appendChild(jedn);
      }
      if (s.najemce) {
        var naj = document.createElement('div');
        naj.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
        naj.textContent = 'N\xe1jemce: ' + s.najemce;
        box.appendChild(naj);
      }
      if (!s.cislo_jednotky && !s.najemce) {
        var volne = document.createElement('div');
        volne.style.cssText = 'font-size:0.82rem;color:var(--accent);';
        volne.textContent = 'Voln\xe9';
        box.appendChild(volne);
      }
      if (s.poznamka) {
        var poz = document.createElement('div');
        poz.style.cssText = 'font-size:0.82rem;color:var(--text-muted);margin-top:3px;';
        poz.textContent = s.poznamka;
        box.appendChild(poz);
      }

      if (isPriv) {
        var akce = document.createElement('div');
        akce.style.cssText = 'display:flex;gap:6px;margin-top:8px;';

        var editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';
        editBtn.textContent = 'Upravit';
        editBtn.addEventListener('click', function() {
          var addBtn = listWrap.parentElement.querySelector('.btn-primary');
          parkShowForm(
            listWrap.nextElementSibling, s, listWrap, user, addBtn
          );
        });
        akce.appendChild(editBtn);

        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = 'Smazat';
        delBtn.addEventListener('click', function() {
          showConfirmModal(
            'Smazat st\xe1n\xed?',
            'St\xe1n\xed \u010d. ' + s.cislo + ' bude trvale odstran\u011bno.',
            function() {
              Api.apiPost('api/parkovani.php?action=delete&id=' + s.id, {})
                .then(function() {
                  showToast('St\xe1n\xed smaz\xe1no');
                  parkLoad(listWrap, listWrap.nextElementSibling, user);
                })
                .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
            }
          );
        });
        akce.appendChild(delBtn);
        box.appendChild(akce);
      }

      grid.appendChild(box);
    });

    sekce.appendChild(grid);
    listWrap.appendChild(sekce);
  });
}

function parkShowForm(formWrap, stani, listWrap, user, addBtn) {
  formWrap.replaceChildren();
  formWrap.style.display = '';
  if (addBtn) addBtn.style.display = 'none';

  var sep = document.createElement('hr');
  sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:16px 0;';
  formWrap.appendChild(sep);

  var heading = document.createElement('h3');
  heading.style.cssText = 'margin:0 0 16px;font-size:0.95rem;';
  heading.textContent = stani ? 'Upravit st\xe1n\xed' : 'P\u0159idat st\xe1n\xed';
  formWrap.appendChild(heading);

  var cisloField = makeAdminField('\u010c\xedslo st\xe1n\xed', 'text', 'park_cislo', stani ? stani.cislo : '');
  cisloField.input.placeholder = 'nap\u0159. 12 nebo A3';
  formWrap.appendChild(cisloField.el);

  // Typ
  var typWrap = document.createElement('div');
  typWrap.style.marginBottom = '14px';
  var typLabel = document.createElement('label');
  typLabel.textContent = 'Typ';
  typLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var typSelect = document.createElement('select');
  typSelect.className = 'form-input';
  typSelect.style.maxWidth = '220px';
  PARK_TYPY.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.icon + ' ' + t.label;
    if (stani && stani.typ === t.value) opt.selected = true;
    typSelect.appendChild(opt);
  });
  typWrap.appendChild(typLabel);
  typWrap.appendChild(typSelect);
  formWrap.appendChild(typWrap);

  var jednField = makeAdminField('\u010c\xedslo jednotky (nepovinné)', 'text', 'park_jedn',
    stani ? (stani.cislo_jednotky || '') : '');
  jednField.input.placeholder = 'nap\u0159. 12';
  formWrap.appendChild(jednField.el);

  var najField = makeAdminField('N\xe1jemce (nepovinné)', 'text', 'park_naj',
    stani ? (stani.najemce || '') : '');
  najField.input.placeholder = 'nap\u0159. Jan Nov\xe1k';
  formWrap.appendChild(najField.el);

  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input';
  pozInput.rows = 2;
  pozInput.value = stani ? (stani.poznamka || '') : '';
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  formWrap.appendChild(pozWrap);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Ulo\u017eit';
  btnRow.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() {
    formWrap.style.display = 'none';
    formWrap.replaceChildren();
    if (addBtn) addBtn.style.display = '';
  });
  btnRow.appendChild(cancelBtn);
  formWrap.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    var cislo = cisloField.input.value.trim();
    if (!cislo) { showToast('Vyplňte \u010d\xedslo st\xe1n\xed.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    Api.apiPost('api/parkovani.php?action=save', {
      id: stani ? stani.id : '',
      cislo: cislo, typ: typSelect.value,
      cislo_jednotky: jednField.input.value.trim(),
      najemce: najField.input.value.trim(),
      poznamka: pozInput.value.trim(),
    }).then(function() {
      showToast('St\xe1n\xed ulo\u017eeno');
      formWrap.style.display = 'none';
      formWrap.replaceChildren();
      if (addBtn) addBtn.style.display = '';
      parkLoad(listWrap, formWrap, user);
    }).catch(function(e) { showToast(e.message || 'Chyba.', 'error'); })
      .finally(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Ulo\u017eit';
      });
  });
}
