/* ===== SPA ROUTER ===== */

var Router = (function() {
  var routes = {};
  var currentPage = null;

  /** Stránky přístupné bez přihlášení */
  var PUBLIC_PAGES = ['login', 'registrace'];

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function navigate(page) {
    if (!routes[page]) page = 'home';

    // Auth guard — nepřihlášený na chráněné stránce → login
    if (!Auth.isLoggedIn() && PUBLIC_PAGES.indexOf(page) === -1) {
      page = 'login';
    }

    // Přihlášený na login → home
    if (Auth.isLoggedIn() && page === 'login') {
      page = 'home';
    }

    currentPage = page;
    window.location.hash = page;

    // Update nav active state
    var links = document.querySelectorAll('#mainNav a[data-page]');
    links.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('data-page') === page);
    });

    // Render page
    var content = document.getElementById('content');
    content.replaceChildren();
    routes[page](content);

    // Close sidebar on mobile
    closeSidebar();
  }

  function getCurrentPage() {
    return currentPage;
  }

  function init() {
    var hash = window.location.hash.slice(1);
    navigate(hash || 'home');
  }

  window.addEventListener('hashchange', function() {
    var hash = window.location.hash.slice(1);
    if (hash !== currentPage) navigate(hash);
  });

  return { register: register, navigate: navigate, init: init, getCurrentPage: getCurrentPage };
})();
