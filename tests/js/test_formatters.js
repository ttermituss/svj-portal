/* ===== Testy pro helpery z js/ui.js =====
 * formatCzk, daysUntil, formatDate, makeEmptyState, makeExportButtons, isPrivileged
 */

suite('formatCzk — formátování částky v CZK');

(function() {
  assertEqual('Celé číslo',           '1 000',     formatCzk(1000));
  assertEqual('Nula',                 '0',         formatCzk(0));
  assertEqual('Záporné číslo',        '-500',      formatCzk(-500));
  assertEqual('Desetinné číslo',      '1 234,56',  formatCzk(1234.56));
  assertEqual('String číslo',         '999',       formatCzk('999'));
  assertEqual('NaN / null → 0',       '0',         formatCzk(null));
  assertEqual('NaN / undefined → 0',  '0',         formatCzk(undefined));
  assertEqual('Velká částka',         '1 000 000', formatCzk(1000000));
})();

suite('daysUntil — počet dní do data');

(function() {
  var now   = new Date();
  var today = now.toISOString().slice(0, 10);

  // Dnes = 0
  assertEqual('Dnes = 0 dní', 0, daysUntil(today));

  // Zítra = 1
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  assertEqual('Zítra = 1 den', 1, daysUntil(tomorrow.toISOString().slice(0, 10)));

  // Včera = -1
  var yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  assertEqual('Včera = -1 den', -1, daysUntil(yesterday.toISOString().slice(0, 10)));

  // 30 dní
  var future = new Date(now);
  future.setDate(future.getDate() + 30);
  assertEqual('Za 30 dní = 30', 30, daysUntil(future.toISOString().slice(0, 10)));

  // Null / prázdný → null
  assertEqual('null → null',   null, daysUntil(null));
  assertEqual('prázdný → null', null, daysUntil(''));
})();

suite('formatDate — formátování data (cs-CZ)');

(function() {
  // Výstup závisí na locale prohlížeče, testujeme pouze formát a edge cases
  var result = formatDate('2024-03-15');
  assert('Výstup je string',         typeof result === 'string');
  assert('Výstup není prázdný',      result.length > 0);
  assert('Výstup obsahuje rok 2024', result.indexOf('2024') !== -1);

  assertEqual('Prázdný string → ""', '', formatDate(''));
  assertEqual('null → ""',           '', formatDate(null));
})();

suite('makeEmptyState — DOM helper');

(function() {
  var el = makeEmptyState('🏠', 'Test zpráva');
  assert('Vrátí element',                el instanceof HTMLElement);
  assert('className = empty-state',      el.className === 'empty-state');

  var icon = el.querySelector('.icon');
  assert('Má child .icon',              !!icon);
  assert('Ikona má správný text',       icon && icon.textContent === '🏠');

  var msg = el.querySelector('p');
  assert('Má child <p>',               !!msg);
  assert('<p> má správný text',        msg && msg.textContent === 'Test zpráva');

  // Unicode emoji
  var el2 = makeEmptyState('\uD83D\uDCC1', 'Dokumenty');
  assert('Emoji unicode funguje',      el2.querySelector('.icon').textContent === '📁');
})();

suite('makeExportButtons — export tlačítka');

(function() {
  var container = document.createElement('div');
  makeExportButtons(container, 'revize');

  var btns = container.querySelectorAll('button');
  assert('Vytvoří 3 tlačítka',               btns.length === 3);
  assert('První tlačítko má PDF text',       btns[0].textContent.indexOf('PDF') !== -1);
  assert('Druhé tlačítko má XLSX text',      btns[1].textContent.indexOf('XLSX') !== -1);
  assert('Třetí tlačítko má CSV text',       btns[2].textContent.indexOf('CSV') !== -1);

  // Custom CSS třída
  var container2 = document.createElement('div');
  makeExportButtons(container2, 'fond_oprav', 'btn btn-secondary');
  var btn2 = container2.querySelector('button');
  assert('Custom třída aplikována', btn2.className === 'btn btn-secondary');

  // Extra params
  var container3 = document.createElement('div');
  makeExportButtons(container3, 'fond_oprav', null, 'rok=2024');
  // Klik simulace nelze snadno testovat (window.location), alespoň ověříme počet
  assert('S extra params: 3 tlačítka', container3.querySelectorAll('button').length === 3);
})();

suite('isPrivileged — kontrola role');

(function() {
  assert('Admin je privilegovaný',        isPrivileged({ role: 'admin' }));
  assert('Vybor je privilegovaný',        isPrivileged({ role: 'vybor' }));
  assert('Vlastnik není privilegovaný',   !isPrivileged({ role: 'vlastnik' }));
  assert('Null user není privilegovaný',  !isPrivileged(null));
  assert('Undefined není privilegovaný',  !isPrivileged(undefined));
  assert('Prázdný obj není privilegovaný',!isPrivileged({}));
})();
