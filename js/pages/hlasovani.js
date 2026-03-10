/* ===== HLASOVÁNÍ PAGE ===== */

Router.register('hlasovani', function(el) {
  var user   = Auth.getUser();
  var isPriv = user && (user.role === 'admin' || user.role === 'vybor');

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Hlasov\u00e1n\u00ed';
  var sub = document.createElement('p');
  sub.textContent = 'Anket y a hlasov\u00e1n\u00ed pro \u010dleny SVJ';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  if (isPriv) {
    var createWrap = document.createElement('div');
    el.appendChild(createWrap);
    renderCreateForm(createWrap, function() { loadList(listWrap, isPriv); });
  }

  loadList(listWrap, isPriv);
});

/* ===== NAČTENÍ SEZNAMU ===== */

function loadList(wrap, isPriv) {
  wrap.replaceChildren();

  var loading = document.createElement('div');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin-bottom:16px;';
  loading.textContent = 'Na\u010d\u00edt\u00e1m hlasov\u00e1n\u00ed\u2026';
  wrap.appendChild(loading);

  Api.apiGet('api/hlasovani.php?action=list')
    .then(function(data) {
      wrap.replaceChildren();
      if (!data.hlasovani || !data.hlasovani.length) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        var icon = document.createElement('div'); icon.className = 'icon'; icon.textContent = '\uD83D\uDDF3\uFE0F';
        var msg  = document.createElement('p');
        msg.textContent = 'Zat\u00edm nen\u00ed vyhl\u00e1\u0161eno \u017e\u00e1dn\u00e9 hlasov\u00e1n\u00ed.';
        empty.appendChild(icon); empty.appendChild(msg);
        wrap.appendChild(empty);
        return;
      }
      data.hlasovani.forEach(function(h) {
        wrap.appendChild(buildHlasovaniCard(h, isPriv, function() { loadList(wrap, isPriv); }));
      });
    })
    .catch(function(e) {
      wrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst hlasov\u00e1n\u00ed.');
      wrap.appendChild(err);
    });
}

/* ===== KARTA HLASOVÁNÍ ===== */

function buildHlasovaniCard(h, isPriv, onRefresh) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';

  var titleEl = document.createElement('h2');
  titleEl.style.margin = '0';
  titleEl.textContent = h.nazev;
  hdr.appendChild(titleEl);

  var badges = document.createElement('div');
  badges.style.cssText = 'display:flex;gap:6px;align-items:center;flex-shrink:0;';

  var stavBadge = document.createElement('span');
  stavBadge.className = 'badge ' + (h.stav === 'aktivni' ? 'badge-success' : '');
  stavBadge.textContent = h.stav === 'aktivni' ? 'Aktivní' : 'Ukončeno';
  badges.appendChild(stavBadge);

  var vahaBadge = document.createElement('span');
  vahaBadge.className = 'badge';
  vahaBadge.textContent = h.vaha_hlasu === 'podil' ? 'Váha dle podílu' : 'Rovné hlasy';
  vahaBadge.title = h.vaha_hlasu === 'podil'
    ? 'Výsledek se počítá váhou dle spoluvlastnického podílu na společných částech domu'
    : 'Každý člen má jeden hlas bez ohledu na podíl';
  badges.appendChild(vahaBadge);

  hdr.appendChild(badges);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  if (h.popis) {
    var popisEl = document.createElement('p');
    popisEl.style.cssText = 'margin:0 0 14px;color:var(--text-light);font-size:0.9rem;';
    popisEl.textContent = h.popis;
    body.appendChild(popisEl);
  }

  var meta = document.createElement('div');
  meta.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-bottom:14px;';
  meta.textContent = 'Vytvořil/a: ' + h.jmeno + ' ' + h.prijmeni
    + ' \u00b7 ' + new Date(h.created_at).toLocaleDateString('cs-CZ');
  if (h.deadline) {
    var dl = new Date(h.deadline);
    var expired = dl < new Date();
    meta.textContent += ' \u00b7 Deadline: ' + dl.toLocaleString('cs-CZ');
    if (expired) meta.textContent += ' (vypršelo)';
  }
  body.appendChild(meta);

  // Hlasovací tlačítka nebo výsledky
  var voteWrap = document.createElement('div');
  body.appendChild(voteWrap);

  var canVote = h.stav === 'aktivni' && h.muj_hlas === null
    && (!h.deadline || new Date(h.deadline) > new Date());

  if (canVote) {
    renderVoteButtons(voteWrap, h, onRefresh);
  } else {
    renderResults(voteWrap, h);
  }

  // Akce pro výbor/admin
  if (isPriv && h.stav === 'aktivni') {
    var closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary btn-sm';
    closeBtn.style.marginTop = '14px';
    closeBtn.textContent = 'Ukončit hlasování';
    closeBtn.addEventListener('click', function() {
      showConfirmModal('Ukončit hlasování', 'Hlasování bude uzavřeno. Nikdo již nebude moci hlasovat.', function() {
        Api.apiPost('api/hlasovani.php?action=close', { id: h.id })
          .then(onRefresh)
          .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
      });
    });
    body.appendChild(closeBtn);
  }

  card.appendChild(body);
  return card;
}

/* ===== HLASOVACÍ TLAČÍTKA ===== */

function renderVoteButtons(wrap, h, onRefresh) {
  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.88rem;font-weight:500;margin-bottom:10px;';
  hint.textContent = 'Vyberte svou odpověď:';
  wrap.appendChild(hint);

  var btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  h.moznosti.forEach(function(m, i) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = m;
    btn.addEventListener('click', function() {
      btnWrap.querySelectorAll('button').forEach(function(b) { b.disabled = true; });
      Api.apiPost('api/hlasovani.php?action=vote', { hlasovani_id: h.id, moznost_index: i })
        .then(function() { showToast('Váš hlas byl zaznamenán.'); onRefresh(); })
        .catch(function(e) { showToast(e.message || 'Chyba při hlasování.', 'error'); onRefresh(); });
    });
    btnWrap.appendChild(btn);
  });

  wrap.appendChild(btnWrap);
}

/* ===== VÝSLEDKY ===== */

function renderResults(wrap, h) {
  var total = h.pocet_hlasu || 0;

  if (h.muj_hlas !== null) {
    var myInfo = document.createElement('div');
    myInfo.className = 'info-box info-box-success';
    myInfo.style.marginBottom = '12px';
    myInfo.textContent = '\u2714\uFE0F Hlasoval/a jste pro: \u201e' + (h.moznosti[h.muj_hlas] || '?') + '\u201c';
    wrap.appendChild(myInfo);
  }

  if (!total && h.stav !== 'ukonceno') {
    var noVotes = document.createElement('div');
    noVotes.style.cssText = 'color:var(--text-light);font-size:0.88rem;';
    noVotes.textContent = 'Zatím nikdo nehlasoval.';
    wrap.appendChild(noVotes);
    return;
  }

  var resultsTitle = document.createElement('div');
  resultsTitle.style.cssText = 'font-size:0.88rem;font-weight:600;margin-bottom:10px;';
  resultsTitle.textContent = 'Výsledky (' + total + '\u00a0hlas\u016f):';
  wrap.appendChild(resultsTitle);

  h.moznosti.forEach(function(m, i) {
    var count = (h.vysledky && h.vysledky[i]) ? h.vysledky[i] : 0;
    var pct   = total > 0 ? Math.round((count / total) * 100) : 0;
    var isWinner = count === Math.max.apply(null, h.vysledky || [0]) && count > 0;

    var row = document.createElement('div');
    row.style.cssText = 'margin-bottom:10px;';

    var label = document.createElement('div');
    label.style.cssText = 'display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:3px;'
      + (isWinner ? 'font-weight:600;' : 'color:var(--text-light);');
    var lText = document.createElement('span');
    lText.textContent = (isWinner ? '\uD83C\uDFC6 ' : '') + m;
    var lCount = document.createElement('span');
    lCount.textContent = count + ' (' + pct + '\u00a0%)';
    label.appendChild(lText);
    label.appendChild(lCount);

    var bar = document.createElement('div');
    bar.style.cssText = 'height:8px;border-radius:4px;background:var(--border);overflow:hidden;';
    var fill = document.createElement('div');
    fill.style.cssText = 'height:100%;border-radius:4px;transition:width 0.4s;'
      + 'background:' + (isWinner ? 'var(--accent)' : 'var(--text-light)') + ';'
      + 'width:' + pct + '%;';
    bar.appendChild(fill);

    row.appendChild(label);
    row.appendChild(bar);
    wrap.appendChild(row);
  });
}

/* ===== FORMULÁŘ VYTVOŘENÍ ===== */

function renderCreateForm(wrap, onCreated) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '24px';

  var hdr = document.createElement('div');
  hdr.className = 'card-header';
  var h2 = document.createElement('h2');
  h2.textContent = '\u2795 Nov\u00e9 hlasov\u00e1n\u00ed';
  hdr.appendChild(h2);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'card-body';

  // Název
  var nazevWrap = document.createElement('div');
  nazevWrap.style.marginBottom = '14px';
  var nazevLbl = document.createElement('label');
  nazevLbl.textContent = 'Otázka / název hlasování *';
  nazevLbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;';
  var nazevInp = document.createElement('input');
  nazevInp.type = 'text'; nazevInp.className = 'form-input';
  nazevInp.placeholder = 'Např. Souhlas s opravou střechy';
  nazevWrap.appendChild(nazevLbl); nazevWrap.appendChild(nazevInp);
  body.appendChild(nazevWrap);

  // Popis
  var popisWrap = document.createElement('div');
  popisWrap.style.marginBottom = '14px';
  var popisLbl = document.createElement('label');
  popisLbl.textContent = 'Popis (volitelný)';
  popisLbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;';
  var popisTa = document.createElement('textarea');
  popisTa.className = 'form-input'; popisTa.rows = 2;
  popisTa.placeholder = 'Doplňující informace pro hlasující\u2026';
  popisWrap.appendChild(popisLbl); popisWrap.appendChild(popisTa);
  body.appendChild(popisWrap);

  // Možnosti
  var mozWrap = document.createElement('div');
  mozWrap.style.marginBottom = '14px';
  var mozLbl = document.createElement('label');
  mozLbl.textContent = 'Možnosti odpovědí *';
  mozLbl.style.cssText = 'display:block;font-weight:500;margin-bottom:6px;';
  mozWrap.appendChild(mozLbl);

  var mozInputs = document.createElement('div');
  mozInputs.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  function addMoznost(val) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'form-input'; inp.value = val || '';
    inp.style.flex = '1';
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'btn btn-secondary btn-sm';
    del.textContent = '\u00d7';
    del.addEventListener('click', function() {
      if (mozInputs.children.length > 2) row.remove();
    });
    row.appendChild(inp); row.appendChild(del);
    mozInputs.appendChild(row);
  }

  ['Ano', 'Ne', 'Zdržuji se'].forEach(addMoznost);

  var addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-secondary btn-sm';
  addBtn.style.marginTop = '6px';
  addBtn.textContent = '+ Přidat možnost';
  addBtn.addEventListener('click', function() { addMoznost(''); });

  mozWrap.appendChild(mozInputs);
  mozWrap.appendChild(addBtn);
  body.appendChild(mozWrap);

  // Deadline + váha
  var optRow = document.createElement('div');
  optRow.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;';

  var dlWrap = document.createElement('div');
  dlWrap.style.flex = '1';
  var dlLbl = document.createElement('label');
  dlLbl.textContent = 'Deadline (volitelný)';
  dlLbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;';
  var dlInp = document.createElement('input');
  dlInp.type = 'datetime-local'; dlInp.className = 'form-input';
  dlWrap.appendChild(dlLbl); dlWrap.appendChild(dlInp);

  var vahaWrap = document.createElement('div');
  vahaWrap.style.flex = '1';
  var vahaLbl = document.createElement('label');
  vahaLbl.textContent = 'Způsob hlasování';
  vahaLbl.style.cssText = 'display:block;font-weight:500;margin-bottom:4px;';
  var vahaSel = document.createElement('select');
  vahaSel.className = 'form-input';
  [['podil', 'Váha dle podílu na společných částech'], ['rovny', 'Rovné hlasy (1 člen = 1 hlas)']].forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o[0]; opt.textContent = o[1];
    vahaSel.appendChild(opt);
  });
  vahaWrap.appendChild(vahaLbl); vahaWrap.appendChild(vahaSel);

  optRow.appendChild(dlWrap); optRow.appendChild(vahaWrap);
  body.appendChild(optRow);

  // Chyba + tlačítko
  var errBox = document.createElement('div');
  errBox.className = 'info-box info-box-danger';
  errBox.style.display = 'none';
  body.appendChild(errBox);

  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Vyhlásit hlasování';
  body.appendChild(submitBtn);

  submitBtn.addEventListener('click', function() {
    var nazev    = nazevInp.value.trim();
    var moznosti = Array.from(mozInputs.querySelectorAll('input')).map(function(i) { return i.value.trim(); }).filter(Boolean);

    if (!nazev)             { errBox.textContent = 'Zadejte název hlasování.'; errBox.style.display = ''; return; }
    if (moznosti.length < 2){ errBox.textContent = 'Zadejte alespoň 2 možnosti.'; errBox.style.display = ''; return; }
    errBox.style.display = 'none';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ukládám\u2026';

    Api.apiPost('api/hlasovani.php?action=create', {
      nazev:       nazev,
      popis:       popisTa.value.trim(),
      moznosti:    moznosti,
      deadline:    dlInp.value || null,
      vaha_hlasu:  vahaSel.value,
    })
      .then(function() {
        showToast('Hlasování bylo vyhlášeno.');
        nazevInp.value = ''; popisTa.value = ''; dlInp.value = '';
        // Reset možností
        mozInputs.replaceChildren();
        ['Ano', 'Ne', 'Zdržuji se'].forEach(addMoznost);
        onCreated();
      })
      .catch(function(e) { errBox.textContent = e.message || 'Chyba při vytváření.'; errBox.style.display = ''; })
      .finally(function() { submitBtn.disabled = false; submitBtn.textContent = 'Vyhlásit hlasování'; });
  });

  card.appendChild(body);
  wrap.appendChild(card);
}
