/* ===== FOND OPRAV — DETAILNÍ KOMPONENTY ===== */

/* ===== ROČNÍ TABULKA ===== */

function fondRenderRocniTable(wrap, roky) {
  wrap.replaceChildren();
  if (!roky.length) { fondEmptyCard(wrap, 'Ro\u010dn\xed p\u0159ehled', '\u017d\xe1dn\xe1 data.'); return; }

  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Ro\u010dn\xed p\u0159ehled';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';
  body.style.overflowX = 'auto';

  var table = document.createElement('table');
  table.className = 'admin-table';
  table.style.cssText = 'width:100%;font-size:0.85rem;';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  ['Rok', 'P\u0159\xedjmy', 'V\xfddaje', 'Saldo', 'Kumulativn\xed'].forEach(function(t) {
    var th = document.createElement('th');
    th.textContent = t;
    th.style.cssText = 'text-align:right;padding:8px 10px;';
    headRow.appendChild(th);
  });
  headRow.children[0].style.textAlign = 'left';
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  roky.forEach(function(r, i) {
    var tr = document.createElement('tr');

    var tdRok = document.createElement('td');
    tdRok.textContent = r.rok;
    tdRok.style.cssText = 'font-weight:600;padding:8px 10px;';
    tr.appendChild(tdRok);

    var tdP = document.createElement('td');
    tdP.style.cssText = 'text-align:right;padding:8px 10px;color:var(--accent);';
    tdP.textContent = '+' + fondFmt(r.prijem) + ' K\u010d';
    tr.appendChild(tdP);

    var tdV = document.createElement('td');
    tdV.style.cssText = 'text-align:right;padding:8px 10px;color:var(--danger);';
    tdV.textContent = '\u2212' + fondFmt(r.vydaj) + ' K\u010d';
    tr.appendChild(tdV);

    var tdS = document.createElement('td');
    tdS.style.cssText = 'text-align:right;padding:8px 10px;font-weight:600;color:'
      + (r.saldo >= 0 ? 'var(--accent)' : 'var(--danger)') + ';';
    tdS.textContent = (r.saldo >= 0 ? '+' : '') + fondFmt(r.saldo) + ' K\u010d';
    tr.appendChild(tdS);

    var tdK = document.createElement('td');
    tdK.style.cssText = 'text-align:right;padding:8px 10px;font-weight:700;color:'
      + (r.zustatek_kumulativni >= 0 ? 'var(--accent)' : 'var(--danger)') + ';';
    tdK.textContent = fondFmt(r.zustatek_kumulativni) + ' K\u010d';
    tr.appendChild(tdK);

    if (i > 0) {
      var prevSaldo = roky[i - 1].saldo;
      if (prevSaldo !== 0) {
        var change = r.saldo - prevSaldo;
        var pct = Math.round((change / Math.abs(prevSaldo)) * 100);
        tdS.title = 'Meziro\u010d\u011b: ' + (pct > 0 ? '+' : '') + pct + ' %';
      }
    }

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== TOP KATEGORIE (donut vizualizace) ===== */

function fondRenderKategorie(wrap, data) {
  wrap.replaceChildren();
  var topVydaje = data.top_vydaje || [];
  if (!topVydaje.length && !data.prumer_mesicni_prijem && !data.prumer_mesicni_vydaj) {
    fondEmptyCard(wrap, 'Statistiky', '\u017d\xe1dn\xe1 data.');
    return;
  }

  var card = document.createElement('div');
  card.className = 'card';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Statistiky';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  var avgRow = document.createElement('div');
  avgRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;';

  var avgP = document.createElement('div');
  avgP.style.cssText = 'background:var(--bg-hover);border-radius:8px;padding:10px 14px;';
  var avgPVal = document.createElement('div');
  avgPVal.style.cssText = 'font-size:1rem;font-weight:700;color:var(--accent);';
  avgPVal.textContent = fondFmt(data.prumer_mesicni_prijem || 0) + ' K\u010d';
  var avgPLbl = document.createElement('div');
  avgPLbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
  avgPLbl.textContent = '\u00d8 m\u011bs. p\u0159\xedjem';
  avgP.appendChild(avgPVal); avgP.appendChild(avgPLbl);

  var avgV = document.createElement('div');
  avgV.style.cssText = 'background:var(--bg-hover);border-radius:8px;padding:10px 14px;';
  var avgVVal = document.createElement('div');
  avgVVal.style.cssText = 'font-size:1rem;font-weight:700;color:var(--danger);';
  avgVVal.textContent = fondFmt(data.prumer_mesicni_vydaj || 0) + ' K\u010d';
  var avgVLbl = document.createElement('div');
  avgVLbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:2px;';
  avgVLbl.textContent = '\u00d8 m\u011bs. v\xfddaj';
  avgV.appendChild(avgVVal); avgV.appendChild(avgVLbl);

  avgRow.appendChild(avgP); avgRow.appendChild(avgV);
  body.appendChild(avgRow);

  if (topVydaje.length) {
    var subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);margin-bottom:8px;';
    subtitle.textContent = 'Top v\xfddaje dle kategorie';
    body.appendChild(subtitle);

    var maxKat = parseFloat(topVydaje[0].suma) || 1;
    topVydaje.forEach(function(k) {
      var row = document.createElement('div');
      row.style.cssText = 'margin-bottom:6px;';

      var labelRow = document.createElement('div');
      labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:2px;';
      var lbl = document.createElement('span');
      lbl.textContent = k.kategorie;
      var val = document.createElement('span');
      val.style.cssText = 'font-weight:600;color:var(--danger);';
      val.textContent = fondFmt(k.suma) + ' K\u010d';
      labelRow.appendChild(lbl); labelRow.appendChild(val);

      var barBg = document.createElement('div');
      barBg.style.cssText = 'height:6px;background:var(--border);border-radius:3px;overflow:hidden;';
      var barFill = document.createElement('div');
      var pct = Math.round((parseFloat(k.suma) / maxKat) * 100);
      barFill.style.cssText = 'height:100%;background:var(--danger);opacity:0.7;border-radius:3px;width:' + pct + '%;';
      barBg.appendChild(barFill);

      row.appendChild(labelRow); row.appendChild(barBg);
      body.appendChild(row);
    });
  }

  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== BANKOVNÍ ÚČTY ===== */

function fondRenderUcty(wrap, ucty, onReload) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Bankovn\xed \xfa\u010dty SVJ';
  hdr.appendChild(h2);

  var addUcetBtn = document.createElement('button');
  addUcetBtn.className = 'btn btn-primary btn-sm';
  addUcetBtn.textContent = '+ P\u0159idat \xfa\u010det';
  addUcetBtn.addEventListener('click', function() {
    fondShowUcetModal(null, onReload);
  });
  hdr.appendChild(addUcetBtn);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  if (!ucty.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-light);font-size:0.88rem;';
    empty.textContent = '\u017d\xe1dn\xe9 \xfa\u010dty. P\u0159idejte bankovn\xed \xfa\u010dty va\u0161eho SVJ.';
    body.appendChild(empty);
  } else {
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;';

    var totalZustatek = 0;
    ucty.forEach(function(u) {
      totalZustatek += parseFloat(u.zustatek) || 0;
      var tile = document.createElement('div');
      tile.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;padding:14px 18px;position:relative;';

      var typBadge = document.createElement('span');
      typBadge.className = 'badge';
      typBadge.style.cssText = 'position:absolute;top:10px;right:10px;font-size:0.82rem;';
      typBadge.textContent = FOND_UCTY_TYP[u.typ] || u.typ;
      tile.appendChild(typBadge);

      var nazev = document.createElement('div');
      nazev.style.cssText = 'font-weight:600;font-size:0.95rem;margin-bottom:4px;padding-right:60px;';
      nazev.textContent = u.nazev;
      tile.appendChild(nazev);

      if (u.cislo_uctu) {
        var cislo = document.createElement('div');
        cislo.style.cssText = 'font-size:0.8rem;color:var(--text-light);font-family:monospace;';
        cislo.textContent = u.cislo_uctu + (u.banka ? ' \u00b7 ' + u.banka : '');
        tile.appendChild(cislo);
      }

      var zust = document.createElement('div');
      zust.style.cssText = 'font-size:1.2rem;font-weight:700;margin-top:8px;color:'
        + (parseFloat(u.zustatek) >= 0 ? 'var(--accent)' : 'var(--danger)') + ';';
      zust.textContent = fondFmt(u.zustatek) + ' K\u010d';
      tile.appendChild(zust);

      if (u.urokova_sazba) {
        var sazba = document.createElement('div');
        sazba.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:2px;';
        sazba.textContent = '\xdarok: ' + parseFloat(u.urokova_sazba).toFixed(2) + ' % p.a.';
        tile.appendChild(sazba);
      }

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:6px;margin-top:10px;';
      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.style.fontSize = '0.75rem';
      editBtn.textContent = 'Upravit';
      editBtn.addEventListener('click', function() { fondShowUcetModal(u, onReload); });
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm';
      delBtn.style.cssText = 'font-size:0.82rem;color:var(--danger);';
      delBtn.textContent = 'Smazat';
      delBtn.addEventListener('click', function() {
        showConfirmModal('Smazat \xfa\u010det?', u.nazev, function() {
          Api.apiPost('api/fond_ucty.php?action=delete', { id: u.id })
            .then(function() { showToast('\xda\u010det smaz\xe1n.', 'success'); onReload(); })
            .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
        });
      });
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      tile.appendChild(actions);

      grid.appendChild(tile);
    });

    if (ucty.length > 1) {
      var totalTile = document.createElement('div');
      totalTile.style.cssText = 'background:var(--bg-hover);border:2px solid var(--accent);border-radius:10px;padding:14px 18px;'
        + 'display:flex;flex-direction:column;justify-content:center;align-items:center;';
      var totalVal = document.createElement('div');
      totalVal.style.cssText = 'font-size:1.3rem;font-weight:700;color:var(--accent);';
      totalVal.textContent = fondFmt(totalZustatek) + ' K\u010d';
      var totalLbl = document.createElement('div');
      totalLbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
      totalLbl.textContent = 'Celkem na \xfa\u010dtech';
      totalTile.appendChild(totalVal); totalTile.appendChild(totalLbl);
      grid.appendChild(totalTile);
    }

    body.appendChild(grid);
  }

  card.appendChild(body);
  wrap.appendChild(card);
}

/* ===== ÚČET MODAL ===== */

function fondShowUcetModal(existing, onSaved) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;'
    + 'display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-card);border-radius:12px;width:100%;max-width:440px;'
    + 'max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px;';

  var title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 16px;font-size:1.1rem;';
  title.textContent = existing ? 'Upravit \xfa\u010det' : 'Nov\xfd bankovn\xed \xfa\u010det';
  modal.appendChild(title);

  var fields = {};
  var fieldDefs = [
    { key: 'nazev', label: 'N\xe1zev \xfa\u010dtu *', type: 'text', ph: 'nap\u0159. Spo\u0159ic\xed \xfa\u010det FO' },
    { key: 'cislo_uctu', label: '\u010c\xedslo \xfa\u010dtu', type: 'text', ph: '123456789/0100' },
    { key: 'banka', label: 'Banka', type: 'text', ph: 'nap\u0159. KB, \u010cS, MONETA' },
    { key: 'zustatek', label: 'Aktu\xe1ln\xed z\u016fstatek (K\u010d) *', type: 'number', ph: '150000' },
    { key: 'urokova_sazba', label: '\xdarokov\xe1 sazba (% p.a.)', type: 'number', ph: '3.5' },
  ];

  fieldDefs.forEach(function(fd) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';
    var lbl = document.createElement('label');
    lbl.textContent = fd.label;
    lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
    var inp = document.createElement('input');
    inp.type = fd.type; inp.className = 'form-input';
    inp.placeholder = fd.ph || '';
    inp.value = existing ? (existing[fd.key] || '') : '';
    if (fd.key === 'urokova_sazba') { inp.step = '0.001'; inp.min = '0'; }
    if (fd.key === 'zustatek') { inp.step = '0.01'; }
    wrap.appendChild(lbl); wrap.appendChild(inp);
    modal.appendChild(wrap);
    fields[fd.key] = inp;
  });

  var typWrap = document.createElement('div');
  typWrap.style.marginBottom = '14px';
  var typLbl = document.createElement('label');
  typLbl.textContent = 'Typ \xfa\u010dtu';
  typLbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.85rem;color:var(--text-light);';
  var typSel = document.createElement('select');
  typSel.className = 'form-input';
  Object.keys(FOND_UCTY_TYP).forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k; opt.textContent = FOND_UCTY_TYP[k];
    if (existing && existing.typ === k) opt.selected = true;
    typSel.appendChild(opt);
  });
  typWrap.appendChild(typLbl); typWrap.appendChild(typSel);
  modal.appendChild(typWrap);

  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  modal.appendChild(errBox);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:8px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', function() { document.body.removeChild(overlay); });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = existing ? 'Ulo\u017eit' : 'P\u0159idat';
  btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  saveBtn.addEventListener('click', function() {
    errBox.style.display = 'none';
    if (!fields.nazev.value.trim()) { errBox.textContent = 'N\xe1zev je povinn\xfd.'; errBox.style.display = ''; return; }
    var payload = {
      nazev: fields.nazev.value.trim(),
      cislo_uctu: fields.cislo_uctu.value.trim(),
      banka: fields.banka.value.trim(),
      typ: typSel.value,
      zustatek: fields.zustatek.value || '0',
      urokova_sazba: fields.urokova_sazba.value || null,
    };
    if (existing) payload.id = existing.id;
    saveBtn.disabled = true;
    Api.apiPost('api/fond_ucty.php?action=save', payload)
      .then(function() {
        document.body.removeChild(overlay);
        showToast(existing ? '\xda\u010det upraven.' : '\xda\u010det p\u0159id\xe1n.', 'success');
        if (onSaved) onSaved();
      })
      .catch(function(e) { errBox.textContent = e.message || 'Chyba.'; errBox.style.display = ''; })
      .finally(function() { saveBtn.disabled = false; });
  });

  overlay.appendChild(modal);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  fields.nazev.focus();
}

/* ===== SEZNAM ZÁZNAMŮ ===== */

function fondRenderZaznamy(wrap, items, total, user, onReload, loadRecords) {
  wrap.replaceChildren();

  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';
  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  var h2 = document.createElement('h2');
  h2.style.margin = '0';
  h2.textContent = 'Z\xe1znamy';
  hdr.appendChild(h2);

  var countBadge = document.createElement('span');
  countBadge.style.cssText = 'font-size:0.8rem;color:var(--text-light);';
  countBadge.textContent = total + ' celkem';
  hdr.appendChild(countBadge);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  if (!items.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:16px;color:var(--text-light);font-size:0.88rem;';
    empty.textContent = 'Zat\xedm \u017e\xe1dn\xe9 z\xe1znamy.';
    body.appendChild(empty);
  } else {
    items.forEach(function(z) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;';

      var dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'
        + (z.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)') + ';';
      row.appendChild(dot);

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:140px;';
      var popis = document.createElement('div');
      popis.style.cssText = 'font-size:0.9rem;font-weight:500;';
      popis.textContent = z.popis;

      // Attachment indicator
      if (parseInt(z.pocet_priloh) > 0) {
        var clip = document.createElement('span');
        clip.style.cssText = 'margin-left:6px;font-size:0.8rem;';
        clip.title = z.pocet_priloh + ' p\u0159\xedloh';
        clip.textContent = '\uD83D\uDCCE' + z.pocet_priloh;
        popis.appendChild(clip);
      }

      info.appendChild(popis);
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:0.78rem;color:var(--text-light);margin-top:1px;';
      meta.textContent = z.kategorie + ' \xb7 ' + formatDatum(z.datum);
      info.appendChild(meta);
      row.appendChild(info);

      var castkaEl = document.createElement('div');
      castkaEl.style.cssText = 'font-weight:700;font-size:0.95rem;white-space:nowrap;color:'
        + (z.typ === 'prijem' ? 'var(--accent)' : 'var(--danger)') + ';';
      castkaEl.textContent = (z.typ === 'prijem' ? '+' : '\u2212') + fondFmt(z.castka) + '\xa0K\u010d';
      row.appendChild(castkaEl);

      // Edit button
      var editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.style.fontSize = '0.78rem';
      editBtn.textContent = '\u270F\uFE0F';
      editBtn.title = 'Upravit';
      editBtn.addEventListener('click', function() {
        fondShowRecordModal(z, function() { onReload(); });
      });
      row.appendChild(editBtn);

      // Delete button
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Smazat';
      delBtn.addEventListener('click', function() {
        showConfirmModal('Smazat z\xe1znam?', '"' + z.popis + '" \u2014 ' + fondFmt(z.castka) + ' K\u010d', function() {
          Api.apiPost('api/fond_oprav.php?action=delete', { id: z.id })
            .then(function() { showToast('Z\xe1znam smaz\xe1n.'); onReload(); })
            .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
        });
      });
      row.appendChild(delBtn);
      body.appendChild(row);
    });
  }

  card.appendChild(body);

  // Pagination
  var shown = fondListOffset + items.length;
  if (total > fondListLimit) {
    var pagBar = document.createElement('div');
    pagBar.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center;padding:12px 16px;'
      + 'border-top:1px solid var(--border);font-size:0.85rem;';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.textContent = '\u2190 P\u0159edchoz\xed';
    prevBtn.disabled = fondListOffset === 0;
    prevBtn.addEventListener('click', function() {
      fondListOffset = Math.max(0, fondListOffset - fondListLimit);
      loadRecords();
    });
    pagBar.appendChild(prevBtn);

    var pageInfo = document.createElement('span');
    pageInfo.style.cssText = 'color:var(--text-light);';
    pageInfo.textContent = (fondListOffset + 1) + '\u2013' + shown + ' z ' + total;
    pagBar.appendChild(pageInfo);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.textContent = 'Dal\u0161\xed \u2192';
    nextBtn.disabled = shown >= total;
    nextBtn.addEventListener('click', function() {
      fondListOffset += fondListLimit;
      loadRecords();
    });
    pagBar.appendChild(nextBtn);

    card.appendChild(pagBar);
  }

  wrap.appendChild(card);
}
