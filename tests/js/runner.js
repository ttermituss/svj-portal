/* ===== Browser test runner — suite/assert/assertEqual =====
 * Byl inline v run.html — vyčleněn kvůli CSP (script-src 'self').
 */
var _passed = 0, _failed = 0, _suite = '', _out = document.getElementById('output');

function suite(name) {
  _suite = name;
  var h = document.createElement('h2');
  h.textContent = '\u25b6 ' + name;
  _out.appendChild(h);
}

function assert(label, condition) {
  var d = document.createElement('div');
  if (condition) {
    _passed++;
    d.className = 'pass';
    d.textContent = '  \u2713 ' + label;
  } else {
    _failed++;
    d.className = 'fail';
    d.textContent = '  \u2717 ' + label + '  [suite: ' + _suite + ']';
  }
  _out.appendChild(d);
}

function assertEqual(label, expected, actual) {
  var ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (!ok) {
    var d = document.createElement('div');
    d.style.color = '#888';
    d.style.paddingLeft = '24px';
    d.textContent = 'expected: ' + JSON.stringify(expected) + '  actual: ' + JSON.stringify(actual);
    _out.appendChild(d);
  }
  assert(label, ok);
}
