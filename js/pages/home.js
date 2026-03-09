/* ===== HOME PAGE ===== */

Router.register('home', function(el) {

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Přehled';
  var sub = document.createElement('p');
  sub.textContent = 'Vítejte v SVJ Portálu';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  // Stats
  var stats = document.createElement('div');
  stats.className = 'stats';

  var statItems = [
    { label: 'Vlastníci', value: '\u2014', id: 'stat-vlastnici' },
    { label: 'Jednotky', value: '\u2014', id: 'stat-jednotky' },
    { label: 'Dokumenty', value: '\u2014', id: 'stat-dokumenty' },
  ];

  statItems.forEach(function(s) {
    var card = document.createElement('div');
    card.className = 'stat-card';
    var lbl = document.createElement('div');
    lbl.className = 'stat-label';
    lbl.textContent = s.label;
    var val = document.createElement('div');
    val.className = 'stat-value accent';
    val.id = s.id;
    val.textContent = s.value;
    card.appendChild(lbl);
    card.appendChild(val);
    stats.appendChild(card);
  });

  el.appendChild(stats);

  // Quick links card
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

  var actions = [
    { icon: '\uD83C\uDFE0', label: 'Registrovat SVJ', page: 'registrace' },
    { icon: '\uD83D\uDCCB', label: 'Nástěnka', page: 'nastenka' },
    { icon: '\uD83D\uDCC4', label: 'Dokumenty', page: 'dokumenty' },
  ];

  actions.forEach(function(a) {
    var link = document.createElement('a');
    link.className = 'link-btn';
    link.style.marginRight = '8px';
    link.style.marginBottom = '8px';
    link.textContent = a.icon + ' ' + a.label;
    link.href = '#' + a.page;
    body.appendChild(link);
  });

  card.appendChild(body);
  el.appendChild(card);

  // Info box
  var info = document.createElement('div');
  info.className = 'info-box info-box-info';
  info.style.marginTop = '16px';
  info.textContent = 'Začněte registrací SVJ zadáním IČO — data se automaticky načtou z veřejných rejstříků (ARES, Justice.cz).';
  el.appendChild(info);
});
