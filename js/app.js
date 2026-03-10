/* ===== APP INIT ===== */

// Položky viditelné bez přihlášení
var NAV_ITEMS_PUBLIC = [
  { page: 'home', icon: '\uD83C\uDFE0', label: 'Úvod' },
];

// Položky pro přihlášené uživatele
var NAV_ITEMS_AUTH = [
  { page: 'home',      icon: '\uD83C\uDFE0', label: 'Přehled' },
  { sep: true },
  { page: 'nastenka',  icon: '\uD83D\uDCCB', label: 'Nástěnka' },
  { page: 'vlastnici', icon: '\uD83D\uDC65', label: 'Vlastníci' },
  { page: 'jednotky',  icon: '\uD83C\uDFE2', label: 'Jednotky' },
  { page: 'hlasovani', icon: '\uD83D\uDDF3\uFE0F', label: 'Hlasování' },
  { page: 'dokumenty', icon: '\uD83D\uDCC1', label: 'Dokumenty' },
  { sep: true },
  { page: 'nastaveni', icon: '\u2699\uFE0F', label: 'Nastavení' },
];

// Extra položky pouze pro správce (vybor + admin)
var NAV_ITEMS_ADMIN = [
  { page: 'admin', icon: '\uD83D\uDEE1\uFE0F', label: 'Správa portálu' },
];

function renderNavItems(nav, items) {
  items.forEach(function(item) {
    if (item.sep) {
      var sep = document.createElement('div');
      sep.className = 'nav-sep';
      nav.appendChild(sep);
      return;
    }

    var a = document.createElement('a');
    a.setAttribute('data-page', item.page);
    a.href = '#' + item.page;

    var iconSpan = document.createElement('span');
    iconSpan.className = 'nav-icon';
    iconSpan.textContent = item.icon;

    var labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;

    a.appendChild(iconSpan);
    a.appendChild(labelSpan);
    nav.appendChild(a);
  });
}

function buildNav() {
  var nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.replaceChildren();
  renderNavItems(nav, NAV_ITEMS_PUBLIC);
}

function buildNavWithUser() {
  var nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.replaceChildren();

  var user = Auth.getUser();
  if (!user) { renderNavItems(nav, NAV_ITEMS_PUBLIC); return; }

  renderNavItems(nav, NAV_ITEMS_AUTH);

  // Správa portálu — jen pro vybor/admin
  if (user.role === 'vybor' || user.role === 'admin') {
    renderNavItems(nav, NAV_ITEMS_ADMIN);
  }

  // Separator
  var sep = document.createElement('div');
  sep.className = 'nav-sep';
  sep.style.marginTop = 'auto';
  nav.appendChild(sep);

  // User info — avatar + jméno + email
  var userInfo = document.createElement('div');
  userInfo.style.cssText = 'padding:8px 12px;display:flex;align-items:center;gap:10px;';

  userInfo.appendChild(makeAvatarEl(user, 36));

  var textBlock = document.createElement('div');
  textBlock.style.cssText = 'min-width:0;flex:1;';

  var userName = document.createElement('div');
  userName.style.cssText = 'font-weight:500;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  userName.textContent = user.jmeno + (user.prijmeni ? ' ' + user.prijmeni : '');
  textBlock.appendChild(userName);

  var userEmail = document.createElement('div');
  userEmail.style.cssText = 'font-size:0.8rem;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  userEmail.textContent = user.email;
  textBlock.appendChild(userEmail);

  var svj = Auth.getSvj();
  if (svj) {
    var svjName = document.createElement('div');
    svjName.style.cssText = 'font-size:0.75rem;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;';
    svjName.textContent = svj.nazev;
    textBlock.appendChild(svjName);
  }

  userInfo.appendChild(textBlock);
  nav.appendChild(userInfo);

  // Logout button
  var logoutBtn = document.createElement('a');
  logoutBtn.href = '#';
  logoutBtn.setAttribute('data-page', '');
  logoutBtn.style.color = 'var(--danger, #e53e3e)';

  var logoutIcon = document.createElement('span');
  logoutIcon.className = 'nav-icon';
  logoutIcon.textContent = '\uD83D\uDEAA';
  var logoutLabel = document.createElement('span');
  logoutLabel.textContent = 'Odhlásit se';

  logoutBtn.appendChild(logoutIcon);
  logoutBtn.appendChild(logoutLabel);

  logoutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    Auth.logout().then(function() {
      buildNav();
      Router.navigate('login');
    });
  });

  nav.appendChild(logoutBtn);
}

// ===== INIT =====
// 1. Auth check → 2. Build nav → 3. Router init

(function() {
  // Zobrazit loading
  var content = document.getElementById('content');
  if (content) {
    var loader = document.createElement('div');
    loader.style.display = 'flex';
    loader.style.justifyContent = 'center';
    loader.style.alignItems = 'center';
    loader.style.minHeight = '60vh';
    loader.style.color = 'var(--text-light)';
    loader.textContent = 'Načítám...';
    content.appendChild(loader);
  }

  renderThemeSwitcher();

  Auth.check().then(function() {
    if (Auth.isLoggedIn()) {
      buildNavWithUser();
    } else {
      buildNav();
    }
    Router.init();
  });
})();

/* ===== SIDEBAR TOGGLE (mobile) ===== */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
