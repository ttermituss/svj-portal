/* ===== Testy pro js/ui.js ===== */

suite('showToast — DOM injection');

(function() {
  // Zavolat showToast a ověřit DOM
  showToast('Test zpráva');
  var toast = document.getElementById('svj-toast');
  assert('Toast byl přidán do DOM', !!toast);
  assert('Toast obsahuje správný text', toast && toast.textContent.indexOf('Test zpráva') !== -1);
  if (toast) toast.remove();
})();

(function() {
  showToast('Chyba!', 'error');
  var toast = document.getElementById('svj-toast');
  assert('Error toast existuje', !!toast);
  assert('Error toast má červené pozadí', toast && toast.style.background.indexOf('rgb') !== -1);
  if (toast) toast.remove();
})();

(function() {
  // Druhý toast přepíše první
  showToast('První');
  showToast('Druhý');
  var toasts = document.querySelectorAll('#svj-toast');
  assert('Existuje právě jeden toast najednou', toasts.length === 1);
  toasts.forEach(function(t) { t.remove(); });
})();

suite('showConfirmModal — DOM');

(function() {
  showConfirmModal('Testovací titulek', 'Detail zprávy', function() {});
  var overlay = document.querySelector('[style*="z-index:10000"]');
  assert('Modal overlay byl přidán', !!overlay);

  var btns = overlay ? overlay.querySelectorAll('button') : [];
  assert('Modal má 2 tlačítka (Zrušit + Potvrdit)', btns.length === 2);

  var h3 = overlay ? overlay.querySelector('h3') : null;
  assert("Modal zobrazuje správný titulek", h3 && h3.textContent === 'Testovací titulek');

  // Zavřít klikem na Zrušit
  if (btns[0]) btns[0].click();
  setTimeout(function() {
    assert('Modal byl zavřen', !document.querySelector('[style*="z-index:10000"]'));
  }, 300);
})();

suite('showConfirmModal — callback');

(function() {
  var called = false;
  showConfirmModal('Potvrdit?', '', function() { called = true; });
  var overlay = document.querySelector('[style*="z-index:10000"]');
  var btns = overlay ? overlay.querySelectorAll('button') : [];
  // Kliknout Potvrdit (druhé tlačítko)
  if (btns[1]) btns[1].click();
  assert('onConfirm callback byl zavolán', called);
})();

suite('fallbackCopy — textarea trick');

(function() {
  var copied = false;
  // fallbackCopy vytváří textarea, vybírá a kopíruje
  try {
    fallbackCopy('test text', function() { copied = true; });
    assert('fallbackCopy zavolalo callback', copied);
  } catch(e) {
    assert('fallbackCopy nehodilo výjimku', false);
  }
  // Ověřit že textarea byla odstraněna
  var orphans = document.querySelectorAll('textarea[style*="-9999px"]');
  assert('Textarea byla odstraněna z DOM', orphans.length === 0);
})();
