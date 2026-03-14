/* ===== Výsledek testů — injektuje summary do DOM =====
 * Byl inline v run.html — vyčleněn kvůli CSP (script-src 'self').
 */
var s = document.getElementById('summary');
s.className = 'summary ' + (_failed === 0 ? 'ok' : 'err');
var total = _passed + _failed;
s.textContent = _failed === 0
  ? '\u2713 V\u0161echny testy pro\u0161ly (' + _passed + '/' + total + ')'
  : '\u2717 Selhalo: ' + _failed + '/' + total;
