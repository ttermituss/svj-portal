/* ===== THEME SWITCHER ===== */

const THEMES = [
  { id: 'light', label: 'Světlý' },
  { id: 'dark',  label: 'Tmavý' },
  { id: 'senior', label: 'Přehledný' },
];

function getTheme() {
  return localStorage.getItem('svj-theme') || 'light';
}

function setTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('svj-theme', id);
  renderThemeSwitcher();
}

function renderThemeSwitcher() {
  const el = document.getElementById('themeSwitcher');
  if (!el) return;
  const current = getTheme();

  el.replaceChildren();
  THEMES.forEach(function(t) {
    var btn = document.createElement('button');
    btn.textContent = t.label;
    if (t.id === current) btn.className = 'active';
    btn.addEventListener('click', function() { setTheme(t.id); });
    el.appendChild(btn);
  });
}

// Apply saved theme immediately
document.documentElement.setAttribute('data-theme', getTheme());
