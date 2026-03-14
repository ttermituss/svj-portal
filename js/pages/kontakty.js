/* ===== Kontakty — servisní firmy a řemeslníci ===== */

var KONT_KATEGORIE = [
  { value: 'spravce',       label: 'Spr\xe1vce',          icon: '\uD83C\uDFE2' },
  { value: 'vytah',         label: 'V\xfdtah',            icon: '\uD83D\uDED7' },
  { value: 'elektro',       label: 'Elektro',             icon: '\u26A1' },
  { value: 'plyn',          label: 'Plyn',                icon: '\uD83D\uDD25' },
  { value: 'voda',          label: 'Voda',                icon: '\uD83D\uDCA7' },
  { value: 'topeni',        label: 'Topen\xed',            icon: '\uD83C\uDF21' },
  { value: 'klicova_sluzba',label: 'Kl\xed\u010dov\xe1 slu\u017eba', icon: '\uD83D\uDD11' },
  { value: 'uklid',         label: '\xdaklid',            icon: '\uD83E\uDDF9' },
  { value: 'zahradnik',     label: 'Zahradn\xedk',        icon: '\uD83C\uDF3F' },
  { value: 'pojistovna',    label: 'Poji\u0161\u0165ovna', icon: '\uD83D\uDEE1' },
  { value: 'ucetni',        label: '\xda\u010detn\xed',   icon: '\uD83D\uDCCA' },
  { value: 'jine',          label: 'Jin\xe9',             icon: '\uD83D\uDCCC' },
];

function kontKatLabel(kat) {
  var k = KONT_KATEGORIE.find(function(x) { return x.value === kat; });
  return k ? k.label : kat;
}
function kontKatIcon(kat) {
  var k = KONT_KATEGORIE.find(function(x) { return x.value === kat; });
  return k ? k.icon : '\uD83D\uDCCC';
}

Router.register('kontakty', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) {
    el.textContent = 'Nen\xed p\u0159i\u0159azeno SVJ.';
    return;
  }

  var isPriv = isPrivileged(user);

  // Header
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

  var title = document.createElement('h1');
  title.style.cssText = 'margin:0;font-size:1.5rem;';
  title.textContent = '\uD83D\uDCDE Kontakty';
  header.appendChild(title);

  if (isPriv) {
    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ P\u0159idat kontakt';
    addBtn.addEventListener('click', function() {
      kontShowModal(null, function() { kontLoad(listWrap, user); });
    });
    header.appendChild(addBtn);
  }

  el.appendChild(header);

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 20px;font-size:0.9rem;color:var(--text-light);';
  hint.textContent = 'D\u016fle\u017eit\xe9 kontakty pro spr\xe1vu domu \u2014 servisn\xed firmy, \u0159emesln\xedci, dodavatel\xe9.';
  el.appendChild(hint);

  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  kontLoad(listWrap, user);
});

function kontLoad(listWrap, user) {
  listWrap.replaceChildren();
  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  listWrap.appendChild(loading);

  Api.apiGet('api/kontakty.php?action=list')
    .then(function(data) { kontRenderList(listWrap, data.kontakty || [], user); })
    .catch(function() {
      listWrap.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed kontakt\u016f.';
      listWrap.appendChild(err);
    });
}

function kontRenderList(listWrap, items, user) {
  listWrap.replaceChildren();
  var isPriv = isPrivileged(user);

  if (!items.length) {
    listWrap.appendChild(makeEmptyState('\uD83D\uDCDE', 'Zat\xedm nejsou evidov\xe1ny \u017e\xe1dn\xe9 kontakty.'));
    return;
  }

  // Seskupení dle kategorie
  var grouped = {};
  KONT_KATEGORIE.forEach(function(k) { grouped[k.value] = []; });
  items.forEach(function(c) {
    if (grouped[c.kategorie]) grouped[c.kategorie].push(c);
    else grouped['jine'].push(c);
  });

  KONT_KATEGORIE.forEach(function(kat) {
    var skupina = grouped[kat.value];
    if (!skupina.length) return;

    var sekce = document.createElement('div');
    sekce.style.marginBottom = '20px';

    var sHead = document.createElement('div');
    sHead.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--text-light);' +
      'text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;';
    sHead.textContent = kat.icon + ' ' + kat.label + ' (' + skupina.length + ')';
    sekce.appendChild(sHead);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;';

    skupina.forEach(function(c) {
      grid.appendChild(kontRenderCard(c, isPriv, listWrap, user));
    });

    sekce.appendChild(grid);
    listWrap.appendChild(sekce);
  });
}

function kontRenderCard(c, isPriv, listWrap, user) {
  var card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);' +
    'border-radius:8px;padding:14px 16px;';

  // Název
  var nazev = document.createElement('div');
  nazev.style.cssText = 'font-weight:700;font-size:1rem;margin-bottom:6px;';
  nazev.textContent = c.nazev;
  card.appendChild(nazev);

  // Kontaktní údaje
  if (c.telefon) kontAddDetail(card, '\uD83D\uDCF1', c.telefon, 'tel:' + c.telefon);
  if (c.email) kontAddDetail(card, '\u2709\uFE0F', c.email, 'mailto:' + c.email);
  if (c.web) kontAddDetail(card, '\uD83C\uDF10', c.web, c.web.match(/^https?:\/\//) ? c.web : 'https://' + c.web);
  if (c.adresa) kontAddDetail(card, '\uD83D\uDCCD', c.adresa, null);

  if (c.poznamka) {
    var poz = document.createElement('div');
    poz.style.cssText = 'font-size:0.82rem;color:var(--text-muted);margin-top:6px;font-style:italic;';
    poz.textContent = c.poznamka;
    card.appendChild(poz);
  }

  // Akce (admin/výbor)
  if (isPriv) {
    var akce = document.createElement('div');
    akce.style.cssText = 'display:flex;gap:6px;margin-top:10px;';

    var editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Upravit';
    editBtn.addEventListener('click', function() {
      kontShowModal(c, function() { kontLoad(listWrap, user); });
    });
    akce.appendChild(editBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Smazat';
    delBtn.addEventListener('click', function() {
      showConfirmModal(
        'Smazat kontakt?',
        'Kontakt \u201e' + c.nazev + '\u201c bude trvale odstran\u011bn.',
        function() {
          Api.apiPost('api/kontakty.php?action=delete', { id: c.id })
            .then(function() {
              showToast('Kontakt smaz\xe1n');
              kontLoad(listWrap, user);
            })
            .catch(function(e) { showToast(e.message || 'Chyba.', 'error'); });
        }
      );
    });
    akce.appendChild(delBtn);
    card.appendChild(akce);
  }

  return card;
}

function kontAddDetail(parent, icon, text, href) {
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.88rem;margin-bottom:3px;';

  var ic = document.createElement('span');
  ic.style.cssText = 'flex-shrink:0;width:18px;text-align:center;';
  ic.textContent = icon;
  row.appendChild(ic);

  if (href) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.cssText = 'color:var(--accent);text-decoration:none;word-break:break-all;';
    a.textContent = text;
    row.appendChild(a);
  } else {
    var span = document.createElement('span');
    span.style.color = 'var(--text-light)';
    span.textContent = text;
    row.appendChild(span);
  }

  parent.appendChild(row);
}

/* ── Modal pro přidání / úpravu kontaktu ──────────── */
function kontShowModal(existing, onSaved) {
  var m = createModal({
    title: existing ? 'Upravit kontakt' : 'Nov\xfd kontakt',
    width: '480px',
  });
  var overlay = m.overlay;
  var modal = m.modal;
  var closeModal = m.close;

  var fields = {};

  fields.nazev = kontModalField(modal, 'N\xe1zev firmy / jm\xe9no *', 'text',
    existing ? existing.nazev : '', 'nap\u0159. Schindler CZ');

  // Kategorie select
  var katWrap = document.createElement('div');
  katWrap.style.marginBottom = '14px';
  var katLabel = document.createElement('label');
  katLabel.textContent = 'Kategorie';
  katLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var katSelect = document.createElement('select');
  katSelect.className = 'form-input';
  KONT_KATEGORIE.forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k.value;
    opt.textContent = k.icon + ' ' + k.label;
    if (existing && existing.kategorie === k.value) opt.selected = true;
    katSelect.appendChild(opt);
  });
  katWrap.appendChild(katLabel);
  katWrap.appendChild(katSelect);
  modal.appendChild(katWrap);

  fields.telefon = kontModalField(modal, 'Telefon', 'tel',
    existing ? (existing.telefon || '') : '', '+420 123 456 789');
  fields.email = kontModalField(modal, 'E-mail', 'email',
    existing ? (existing.email || '') : '', 'info@firma.cz');
  fields.web = kontModalField(modal, 'Web', 'url',
    existing ? (existing.web || '') : '', 'www.firma.cz');
  fields.adresa = kontModalField(modal, 'Adresa', 'text',
    existing ? (existing.adresa || '') : '', 'Ulice 123, Praha');

  // Poznámka textarea
  var pozWrap = document.createElement('div');
  pozWrap.style.marginBottom = '16px';
  var pozLabel = document.createElement('label');
  pozLabel.textContent = 'Pozn\xe1mka';
  pozLabel.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var pozInput = document.createElement('textarea');
  pozInput.className = 'form-input';
  pozInput.rows = 2;
  pozInput.value = existing ? (existing.poznamka || '') : '';
  pozWrap.appendChild(pozLabel);
  pozWrap.appendChild(pozInput);
  modal.appendChild(pozWrap);

  // Buttons
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Zru\u0161it';
  cancelBtn.addEventListener('click', closeModal);

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Ulo\u017eit';

  saveBtn.addEventListener('click', function() {
    var nazev = fields.nazev.value.trim();
    if (!nazev) { showToast('Vypl\u0148te n\xe1zev.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Ukl\xe1d\xe1m\u2026';

    Api.apiPost('api/kontakty.php?action=save', {
      id: existing ? existing.id : 0,
      nazev: nazev,
      kategorie: katSelect.value,
      telefon: fields.telefon.value.trim(),
      email: fields.email.value.trim(),
      web: fields.web.value.trim(),
      adresa: fields.adresa.value.trim(),
      poznamka: pozInput.value.trim(),
    }).then(function() {
      showToast('Kontakt ulo\u017een');
      closeModal();
      if (onSaved) onSaved();
    }).catch(function(e) {
      showToast(e.message || 'Chyba.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Ulo\u017eit';
    });
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  modal.appendChild(btnRow);

  fields.nazev.focus();
}

function kontModalField(parent, label, type, value, placeholder) {
  var wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';
  var lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.style.cssText = 'display:block;margin-bottom:4px;font-weight:500;font-size:0.9rem;';
  var input = document.createElement('input');
  input.type = type;
  input.className = 'form-input';
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  parent.appendChild(wrap);
  return input;
}
