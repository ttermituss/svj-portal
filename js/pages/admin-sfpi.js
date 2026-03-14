/* ===== SFPI / DOTACE — přehled dotačních programů pro SVJ ===== */

function renderSfpiCard(el, user) {
  if (!user.svj_id) return;

  var card = makeAdminCard('\uD83D\uDCB0 Dotace pro SVJ');
  var body = card.body;

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 16px;font-size:0.88rem;color:var(--text-light);';
  hint.textContent = 'P\u0159ehled aktu\u00e1ln\u00edch dotac\u00ed a podp\u016frn\u00fdch program\u016f pro spole\u010denctv\u00ed vlastn\u00edk\u016f. Kliknut\u00edm na program otev\u0159ete ofici\u00e1ln\u00ed str\u00e1nku.';
  body.appendChild(hint);

  // Načti info o budově z KN statusu pro kontextový hint
  Api.apiGetCached('api/kn.php?action=status', 300)
    .then(function(data) { renderSfpiPrograms(body, data); })
    .catch(function()    { renderSfpiPrograms(body, null); });

  el.appendChild(card.card);
}

var SFPI_PROGRAMS = [
  {
    id:       'panel2020',
    nazev:    'Panel 2020+',
    zdroj:    'SFPI',
    ikona:    '\uD83C\uDFD7\uFE0F',
    popis:    'Zvýhodněné úvěry na opravy a modernizaci bytových domů — zateplení, střecha, výtah, fasáda.',
    tip:      'panelDom', // zobrazit výrazněji pro panelové domy
    url:      'https://www.sfpi.cz/programy/panel-2020',
    stitky:   ['úvěr', 'zateplení', 'výtah', 'fasáda'],
  },
  {
    id:       'nzu',
    nazev:    'Nová zelená úsporám',
    zdroj:    'SFŽP / MŽP',
    ikona:    '\uD83C\uDF3F',
    popis:    'Dotace na zateplení, rekuperaci, FV systémy, solární ohřev vody a zelené střechy.',
    url:      'https://www.novazelenausporam.cz/',
    stitky:   ['dotace', 'zateplení', 'FVE', 'solár'],
  },
  {
    id:       'jtz',
    nazev:    'Jednotná technická zpráva',
    zdroj:    'MMR',
    ikona:    '\uD83D\uDCCB',
    popis:    'Podpora zpracování technické zprávy domu jako vstupního dokumentu pro plánování oprav a čerpání dotací.',
    url:      'https://www.mmr.cz/cs/stavebni-rad-a-bytova-politika/bytova-politika/podpora-bydleni',
    stitky:   ['dokument', 'příprava'],
  },
  {
    id:       'irop',
    nazev:    'IROP — Energetické úspory',
    zdroj:    'EU / MMR',
    ikona:    '\uD83C\uDDEA\uD83C\uDDFA',
    popis:    'Evropské dotace na energetické úspory bytových domů — hloubková renovace, zateplení, HVAC.',
    url:      'https://irop.mmr.cz/cs/vyzvy',
    stitky:   ['EU dotace', 'renovace', 'energie'],
  },
  {
    id:       'dps',
    nazev:    'Podpora výstavby — DPS',
    zdroj:    'SFPI',
    ikona:    '\uD83D\uDEBF',
    popis:    'Program pro domy s pečovatelskou službou — bezbariérovost, výtahy, společné prostory.',
    url:      'https://www.sfpi.cz/programy/dps',
    stitky:   ['bezbariér', 'výtah', 'senior'],
  },
];

function renderSfpiPrograms(body, knData) {
  var konstrukce = knData && knData.konstrukce_nazev ? knData.konstrukce_nazev.toLowerCase() : '';
  var isPanel    = konstrukce.indexOf('panel') !== -1 || konstrukce.indexOf('monol') !== -1;

  var grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

  SFPI_PROGRAMS.forEach(function(p) {
    var isHighlighted = p.tip === 'panelDom' && isPanel;

    var row = document.createElement('div');
    row.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:12px 14px;'
      + (isHighlighted ? 'border-color:var(--accent);background:var(--bg-hover);' : '');

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';

    var ikonaEl = document.createElement('span');
    ikonaEl.textContent = p.ikona;
    ikonaEl.style.cssText = 'font-size:1.4rem;flex-shrink:0;margin-top:1px;';

    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;';

    var nazevEl = document.createElement('a');
    nazevEl.href   = p.url;
    nazevEl.target = '_blank';
    nazevEl.rel    = 'noopener noreferrer';
    nazevEl.textContent = p.nazev;
    nazevEl.style.cssText = 'font-weight:600;font-size:0.95rem;color:var(--accent);text-decoration:none;';

    var zdrojEl = document.createElement('span');
    zdrojEl.textContent = p.zdroj;
    zdrojEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);border:1px solid var(--border);'
      + 'border-radius:4px;padding:1px 6px;';

    if (isHighlighted) {
      var tipEl = document.createElement('span');
      tipEl.textContent = '\u2605 Doporu\u010deno pro v\u00e1\u0161 typ budovy';
      tipEl.style.cssText = 'font-size:0.82rem;color:var(--accent);font-weight:600;';
      headerRow.appendChild(nazevEl);
      headerRow.appendChild(zdrojEl);
      headerRow.appendChild(tipEl);
    } else {
      headerRow.appendChild(nazevEl);
      headerRow.appendChild(zdrojEl);
    }

    var popisEl = document.createElement('div');
    popisEl.textContent = p.popis;
    popisEl.style.cssText = 'font-size:0.85rem;color:var(--text-light);margin-bottom:6px;';

    var stitkyWrap = document.createElement('div');
    stitkyWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
    p.stitky.forEach(function(s) {
      var tag = document.createElement('span');
      tag.textContent = s;
      tag.style.cssText = 'font-size:0.82rem;background:var(--bg-hover);border:1px solid var(--border);'
        + 'border-radius:10px;padding:1px 8px;color:var(--text-light);';
      stitkyWrap.appendChild(tag);
    });

    info.appendChild(headerRow);
    info.appendChild(popisEl);
    info.appendChild(stitkyWrap);
    top.appendChild(ikonaEl);
    top.appendChild(info);
    row.appendChild(top);
    grid.appendChild(row);
  });

  body.appendChild(grid);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:12px;font-size:0.82rem;color:var(--text-light);';
  note.textContent = 'Informace jsou orientační. Vždy ověřte aktuální podmínky na webu poskytovatele dotace. '
    + (knData && knData.konstrukce_nazev ? 'Typ konstrukce va\u0161\u00ed budovy: ' + knData.konstrukce_nazev + '.' : '');
  body.appendChild(note);
}
