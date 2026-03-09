/* ===== JEDNOTKY PAGE ===== */

Router.register('jednotky', function(el) {

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Jednotky';
  var sub = document.createElement('p');
  sub.textContent = 'Přehled bytových a nebytových jednotek';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  var card = document.createElement('div');
  card.className = 'card';

  var body = document.createElement('div');
  body.className = 'card-body';

  var empty = document.createElement('div');
  empty.className = 'empty-state';
  var icon = document.createElement('div');
  icon.className = 'icon';
  icon.textContent = '\uD83C\uDFE2';
  var msg = document.createElement('p');
  msg.textContent = 'Seznam jednotek bude dostupný po napojení na ČÚZK.';
  empty.appendChild(icon);
  empty.appendChild(msg);
  body.appendChild(empty);

  card.appendChild(body);
  el.appendChild(card);
});
