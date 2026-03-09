/* ===== NASTENKA PAGE ===== */

Router.register('nastenka', function(el) {

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'Nástěnka';
  var sub = document.createElement('p');
  sub.textContent = 'Oznámení a důležité informace pro vlastníky';
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
  icon.textContent = '\uD83D\uDCCB';
  var msg = document.createElement('p');
  msg.textContent = 'Nástěnka je zatím prázdná. Oznámení budou zobrazena zde.';
  empty.appendChild(icon);
  empty.appendChild(msg);
  body.appendChild(empty);

  card.appendChild(body);
  el.appendChild(card);
});
