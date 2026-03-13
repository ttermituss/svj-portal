/* ===== PENB — Průkaz energetické náročnosti ===== */

function penbBarva(trida) {
  var el = document.createElement('span');
  var map = { A:'--penb-a', B:'--penb-b', C:'--penb-c', D:'--penb-d', E:'--penb-e', F:'--penb-f', G:'--penb-g' };
  var v = map[trida] || '--penb-g';
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
}
var PENB_BARVY = {
  get A() { return penbBarva('A'); }, get B() { return penbBarva('B'); }, get C() { return penbBarva('C'); },
  get D() { return penbBarva('D'); }, get E() { return penbBarva('E'); }, get F() { return penbBarva('F'); }, get G() { return penbBarva('G'); },
};

function renderPenbCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('PENB \u2014 Pr\u016fkaz energetick\xe9 n\xe1ro\u010dnosti');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 14px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Pr\u016fkaz energetick\xe9 n\xe1ro\u010dnosti budovy je ze z\xe1kona povinn\xfd. Platn\xfd je 10 let od vystavení.';
  body.appendChild(hint);

  var statusWrap = document.createElement('div');
  body.appendChild(statusWrap);

  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  body.appendChild(formWrap);

  el.appendChild(card.card);

  penbLoad(statusWrap, formWrap, user);
}

function penbLoad(statusWrap, formWrap, user) {
  statusWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  statusWrap.appendChild(loading);

  Api.apiGet('api/penb.php?action=get')
    .then(function(data) { penbRenderStatus(statusWrap, formWrap, data.penb, user); })
    .catch(function() {
      statusWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed PENB.';
      statusWrap.appendChild(err);
    });
}

function penbRenderStatus(statusWrap, formWrap, penb, user) {
  statusWrap.replaceChildren();
  formWrap.style.display = 'none';

  var isPriv = user.role === 'admin' || user.role === 'vybor';

  if (!penb) {
    var emptyRow = document.createElement('div');
    emptyRow.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;';

    var emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'margin:0;color:var(--text-light);font-size:0.9rem;flex:1;';
    emptyMsg.textContent = 'PENB dosud nebyl zad\xe1n.';
    emptyRow.appendChild(emptyMsg);

    if (isPriv) {
      var addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary btn-sm';
      addBtn.textContent = 'Zadat PENB';
      addBtn.addEventListener('click', function() { penbShowForm(formWrap, null, statusWrap, user); });
      emptyRow.appendChild(addBtn);
    }
    statusWrap.appendChild(emptyRow);
    return;
  }

  // Třída badge + metadata
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px;';

  var trida = penb.energeticka_trida;
  var badge = document.createElement('span');
  badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;' +
    'width:44px;height:44px;border-radius:6px;font-size:1.4rem;font-weight:700;color:#fff;flex-shrink:0;' +
    'background:' + (PENB_BARVY[trida] || '#888') + ';';
  badge.textContent = trida;
  row.appendChild(badge);

  var meta = document.createElement('div');
  var platnostDatum = new Date(penb.datum_platnosti);
  var dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  var dniDo = Math.floor((platnostDatum - dnes) / 86400000);

  var nazevEl = document.createElement('div');
  nazevEl.style.cssText = 'font-weight:600;font-size:0.95rem;';
  nazevEl.textContent = 'T\u0159\xedda ' + trida + ' \u2014 platnost do ' + formatDatum(penb.datum_platnosti);
  meta.appendChild(nazevEl);

  var expiryEl = document.createElement('div');
  expiryEl.style.cssText = 'font-size:0.82rem;margin-top:3px;';
  if (dniDo < 0) {
    expiryEl.style.color = 'var(--danger)';
    expiryEl.textContent = '\u26a0 Platnost vypr\u0161ela p\u0159ed ' + Math.abs(dniDo) + ' dny!';
  } else if (dniDo <= 365) {
    expiryEl.style.color = '#d44000';
    expiryEl.textContent = '\u26a0 Vypr\u0161\xed za ' + dniDo + ' dn\xed';
  } else {
    expiryEl.style.color = 'var(--text-light)';
    expiryEl.textContent = 'Zb\xfdv\xe1 ' + Math.floor(dniDo / 365) + ' let (' + dniDo + ' dn\xed)';
  }
  meta.appendChild(expiryEl);

  var vystavEl = document.createElement('div');
  vystavEl.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-top:2px;';
  vystavEl.textContent = 'Vystaveno: ' + formatDatum(penb.datum_vystaveni);
  meta.appendChild(vystavEl);

  row.appendChild(meta);
  statusWrap.appendChild(row);

  // Soubor
  if (penb.soubor_nazev) {
    var fileRow = document.createElement('div');
    fileRow.style.cssText = 'margin-bottom:10px;font-size:0.88rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

    var fileIcon = document.createElement('span');
    fileIcon.textContent = '\uD83D\uDCC4';
    fileRow.appendChild(fileIcon);

    var fileName = document.createElement('span');
    fileName.textContent = penb.soubor_nazev;
    fileName.style.color = 'var(--text-light)';
    fileRow.appendChild(fileName);

    var dlBtn = document.createElement('a');
    dlBtn.className = 'btn btn-secondary btn-sm';
    dlBtn.textContent = 'St\xe1hnout';
    dlBtn.href = 'api/penb.php?action=download';
    dlBtn.target = '_blank';
    fileRow.appendChild(dlBtn);

    statusWrap.appendChild(fileRow);
  }

  if (penb.poznamka) {
    var note = document.createElement('p');
    note.style.cssText = 'margin:0 0 10px;font-size:0.88rem;color:var(--text-light);';
    note.textContent = penb.poznamka;
    statusWrap.appendChild(note);
  }

  // Akce
  if (isPriv) {
    var akceRow = document.createElement('div');
    akceRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() { penbShowForm(formWrap, penb, statusWrap, user); });
    akceRow.appendChild(editBtn);

    if (user.role === 'admin') {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Smazat';
      delBtn.addEventListener('click', function() {
        showConfirmModal('Smazat PENB?', 'Odstraní záznam i nahraný soubor PDF.', function() {
          Api.apiPost('api/penb.php?action=delete', {})
            .then(function() {
              showToast('PENB smaz\xe1n');
              penbRenderStatus(statusWrap, formWrap, null, user);
            })
            .catch(function(e) { showToast(e.message || 'Chyba p\u0159i maz\xe1n\xed.', 'error'); });
        });
      });
      akceRow.appendChild(delBtn);
    }

    statusWrap.appendChild(akceRow);
  }
}

function penbShowForm(formWrap, penb, statusWrap, user) {
  formWrap.replaceChildren();
  formWrap.style.display = '';

  var sep = document.createElement('hr');
  sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:16px 0;';
  formWrap.appendChild(sep);

  var heading = document.createElement('h3');
  heading.style.cssText = 'margin:0 0 16px;font-size:0.95rem;';
  heading.textContent = penb ? 'Upravit PENB' : 'Zadat PENB';
  formWrap.appendChild(heading);

  // Energetická třída
  var tridaWrap = document.createElement('div');
  tridaWrap.style.marginBottom = '14px';
  var tridaLabel = document.createElement('label');
  tridaLabel.textContent = 'Energetick\xe1 t\u0159\xedda';
  tridaLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var tridaSelect = document.createElement('select');
  tridaSelect.className = 'form-input';
  tridaSelect.style.maxWidth = '120px';
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (penb && penb.energeticka_trida === t) opt.selected = true;
    tridaSelect.appendChild(opt);
  });
  tridaWrap.appendChild(tridaLabel);
  tridaWrap.appendChild(tridaSelect);
  formWrap.appendChild(tridaWrap);

  var vystaveniField = makeAdminField('Datum vystavení', 'date', 'penb_vystaveni',
    penb ? penb.datum_vystaveni : '');
  formWrap.appendChild(vystaveniField.el);

  var platnostField = makeAdminField('Datum platnosti', 'date', 'penb_platnost',
    penb ? penb.datum_platnosti : '');
  formWrap.appendChild(platnostField.el);

  // Soubor PDF
  var souborWrap = document.createElement('div');
  souborWrap.style.marginBottom = '14px';
  var souborLabel = document.createElement('label');
  souborLabel.textContent = penb && penb.soubor_nazev
    ? 'Nahradit soubor PDF (nepovinné)'
    : 'Soubor PDF (nepovinné)';
  souborLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var souborInput = document.createElement('input');
  souborInput.type = 'file';
  souborInput.accept = 'application/pdf';
  souborInput.className = 'form-input';
  souborWrap.appendChild(souborLabel);
  souborWrap.appendChild(souborInput);
  formWrap.appendChild(souborWrap);

  // Poznámka
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input';
  pozInput.rows = 2;
  pozInput.value = penb ? (penb.poznamka || '') : '';
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  formWrap.appendChild(pozWrap);

  // Tlačítka
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Uložit PENB';
  btnRow.appendChild(saveBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zrušit';
  cancelBtn.addEventListener('click', function() {
    formWrap.style.display = 'none';
    formWrap.replaceChildren();
  });
  btnRow.appendChild(cancelBtn);
  formWrap.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    var vystaveni = vystaveniField.input.value;
    var platnost  = platnostField.input.value;
    if (!vystaveni || !platnost) {
      showToast('Vyplňte datum vystavení a datum platnosti.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    var fd = new FormData();
    fd.append('energeticka_trida', tridaSelect.value);
    fd.append('datum_vystaveni', vystaveni);
    fd.append('datum_platnosti', platnost);
    fd.append('poznamka', pozInput.value.trim());
    if (souborInput.files[0]) fd.append('soubor', souborInput.files[0]);

    fetch('api/penb.php?action=save', { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error.message);
        showToast('PENB uložen');
        handleGdriveFeedback(data);
        formWrap.style.display = 'none';
        formWrap.replaceChildren();
        Api.apiGet('api/penb.php?action=get')
          .then(function(d) { penbRenderStatus(statusWrap, formWrap, d.penb, user); });
      })
      .catch(function(e) { showToast(e.message || 'Chyba p\u0159i ukl\xe1d\xe1n\xed.', 'error'); })
      .finally(function() {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Uložit PENB';
      });
  });
}

