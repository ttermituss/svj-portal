/* ===== O domě — informace o budově a správa ===== */

Router.register('odom', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (!user.svj_id) { Router.navigate('home'); return; }

  var title = document.createElement('div');
  title.className = 'page-title';
  var h1 = document.createElement('h1');
  h1.textContent = 'O dom\u011b';
  var sub = document.createElement('p');
  sub.textContent = 'Informace o budov\u011b, revize, fond oprav a okol\xed';
  title.appendChild(h1);
  title.appendChild(sub);
  el.appendChild(title);

  renderBudovaInfoCard(el, user);
  renderPenbCard(el, user);
  renderRevizeCard(el, user);
  renderFondOpravCard(el, user);
  renderOkoliCard(el, user);
  renderParkovaniCard(el, user);
  renderCenovaMapaCard(el, user);
});

function renderBudovaInfoCard(el, user) {
  var card = makeAdminCard('Informace o budov\u011b');
  var body = card.body;
  el.appendChild(card.card);

  var loading = document.createElement('p');
  loading.style.cssText = 'color:var(--text-light);font-size:0.9rem;';
  loading.textContent = 'Na\u010d\xedt\xe1m\u2026';
  body.appendChild(loading);

  Api.apiGet('api/kn.php?action=status')
    .then(function(d) {
      body.replaceChildren();
      var rows = [];
      if (d.adresa_plna)       rows.push(['\uD83D\uDCCD Adresa',              d.adresa_plna]);
      if (d.lat && d.lon)      rows.push(['\uD83D\uDDFA GPS',                 parseFloat(d.lat).toFixed(5) + ', ' + parseFloat(d.lon).toFixed(5)]);
      if (d.rok_dokonceni)     rows.push(['\uD83C\uDFD7 Rok dokon\u010den\xed', d.rok_dokonceni]);
      if (d.konstrukce_nazev)  rows.push(['\uD83E\uDDF1 Konstrukce',          d.konstrukce_nazev]);
      if (d.pocet_podlazi)     rows.push(['\uD83C\uDFE2 Po\u010det podla\u017e\xed', d.pocet_podlazi]);
      if (d.vytah !== null && d.vytah !== undefined)
                                rows.push(['\uD83D\uDEE0 V\xfdtah',           d.vytah ? 'Ano' : 'Ne']);
      if (d.zpusob_vytapeni)   rows.push(['\uD83D\uDD25 Vyt\xe1p\u011bn\xed', d.zpusob_vytapeni]);

      if (!rows.length) {
        var hint = document.createElement('p');
        hint.style.cssText = 'color:var(--text-light);font-size:0.9rem;margin:0;';
        hint.textContent = 'Data o budov\u011b nejsou k dispozici. Proveďte import z \u010c\xdaZK KN ve Spr\xe1v\u011b port\xe1lu.';
        body.appendChild(hint);
        return;
      }

      var grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;';
      rows.forEach(function(row) {
        var item = document.createElement('div');
        item.style.cssText = 'font-size:0.88rem;';
        var lbl = document.createElement('span');
        lbl.style.cssText = 'color:var(--text-light);display:block;font-size:0.78rem;';
        lbl.textContent = row[0];
        var val = document.createElement('span');
        val.style.fontWeight = '500';
        val.textContent = row[1];
        item.appendChild(lbl);
        item.appendChild(val);
        grid.appendChild(item);
      });
      body.appendChild(grid);
    })
    .catch(function() {
      body.replaceChildren();
      var err = document.createElement('p');
      err.style.cssText = 'color:var(--danger);font-size:0.9rem;';
      err.textContent = 'Chyba p\u0159i na\u010d\xedt\xe1n\xed dat o budov\u011b.';
      body.appendChild(err);
    });
}
