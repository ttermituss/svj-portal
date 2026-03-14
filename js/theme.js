/* ===== THEME SWITCHER ===== */

// Migrace starého formátu: 'senior' → base='light' + senior=true
(function migrateSenior() {
  if (localStorage.getItem('svj-theme') === 'senior') {
    localStorage.setItem('svj-theme',  'light');
    localStorage.setItem('svj-senior', '1');
  }
})();

function getBase()   { return localStorage.getItem('svj-theme')  || 'light'; }
function isSenior()  { return localStorage.getItem('svj-senior') === '1'; }

var SENIOR_CSS_ID = 'svj-senior-css';

function loadSeniorCss(enable) {
  if (enable) {
    if (!document.getElementById(SENIOR_CSS_ID)) {
      var link = document.createElement('link');
      link.id   = SENIOR_CSS_ID;
      link.rel  = 'stylesheet';
      link.href = 'dist/senior.min.css';
      document.head.appendChild(link);
    }
  } else {
    var existing = document.getElementById(SENIOR_CSS_ID);
    if (existing) existing.remove();
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getBase());
  if (isSenior()) {
    document.documentElement.setAttribute('data-senior', '');
    loadSeniorCss(true);
  } else {
    document.documentElement.removeAttribute('data-senior');
    loadSeniorCss(false);
  }
}

function setBase(id) {
  localStorage.setItem('svj-theme', id);
  applyTheme();
  renderThemeSwitcher();
}

function toggleSenior() {
  localStorage.setItem('svj-senior', isSenior() ? '0' : '1');
  applyTheme();
  renderThemeSwitcher();
}

function renderThemeSwitcher() {
  var el = document.getElementById('themeSwitcher');
  if (!el) return;
  var base   = getBase();
  var senior = isSenior();

  el.replaceChildren();

  // Skupina: světlý / tmavý
  var baseGroup = document.createElement('div');
  baseGroup.style.cssText = 'display:flex;gap:4px;';
  [{ id: 'light', label: 'Světlý' }, { id: 'dark', label: 'Tmavý' }].forEach(function(t) {
    var btn = document.createElement('button');
    btn.textContent = t.label;
    if (t.id === base) btn.className = 'active';
    btn.addEventListener('click', function() { setBase(t.id); });
    baseGroup.appendChild(btn);
  });

  // Oddělovač
  var sep = document.createElement('span');
  sep.style.cssText = 'width:1px;background:var(--border);margin:4px 2px;';

  // Přehledný — nezávislý toggle
  var seniorBtn = document.createElement('button');
  seniorBtn.textContent = 'Přehledný';
  if (senior) seniorBtn.className = 'active';
  seniorBtn.addEventListener('click', toggleSenior);

  el.appendChild(baseGroup);
  el.appendChild(sep);
  el.appendChild(seniorBtn);
}

// Aplikovat téma okamžitě při načtení
applyTheme();
