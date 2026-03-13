/* ===== FOND OPRAV — HLAVNÍ STRÁNKA (admin/výbor) ===== */

var FOND_KAT_PRIJEM = [
  'Z\xe1lohy vlastn\xedk\u016f', 'Dotace / subvence', '\xdaroky z \xfa\u010dtu',
  'Pojistn\xe9 pln\u011bn\xed', 'Ostatn\xed p\u0159\xedjmy',
];
var FOND_KAT_VYDAJ = [
  'Oprava st\u0159echy', 'Fas\xe1da / zateplen\xed', 'V\xfdtah', 'Elektroinstalace',
  'Vodoinstalace / kanalizace', 'Mal\xedrov\xe1n\xed spole\u010dn\xfdch prostor',
  'Spr\xe1va domu', 'Pojistiteln\xe9 v\xfddaje', 'Revize', 'Ostatn\xed v\xfddaje',
];

var FOND_UCTY_TYP = {
  bezny: 'B\u011b\u017en\xfd', sporici: 'Spo\u0159ic\xed',
  terminovany: 'Term\xednovan\xfd', jiny: 'Jin\xfd',
};

var fondFilters = { rok: '', typ: '', kategorie: '', q: '' };
var fondListOffset = 0;
var fondListLimit = 30;

Router.register('fond-oprav', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { Router.navigate('home'); return; }
  var isPriv = user.role === 'admin' || user.role === 'vybor';
  if (!isPriv) { Router.navigate('home'); return; }

  fondFilters = { rok: '', typ: '', kategorie: '', q: '' };
  fondListOffset = 0;

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Fond oprav';
  var sub = document.createElement('p');
  sub.textContent = 'P\u0159ehled hospoda\u0159en\xed, \xfa\u010dty, statistiky';
  title.appendChild(h1); title.appendChild(sub);
  el.appendChild(title);

  // Tab bar
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border);';
  var tabs = [
    { id: 'prehled', label: 'P\u0159ehled' },
    { id: 'rozpocet', label: 'Rozpo\u010det' },
    { id: 'zalohy', label: 'Z\xe1lohy' },
  ];
  var tabPanels = {};
  var activeTab = 'prehled';

  tabs.forEach(function(t) {
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    btn.style.cssText = 'border:none;border-bottom:3px solid transparent;border-radius:0;'
      + 'padding:10px 20px;font-size:0.95rem;font-weight:500;color:var(--text-light);'
      + 'background:none;cursor:pointer;margin-bottom:-2px;transition:all 0.15s;min-width:44px;min-height:44px;';
    btn.addEventListener('click', function() { switchTab(t.id); });
    tabBar.appendChild(btn);
  });
  el.appendChild(tabBar);

  function switchTab(id) {
    activeTab = id;
    tabBar.querySelectorAll('button').forEach(function(b) {
      var isActive = b.dataset.tab === id;
      b.style.borderBottomColor = isActive ? 'var(--accent)' : 'transparent';
      b.style.color = isActive ? 'var(--text)' : 'var(--text-light)';
      b.style.fontWeight = isActive ? '700' : '500';
    });
    Object.keys(tabPanels).forEach(function(k) {
      tabPanels[k].style.display = k === id ? '' : 'none';
    });
    // Lazy-load tab content
    if (id === 'rozpocet' && !tabPanels.rozpocet.dataset.loaded) {
      tabPanels.rozpocet.dataset.loaded = '1';
      fondRozpocetInit(tabPanels.rozpocet);
    }
    if (id === 'zalohy' && !tabPanels.zalohy.dataset.loaded) {
      tabPanels.zalohy.dataset.loaded = '1';
      fondZalohyInit(tabPanels.zalohy);
    }
  }

  // Tab panels
  tabs.forEach(function(t) {
    var panel = document.createElement('div');
    panel.style.display = t.id === 'prehled' ? '' : 'none';
    el.appendChild(panel);
    tabPanels[t.id] = panel;
  });

  // Activate first tab visually
  switchTab('prehled');

  // Přehled panel content
  var prehledEl = tabPanels.prehled;

  var statsWrap = document.createElement('div');
  prehledEl.appendChild(statsWrap);

  var uctyWrap = document.createElement('div');
  prehledEl.appendChild(uctyWrap);

  var chartsRow = document.createElement('div');
  chartsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';
  prehledEl.appendChild(chartsRow);
  var chartWrap = document.createElement('div');
  var trendWrap = document.createElement('div');
  chartsRow.appendChild(chartWrap);
  chartsRow.appendChild(trendWrap);

  var statsRow = document.createElement('div');
  statsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';
  prehledEl.appendChild(statsRow);
  var rocniWrap = document.createElement('div');
  var katWrap = document.createElement('div');
  statsRow.appendChild(rocniWrap);
  statsRow.appendChild(katWrap);

  // Action bar: Add + Export
  var actionBar = document.createElement('div');
  actionBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';

  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ P\u0159idat z\xe1znam';
  addBtn.addEventListener('click', function() {
    fondShowRecordModal(null, function() { loadAll(); });
  });
  actionBar.appendChild(addBtn);

  ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    var icons = { pdf: '\uD83D\uDCC3 PDF', xlsx: '\uD83D\uDCCA XLSX', csv: '\uD83D\uDCC4 CSV' };
    btn.textContent = icons[fmt];
    btn.addEventListener('click', function() {
      window.location.href = 'api/export.php?type=fond_oprav&format=' + fmt;
    });
    actionBar.appendChild(btn);
  });
  prehledEl.appendChild(actionBar);

  // Filter bar
  var filterWrap = document.createElement('div');
  prehledEl.appendChild(filterWrap);

  // Records list
  var listWrap = document.createElement('div');
  prehledEl.appendChild(listWrap);

  // Responsive
  var mq = window.matchMedia('(max-width: 768px)');
  function applyMq(e) {
    chartsRow.style.gridTemplateColumns = e.matches ? '1fr' : '1fr 1fr';
    statsRow.style.gridTemplateColumns = e.matches ? '1fr' : '1fr 1fr';
  }
  applyMq(mq);
  mq.addEventListener('change', applyMq);

  function loadAll() {
    var qs = fondBuildFilterQs();
    Promise.all([
      Api.apiGet('api/fond_oprav.php?action=stats'),
      Api.apiGet('api/fond_oprav.php?action=statsRocni'),
      Api.apiGet('api/fond_oprav.php?action=statsKat'),
      Api.apiGet('api/fond_ucty.php?action=list'),
      Api.apiGet('api/fond_oprav.php?action=list&limit=' + fondListLimit + '&offset=' + fondListOffset + qs),
    ]).then(function(res) {
      fondRenderSummary(statsWrap, res[0]);
      fondRenderMonthChart(chartWrap, res[0].mesice || {});
      fondRenderTrendChart(trendWrap, res[1].trend || []);
      fondRenderRocniTable(rocniWrap, res[1].roky || []);
      fondRenderKategorie(katWrap, res[2]);
      fondRenderUcty(uctyWrap, res[3].ucty || [], loadAll);
      fondRenderFilterBar(filterWrap, res[1].roky || [], function() {
        fondListOffset = 0;
        loadRecords();
      });
      fondRenderZaznamy(listWrap, res[4].zaznamy || [], res[4].total || 0, user, loadAll, loadRecords);
    }).catch(function(e) {
      statsWrap.replaceChildren();
      var err = document.createElement('div');
      err.className = 'info-box info-box-danger';
      err.textContent = 'Chyba: ' + (e.message || 'Nepoda\u0159ilo se na\u010d\u00edst data.');
      statsWrap.appendChild(err);
    });
  }

  function loadRecords() {
    var qs = fondBuildFilterQs();
    Api.apiGet('api/fond_oprav.php?action=list&limit=' + fondListLimit + '&offset=' + fondListOffset + qs)
      .then(function(res) {
        fondRenderZaznamy(listWrap, res.zaznamy || [], res.total || 0, user, loadAll, loadRecords);
      })
      .catch(function(e) { showToast(e.message || 'Chyba', 'error'); });
  }

  loadAll();
});

function fondBuildFilterQs() {
  var qs = '';
  if (fondFilters.rok) qs += '&rok=' + encodeURIComponent(fondFilters.rok);
  if (fondFilters.typ) qs += '&typ=' + encodeURIComponent(fondFilters.typ);
  if (fondFilters.kategorie) qs += '&kategorie=' + encodeURIComponent(fondFilters.kategorie);
  if (fondFilters.q) qs += '&q=' + encodeURIComponent(fondFilters.q);
  return qs;
}

/* ===== FILTER BAR ===== */

function fondRenderFilterBar(wrap, roky, onChange) {
  // Only rebuild if not yet rendered (avoid flicker)
  if (wrap.dataset.rendered) {
    fondUpdateKatOptions();
    return;
  }
  wrap.dataset.rendered = '1';
  wrap.replaceChildren();

  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;'
    + 'padding:12px 16px;background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;';

  // Rok select
  var rokSel = document.createElement('select');
  rokSel.className = 'form-input';
  rokSel.style.cssText = 'width:auto;min-width:90px;';
  var rokDef = document.createElement('option');
  rokDef.value = ''; rokDef.textContent = 'V\u0161echny roky';
  rokSel.appendChild(rokDef);
  var years = roky.map(function(r) { return r.rok; }).sort(function(a, b) { return b - a; });
  years.forEach(function(y) {
    var opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (String(y) === fondFilters.rok) opt.selected = true;
    rokSel.appendChild(opt);
  });
  rokSel.addEventListener('change', function() { fondFilters.rok = rokSel.value; onChange(); });
  bar.appendChild(rokSel);

  // Typ select
  var typSel = document.createElement('select');
  typSel.className = 'form-input';
  typSel.style.cssText = 'width:auto;min-width:100px;';
  [{ v: '', l: 'V\u0161echny typy' }, { v: 'prijem', l: '\u2191 P\u0159\xedjjem' }, { v: 'vydaj', l: '\u2193 V\xfddaj' }]
    .forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.v; opt.textContent = t.l;
      if (t.v === fondFilters.typ) opt.selected = true;
      typSel.appendChild(opt);
    });
  typSel.addEventListener('change', function() {
    fondFilters.typ = typSel.value;
    fondFilters.kategorie = '';
    fondUpdateKatOptions();
    onChange();
  });
  bar.appendChild(typSel);

  // Kategorie select
  var katSel = document.createElement('select');
  katSel.className = 'form-input';
  katSel.id = 'fond-filter-kat';
  katSel.style.cssText = 'width:auto;min-width:140px;';
  bar.appendChild(katSel);
  window._fondFilterKatSel = katSel;
  window._fondFilterKatOnChange = onChange;
  fondUpdateKatOptions();

  // Search input
  var searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.className = 'form-input';
  searchInp.placeholder = 'Hledat v popisu\u2026';
  searchInp.style.cssText = 'width:auto;min-width:160px;flex:1;';
  searchInp.value = fondFilters.q;
  var searchTimer = null;
  searchInp.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      fondFilters.q = searchInp.value.trim();
      onChange();
    }, 300);
  });
  bar.appendChild(searchInp);

  // Reset button
  var resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary btn-sm';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', function() {
    fondFilters = { rok: '', typ: '', kategorie: '', q: '' };
    rokSel.value = '';
    typSel.value = '';
    searchInp.value = '';
    fondUpdateKatOptions();
    onChange();
  });
  bar.appendChild(resetBtn);

  wrap.appendChild(bar);
}

function fondUpdateKatOptions() {
  var katSel = window._fondFilterKatSel;
  if (!katSel) return;
  var onChange = window._fondFilterKatOnChange;
  katSel.replaceChildren();
  var defOpt = document.createElement('option');
  defOpt.value = ''; defOpt.textContent = 'V\u0161echny kategorie';
  katSel.appendChild(defOpt);

  var cats = [];
  if (fondFilters.typ === 'prijem') cats = FOND_KAT_PRIJEM;
  else if (fondFilters.typ === 'vydaj') cats = FOND_KAT_VYDAJ;
  else cats = FOND_KAT_PRIJEM.concat(FOND_KAT_VYDAJ);

  cats.forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k; opt.textContent = k;
    if (k === fondFilters.kategorie) opt.selected = true;
    katSel.appendChild(opt);
  });

  katSel.onchange = function() {
    fondFilters.kategorie = katSel.value;
    if (onChange) onChange();
  };
}

/* ===== SUMMARY BOXES ===== */

function fondRenderSummary(wrap, data) {
  wrap.replaceChildren();
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;';

  var items = [
    { label: 'Z\u016fstatek', value: data.zustatek, color: data.zustatek >= 0 ? 'var(--accent)' : 'var(--danger)', big: true },
    { label: 'P\u0159\xedjmy celkem', value: data.prijem_celkem, color: 'var(--accent)' },
    { label: 'V\xfddaje celkem', value: data.vydaj_celkem, color: 'var(--danger)' },
  ];

  items.forEach(function(item) {
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;padding:16px 20px;';
    if (item.big) box.style.borderWidth = '2px';

    var val = document.createElement('div');
    val.style.cssText = 'font-size:' + (item.big ? '1.5rem' : '1.15rem') + ';font-weight:700;color:' + item.color + ';';
    val.textContent = fondFmt(item.value) + '\xa0K\u010d';
    box.appendChild(val);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
    lbl.textContent = item.label;
    box.appendChild(lbl);

    grid.appendChild(box);
  });

  wrap.appendChild(grid);
}

/* Charty + helpers → fond-oprav-charts.js */
