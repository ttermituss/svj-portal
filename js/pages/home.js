/* ===== HOME PAGE ===== */

Router.register('home', function(el) {
  var user = Auth.getUser();
  var svj  = Auth.getSvj();

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Přehled';
  var sub = document.createElement('p');
  sub.textContent = svj ? svj.nazev : 'Vítejte v SVJ Portálu';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // Statistiky
  var stats = document.createElement('div');
  stats.className = 'stats';
  [
    { label: 'Vlastníci',  id: 'stat-vlastnici' },
    { label: 'Jednotky',   id: 'stat-jednotky'  },
    { label: 'Plomby KN',  id: 'stat-plomby'    },
  ].forEach(function(s) {
    var card = document.createElement('div');
    card.className = 'stat-card';
    var lbl = document.createElement('div');
    lbl.className = 'stat-label';
    lbl.textContent = s.label;
    var val = document.createElement('div');
    val.className = 'stat-value accent';
    val.id = s.id;
    val.textContent = '\u2014';
    card.appendChild(lbl);
    card.appendChild(val);
    stats.appendChild(card);
  });
  el.appendChild(stats);

  // Načti statistiky
  if (user && user.svj_id) {
    Api.apiGet('api/stats.php').then(function(d) {
      var ev = document.getElementById('stat-vlastnici');
      var ej = document.getElementById('stat-jednotky');
      var ep = document.getElementById('stat-plomby');
      if (ev) ev.textContent = d.vlastnici;
      if (ej) ej.textContent = d.jednotky;
      if (ep) {
        ep.textContent = d.plomby;
        if (d.plomby > 0) ep.style.color = 'var(--danger)';
      }
    }).catch(function() {});
  }

  // Počasí
  var weatherWrap = document.createElement('div');
  el.appendChild(weatherWrap);
  if (user && user.svj_id) renderWeatherCard(weatherWrap);

  // Rychlé akce
  var card = document.createElement('div');
  card.className = 'card';
  var header = document.createElement('div');
  header.className = 'card-header';
  var hTitle = document.createElement('h2');
  hTitle.textContent = 'Rychlé akce';
  header.appendChild(hTitle);
  card.appendChild(header);

  var body = document.createElement('div');
  body.className = 'card-body';

  var actions = [];
  if (!user || !user.svj_id) {
    actions.push({ icon: '\uD83C\uDFE0', label: 'Registrovat SVJ', page: 'registrace' });
  }
  actions.push({ icon: '\uD83D\uDCCB', label: 'Nástěnka',  page: 'nastenka'  });
  actions.push({ icon: '\uD83D\uDCC1', label: 'Dokumenty', page: 'dokumenty' });
  if (user && (user.role === 'admin' || user.role === 'vybor')) {
    actions.push({ icon: '\uD83D\uDEE1\uFE0F', label: 'Správa portálu', page: 'admin' });
  }

  actions.forEach(function(a) {
    var link = document.createElement('a');
    link.className = 'link-btn';
    link.style.cssText = 'margin-right:8px;margin-bottom:8px;';
    link.textContent = a.icon + ' ' + a.label;
    link.href = '#' + a.page;
    body.appendChild(link);
  });

  card.appendChild(body);
  el.appendChild(card);

  // Kontextová informace
  var box = null;
  if (!user) {
    box = makeHomeInfoBox('info',
      'Začněte registrací SVJ zadáním IČO \u2014 data se automaticky načtou z ARES a Justice.cz.');
  } else if (!user.svj_id) {
    box = makeHomeInfoBox('warning',
      'Váš účet není přiřazen k žádnému SVJ. Požádejte správce o pozvánku, nebo zaregistrujte své SVJ.');
  } else if (svj && svj.ico) {
    box = makeHomeInfoBox('muted',
      'IČO: ' + svj.ico + ' \u00b7 Propojeno s ARES \u2713');
  }
  if (box) el.appendChild(box);
});

/* ===== WEATHER CARD ===== */

function renderWeatherCard(wrap) {
  Api.apiGet('api/weather.php')
    .then(function(d) {
      if (!d.current) return;
      wrap.appendChild(buildWeatherCard(d));
    })
    .catch(function() { /* GPS nemáme nebo API nedostupné — tichý fail */ });
}

function buildWeatherCard(d) {
  var card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';

  var header = document.createElement('div');
  header.className = 'card-header';
  var hTitle = document.createElement('h2');
  hTitle.textContent = '\uD83C\uDF24\uFE0F Po\u010das\u00ed u budovy';
  header.appendChild(hTitle);
  if (d.adresa) {
    var hSub = document.createElement('span');
    hSub.style.cssText = 'font-size:0.8rem;color:var(--text-light);margin-left:8px;';
    hSub.textContent = d.adresa;
    header.appendChild(hSub);
  }
  card.appendChild(header);

  var body = document.createElement('div');
  body.className = 'card-body';

  // Aktuální počasí
  var cur = d.current;
  var wmo = wmoInfo(cur.weather_code);

  var curRow = document.createElement('div');
  curRow.style.cssText = 'display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap;';

  var iconEl = document.createElement('div');
  iconEl.textContent = wmo.icon;
  iconEl.style.cssText = 'font-size:2.8rem;line-height:1;';

  var curInfo = document.createElement('div');

  var tempEl = document.createElement('div');
  tempEl.style.cssText = 'font-size:2rem;font-weight:700;color:var(--accent);line-height:1;';
  tempEl.textContent = Math.round(cur.temperature_2m) + '\u00b0C';

  var descEl = document.createElement('div');
  descEl.style.cssText = 'font-size:0.95rem;color:var(--text);margin-top:2px;';
  descEl.textContent = wmo.text;

  var metaEl = document.createElement('div');
  metaEl.style.cssText = 'font-size:0.82rem;color:var(--text-light);margin-top:4px;';
  metaEl.textContent = '\uD83D\uDCA7 ' + cur.relative_humidity_2m + '%'
    + '\u2003\uD83D\uDCA8 ' + Math.round(cur.wind_speed_10m) + '\u00a0km/h';
  if (cur.precipitation > 0) {
    metaEl.textContent += '\u2003\uD83C\uDF27\uFE0F ' + cur.precipitation + '\u00a0mm';
  }

  curInfo.appendChild(tempEl);
  curInfo.appendChild(descEl);
  curInfo.appendChild(metaEl);
  curRow.appendChild(iconEl);
  curRow.appendChild(curInfo);
  body.appendChild(curRow);

  // 7denní výhled
  if (d.daily && d.daily.time) {
    var forecastRow = document.createElement('div');
    forecastRow.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;';

    var times = d.daily.time;
    var maxTemps = d.daily.temperature_2m_max;
    var minTemps = d.daily.temperature_2m_min;
    var codes   = d.daily.weather_code;

    var dnames = ['Ne', 'Po', '\u00dat', 'St', '\u010ct', 'P\u00e1', 'So'];

    times.forEach(function(dateStr, i) {
      var dayWmo = wmoInfo(codes[i]);
      var date   = new Date(dateStr);
      var isToday = i === 0;

      var dayCard = document.createElement('div');
      dayCard.style.cssText = 'flex:0 0 auto;min-width:58px;text-align:center;padding:8px 6px;'
        + 'border-radius:8px;border:1px solid var(--border);background:' + (isToday ? 'var(--bg-hover)' : 'transparent') + ';';

      var dayName = document.createElement('div');
      dayName.style.cssText = 'font-size:0.75rem;color:var(--text-light);font-weight:' + (isToday ? '700' : '400') + ';';
      dayName.textContent = isToday ? 'Dnes' : dnames[date.getDay()];

      var dayIcon = document.createElement('div');
      dayIcon.style.cssText = 'font-size:1.4rem;margin:3px 0;';
      dayIcon.textContent = dayWmo.icon;

      var dayMax = document.createElement('div');
      dayMax.style.cssText = 'font-size:0.85rem;font-weight:600;';
      dayMax.textContent = Math.round(maxTemps[i]) + '\u00b0';

      var dayMin = document.createElement('div');
      dayMin.style.cssText = 'font-size:0.78rem;color:var(--text-light);';
      dayMin.textContent = Math.round(minTemps[i]) + '\u00b0';

      dayCard.appendChild(dayName);
      dayCard.appendChild(dayIcon);
      dayCard.appendChild(dayMax);
      dayCard.appendChild(dayMin);
      forecastRow.appendChild(dayCard);
    });

    body.appendChild(forecastRow);
  }

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;font-size:0.72rem;color:var(--text-light);';
  note.textContent = 'Zdroj: Open-Meteo.com \u00b7 aktualizováno při načtení stránky';
  body.appendChild(note);

  card.appendChild(body);
  return card;
}

/* ===== WMO weather codes → ikona + text ===== */

function wmoInfo(code) {
  if (code === 0)               return { icon: '\u2600\uFE0F', text: 'Jasno' };
  if (code <= 2)                return { icon: '\uD83C\uDF24\uFE0F', text: 'Polojasno' };
  if (code === 3)               return { icon: '\u2601\uFE0F', text: 'Zataženo' };
  if (code <= 48)               return { icon: '\uD83C\uDF2B\uFE0F', text: 'Mlha' };
  if (code <= 55)               return { icon: '\uD83C\uDF26\uFE0F', text: 'Mrholení' };
  if (code <= 65)               return { icon: '\uD83C\uDF27\uFE0F', text: 'Déšť' };
  if (code <= 67)               return { icon: '\uD83C\uDF28\uFE0F', text: 'Ledový déšť' };
  if (code <= 77)               return { icon: '\u2744\uFE0F', text: 'Sníh' };
  if (code <= 82)               return { icon: '\uD83C\uDF26\uFE0F', text: 'Přeháňky' };
  if (code <= 86)               return { icon: '\uD83C\uDF28\uFE0F', text: 'Sněhové přeháňky' };
  return                               { icon: '\u26C8\uFE0F', text: 'Bouřka' };
}

function makeHomeInfoBox(type, text) {
  var div = document.createElement('div');
  div.className = 'info-box info-box-' + type;
  div.style.marginTop = '16px';
  div.textContent = text;
  return div;
}
