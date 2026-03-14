/* ===== Testy pro js/theme.js =====
 * Testuje: getBase, isSenior, loadSeniorCss (DOM side-effects)
 */

suite('theme.js — getBase / isSenior');

(function() {
  // Uložit původní stav
  var origTheme  = localStorage.getItem('svj-theme');
  var origSenior = localStorage.getItem('svj-senior');

  // Test výchozích hodnot
  localStorage.removeItem('svj-theme');
  localStorage.removeItem('svj-senior');
  assertEqual('getBase() default = light', 'light', getBase());
  assert('isSenior() default = false',     !isSenior());

  // Test nastavení
  localStorage.setItem('svj-theme', 'dark');
  assertEqual('getBase() = dark po setItem', 'dark', getBase());

  localStorage.setItem('svj-senior', '1');
  assert('isSenior() = true po setItem', isSenior());

  localStorage.setItem('svj-senior', '0');
  assert('isSenior() = false po 0',     !isSenior());

  // Obnovit původní stav
  if (origTheme  !== null) localStorage.setItem('svj-theme',  origTheme);
  else                     localStorage.removeItem('svj-theme');
  if (origSenior !== null) localStorage.setItem('svj-senior', origSenior);
  else                     localStorage.removeItem('svj-senior');
})();

suite('theme.js — migrateSenior (legacy formát)');

(function() {
  // Starý formát: svj-theme = 'senior' → migrovat na light + senior=1
  var origTheme  = localStorage.getItem('svj-theme');
  var origSenior = localStorage.getItem('svj-senior');

  localStorage.setItem('svj-theme', 'senior');
  localStorage.removeItem('svj-senior');

  // Ručně spustit migraci (stejná logika jako v theme.js IIFE)
  if (localStorage.getItem('svj-theme') === 'senior') {
    localStorage.setItem('svj-theme',  'light');
    localStorage.setItem('svj-senior', '1');
  }

  assertEqual('Po migraci: svj-theme = light', 'light', localStorage.getItem('svj-theme'));
  assertEqual('Po migraci: svj-senior = 1',    '1',     localStorage.getItem('svj-senior'));

  if (origTheme  !== null) localStorage.setItem('svj-theme',  origTheme);
  else                     localStorage.removeItem('svj-theme');
  if (origSenior !== null) localStorage.setItem('svj-senior', origSenior);
  else                     localStorage.removeItem('svj-senior');
})();

suite('theme.js — loadSeniorCss');

(function() {
  // Ujistit se, že link neexistuje
  var existing = document.getElementById('svj-senior-css');
  if (existing) existing.remove();

  // Načíst senior CSS
  loadSeniorCss(true);
  var link = document.getElementById('svj-senior-css');
  assert('loadSeniorCss(true) přidá <link> do DOM', !!link);
  assert('link má správné id',                      link && link.id === 'svj-senior-css');
  assert('link má rel=stylesheet',                  link && link.rel === 'stylesheet');
  assert('link href obsahuje senior.min.css',       link && link.href.indexOf('senior.min.css') !== -1);

  // Volání znovu nesmí přidat duplicitní link
  loadSeniorCss(true);
  var links = document.querySelectorAll('#svj-senior-css');
  assert('Druhé loadSeniorCss(true) nepřidá duplicit', links.length === 1);

  // Odebrat
  loadSeniorCss(false);
  assert('loadSeniorCss(false) odstraní <link>', !document.getElementById('svj-senior-css'));

  // Znovu false nic nezpůsobí (neexistuje co odebrat)
  loadSeniorCss(false);
  assert('loadSeniorCss(false) na neexistující link nehodí error', true);
})();

suite('theme.js — applyTheme (data-theme / data-senior atributy)');

(function() {
  var origTheme  = localStorage.getItem('svj-theme');
  var origSenior = localStorage.getItem('svj-senior');

  // Light bez seniora
  localStorage.setItem('svj-theme', 'light');
  localStorage.setItem('svj-senior', '0');
  applyTheme();
  assertEqual('data-theme = light', 'light', document.documentElement.getAttribute('data-theme'));
  assert('data-senior odstraněn',   !document.documentElement.hasAttribute('data-senior'));

  // Dark bez seniora
  localStorage.setItem('svj-theme', 'dark');
  applyTheme();
  assertEqual('data-theme = dark', 'dark', document.documentElement.getAttribute('data-theme'));

  // Senior mód
  localStorage.setItem('svj-senior', '1');
  applyTheme();
  assert('data-senior nastaven', document.documentElement.hasAttribute('data-senior'));

  // Vyčistit senior CSS které applyTheme přidala
  loadSeniorCss(false);

  if (origTheme  !== null) localStorage.setItem('svj-theme',  origTheme);
  else                     localStorage.removeItem('svj-theme');
  if (origSenior !== null) localStorage.setItem('svj-senior', origSenior);
  else                     localStorage.removeItem('svj-senior');
  applyTheme();
})();
