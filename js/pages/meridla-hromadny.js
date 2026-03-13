/* ===== Hromadný odečet — výbor/admin zadá odečty pro celý dům ===== */

function merHromadnyModal(user, onDone) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-lg);'
    + 'width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;'
    + 'box-shadow:var(--shadow-lg);';

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid var(--border-light);'
    + 'display:flex;justify-content:space-between;align-items:center;';
  var titleEl = document.createElement('h3');
  titleEl.style.cssText = 'margin:0;font-size:1rem;';
  titleEl.textContent = '\uD83D\uDCCB Hromadn\u00fd ode\u010det';
  header.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-light);';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', function() { overlay.remove(); });
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;overflow-y:auto;flex:1;';
  modal.appendChild(body);

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  merHromadnyLoad(body, user, overlay, onDone);
}

function merHromadnyLoad(body, user, overlay, onDone) {
  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m m\u011b\u0159idla\u2026';
  body.appendChild(loading);

  Api.apiGet('api/meridla.php?action=list')
    .then(function(data) {
      body.replaceChildren();
      var meridla = (data.meridla || []).filter(function(m) { return m.aktivni == 1; });
      if (!meridla.length) {
        body.textContent = '\u017d\u00e1dn\u00e1 aktivn\u00ed m\u011b\u0159idla.';
        return;
      }
      merHromadnyRender(body, meridla, user, overlay, onDone);
    })
    .catch(function(e) {
      body.replaceChildren();
      body.textContent = e.message || 'Chyba.';
    });
}

function merHromadnyRender(body, meridla, user, overlay, onDone) {
  var desc = document.createElement('p');
  desc.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin:0 0 14px;line-height:1.5;';
  desc.textContent = 'Zadejte ode\u010dty pro v\u0161echna m\u011b\u0159idla najednou. '
    + 'Pr\u00e1zdn\u00e1 pole budou p\u0159esko\u010dena.';
  body.appendChild(desc);

  // Date picker
  var dateRow = document.createElement('div');
  dateRow.style.cssText = 'margin-bottom:16px;display:flex;align-items:center;gap:10px;';
  var dateLbl = document.createElement('label');
  dateLbl.style.cssText = 'font-size:0.85rem;font-weight:600;';
  dateLbl.textContent = 'Datum ode\u010dtu:';
  dateRow.appendChild(dateLbl);
  var dateInp = document.createElement('input');
  dateInp.type = 'date';
  dateInp.className = 'form-control';
  dateInp.style.cssText = 'width:auto;padding:6px 10px;font-size:0.88rem;';
  dateInp.value = new Date().toISOString().slice(0, 10);
  dateRow.appendChild(dateInp);
  body.appendChild(dateRow);

  // Table
  var table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.85rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Typ', 'Jednotka', 'M\u00edsto', 'Posledn\u00ed', 'Nov\u00fd ode\u010det'].forEach(function(h) {
    var th = document.createElement('th');
    th.style.cssText = 'text-align:left;padding:8px 6px;border-bottom:2px solid var(--border);font-size:0.8rem;color:var(--text-light);';
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  var inputs = [];

  meridla.forEach(function(m) {
    var tr = document.createElement('tr');

    var typInfo = typeof merTypInfo === 'function' ? merTypInfo(m.typ) : { icon: '', label: m.typ, unit: '' };

    var tdTyp = document.createElement('td');
    tdTyp.style.cssText = 'padding:6px;border-bottom:1px solid var(--border-light);';
    tdTyp.textContent = typInfo.icon + ' ' + typInfo.label;

    var tdJed = document.createElement('td');
    tdJed.style.cssText = 'padding:6px;border-bottom:1px solid var(--border-light);';
    tdJed.textContent = m.umisteni_typ === 'spolecne' ? 'Spole\u010dn\u00e9' : (m.cislo_jednotky || '');

    var tdMisto = document.createElement('td');
    tdMisto.style.cssText = 'padding:6px;border-bottom:1px solid var(--border-light);font-size:0.8rem;color:var(--text-light);';
    tdMisto.textContent = m.misto || '';

    var tdLast = document.createElement('td');
    tdLast.style.cssText = 'padding:6px;border-bottom:1px solid var(--border-light);font-size:0.8rem;';
    if (m.posledni_hodnota !== null && m.posledni_hodnota !== undefined) {
      tdLast.textContent = parseFloat(m.posledni_hodnota).toLocaleString('cs-CZ') + ' ' + (m.jednotka_mereni || '');
    } else {
      tdLast.style.color = 'var(--text-light)';
      tdLast.textContent = '\u2014';
    }

    var tdInput = document.createElement('td');
    tdInput.style.cssText = 'padding:6px;border-bottom:1px solid var(--border-light);';
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.001';
    inp.className = 'form-control';
    inp.style.cssText = 'width:120px;padding:5px 8px;font-size:0.85rem;';
    inp.placeholder = m.jednotka_mereni || '';
    tdInput.appendChild(inp);

    tr.appendChild(tdTyp);
    tr.appendChild(tdJed);
    tr.appendChild(tdMisto);
    tr.appendChild(tdLast);
    tr.appendChild(tdInput);
    tbody.appendChild(tr);

    inputs.push({ meridlo_id: m.id, input: inp });
  });

  table.appendChild(tbody);
  body.appendChild(table);

  // Submit
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'margin-top:16px;display:flex;gap:8px;align-items:center;';

  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Ulo\u017eit ode\u010dty';
  submitBtn.addEventListener('click', function() {
    var datum = dateInp.value;
    if (!datum) { showToast('Vyberte datum', 'error'); return; }

    var toSave = inputs.filter(function(i) { return i.input.value.trim() !== ''; });
    if (!toSave.length) { showToast('\u017d\u00e1dn\u00e9 hodnoty k ulo\u017een\u00ed', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ukl\u00e1d\u00e1m\u2026';

    var promises = toSave.map(function(item) {
      return Api.apiPost('api/meridla.php?action=odectySave', {
        meridlo_id: item.meridlo_id,
        id: 0,
        datum: datum,
        hodnota: parseFloat(item.input.value),
      });
    });

    Promise.all(promises)
      .then(function() {
        showToast('Ulo\u017eeno ' + toSave.length + ' ode\u010dt\u016f');
        overlay.remove();
        if (onDone) onDone();
      })
      .catch(function(e) {
        showToast(e.message || 'Chyba', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ulo\u017eit ode\u010dty';
      });
  });
  btnRow.appendChild(submitBtn);

  var countLabel = document.createElement('span');
  countLabel.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
  countLabel.textContent = meridla.length + ' m\u011b\u0159idel';
  btnRow.appendChild(countLabel);

  body.appendChild(btnRow);
}
