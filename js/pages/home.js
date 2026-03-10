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
    { label: 'Dokumenty',  id: 'stat-dokumenty' },
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

  // Rychlé akce — závisí na stavu přihlášení a SVJ
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

function makeHomeInfoBox(type, text) {
  var div = document.createElement('div');
  div.className = 'info-box info-box-' + type;
  div.style.marginTop = '16px';
  div.textContent = text;
  return div;
}
