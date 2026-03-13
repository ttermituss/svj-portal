/* ===== Revize — samostatná stránka #revize ===== */

Router.register('revize', function(el) {
  var user = Auth.getUser();
  if (!user) { Router.navigate('login'); return; }
  if (user.role !== 'admin' && user.role !== 'vybor') {
    Router.navigate('home'); return;
  }
  if (!user.svj_id) {
    el.textContent = 'Nen\xed p\u0159i\u0159azeno SVJ.';
    return;
  }

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;';

  var title = document.createElement('h1');
  title.style.cssText = 'margin:0;font-size:1.5rem;';
  title.textContent = '\uD83D\uDD27 Evidence reviz\xed';
  header.appendChild(title);

  var isPriv = isPrivileged(user);

  // Přidat + export tlačítka
  if (isPriv) {
    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ P\u0159idat revizi';
    btnGroup.appendChild(addBtn);

    ['pdf', 'xlsx', 'csv'].forEach(function(fmt) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = fmt === 'pdf' ? '\uD83D\uDCC3 PDF' : fmt === 'xlsx' ? '\uD83D\uDCCA XLSX' : '\uD83D\uDCC4 CSV';
      btn.addEventListener('click', function() {
        window.location.href = 'api/export.php?type=revize&format=' + fmt;
      });
      btnGroup.appendChild(btn);
    });

    header.appendChild(btnGroup);
  }

  el.appendChild(header);

  var hint = document.createElement('p');
  hint.style.cssText = 'margin:0 0 20px;font-size:0.9rem;color:var(--text-light);';
  hint.textContent = 'Sledov\xe1n\xed term\xedn\u016f povinn\xfdch reviz\xed \u2014 v\xfdtah, elektro, plyn, hromosvod, hasi\u010d\xed p\u0159\xedstroje. Upozorn\u011bn\xed p\u0159i bl\xed\u017e\xedc\xedm se nebo prohl\xe9\u0161en\xe9m term\xednu.';
  el.appendChild(hint);

  var listWrap = document.createElement('div');
  el.appendChild(listWrap);

  var formWrap = document.createElement('div');
  formWrap.style.display = 'none';
  el.appendChild(formWrap);

  if (isPriv) {
    addBtn.addEventListener('click', function() {
      revizeShowForm(formWrap, null, listWrap, user, addBtn);
    });
  }

  revizeLoad(listWrap, formWrap, user);
});
