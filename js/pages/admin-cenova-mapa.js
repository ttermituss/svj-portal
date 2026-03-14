/* ===== Cenová mapa bytů ===== */

function renderCenovaMapaCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('Cenov\xe1 mapa byt\u016f');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 16px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'Odhadn\xed ceny nemovitost\xed v lokalit\u011b — u\u017eitečn\xe9 pro pojistnou hodnotu budovy a p\u0159ehled trhu.';
  body.appendChild(hint);

  var contentWrap = document.createElement('div');
  body.appendChild(contentWrap);

  // Načteme adresu z KN status
  Api.apiGetCached('api/kn.php?action=status', 300)
    .then(function(d) { cenovaMapaRender(contentWrap, d.adresa_plna || ''); })
    .catch(function()  { cenovaMapaRender(contentWrap, ''); });

  el.appendChild(card.card);
}

function cenovaMapaRender(wrap, adresa) {
  wrap.replaceChildren();

  if (adresa) {
    var adrEl = document.createElement('div');
    adrEl.style.cssText = 'font-size:0.88rem;color:var(--text-light);margin-bottom:14px;';
    adrEl.textContent = '\uD83D\uDCCD ' + adresa;
    wrap.appendChild(adrEl);
  }

  var links = [
    {
      nazev:  'Cenov\xe1 mapa \u2014 ČSOB / cenovamapa.org',
      popis:  'Odhadn\xed cena m\xb2 v lokalit\u011b, vývoj cen, srovn\xe1n\xed s okol\xedm.',
      url:    'https://www.cenovamapa.org/' + (adresa ? '?adresa=' + encodeURIComponent(adresa) : ''),
      icon:   '\uD83D\uDCB0',
      badge:  'zdarma',
    },
    {
      nazev:  'Cenov\xe9 mapy ČÚZK',
      popis:  'Ofici\xe1ln\xed ceny z kupn\xedch smluv evidovan\xfdch v katastru nemovitost\xed.',
      url:    'https://cenovemappy.cuzk.cz/',
      icon:   '\uD83C\uDFDB',
      badge:  'ofici\xe1ln\xed',
    },
    {
      nazev:  'Sreality.cz — nabídky v okol\xed',
      popis:  'Aktu\xe1ln\xed inzertn\xed ceny byt\u016f k prodeji v lokalit\u011b.',
      url:    'https://www.sreality.cz/hledani/prodej/byty/' + (adresa ? '?query=' + encodeURIComponent(adresa) : ''),
      icon:   '\uD83C\uDFE0',
      badge:  'inzerc\xed',
    },
  ];

  links.forEach(function(link) {
    var row = document.createElement('a');
    row.href = link.url;
    row.target = '_blank';
    row.rel = 'noopener noreferrer';
    row.style.cssText = [
      'display:flex', 'align-items:flex-start', 'gap:12px',
      'padding:12px 14px', 'border:1px solid var(--border)',
      'border-radius:8px', 'margin-bottom:10px',
      'text-decoration:none', 'color:inherit',
      'background:var(--bg-hover)', 'transition:border-color var(--transition)',
    ].join(';');

    row.addEventListener('mouseenter', function() { row.style.borderColor = 'var(--accent)'; });
    row.addEventListener('mouseleave', function() { row.style.borderColor = 'var(--border)'; });

    var icon = document.createElement('span');
    icon.style.cssText = 'font-size:1.4rem;flex-shrink:0;padding-top:2px;';
    icon.textContent = link.icon;
    row.appendChild(icon);

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;';

    var nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-weight:600;font-size:0.9rem;';
    nameEl.textContent = link.nazev;
    nameRow.appendChild(nameEl);

    var badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.82rem;padding:4px 10px;border-radius:20px;' +
      'background:var(--accent-light);color:var(--accent-text);font-weight:600;';
    badge.textContent = link.badge;
    nameRow.appendChild(badge);

    info.appendChild(nameRow);

    var popisEl = document.createElement('div');
    popisEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);';
    popisEl.textContent = link.popis;
    info.appendChild(popisEl);

    row.appendChild(info);

    var arrow = document.createElement('span');
    arrow.style.cssText = 'color:var(--text-muted);flex-shrink:0;padding-top:4px;';
    arrow.textContent = '\u2197';
    row.appendChild(arrow);

    wrap.appendChild(row);
  });

  var note = document.createElement('div');
  note.style.cssText = 'font-size:0.82rem;color:var(--text-muted);margin-top:4px;';
  note.textContent = '\uD83D\uDCA1 Cenov\xe9 \xfadaje slou\u017e\xed jako orientační informace pro ú\u010dely pojistn\xe9 hodnoty a spr\xe1vy SVJ.';
  wrap.appendChild(note);
}
