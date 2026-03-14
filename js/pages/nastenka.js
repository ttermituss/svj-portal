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

  body.appendChild(makeEmptyState('\uD83D\uDCCB', 'Nástěnka je zatím prázdná. Oznámení budou zobrazena zde.'));

  card.appendChild(body);
  el.appendChild(card);
});
