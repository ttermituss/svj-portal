/* ===== AUTH MODULE ===== */

var Auth = (function() {
  var currentUser = null;
  var currentSvj  = null;

  function check() {
    return fetch('api/auth.php?action=check', { credentials: 'include' })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.authenticated) {
          currentUser = data.user;
          currentSvj  = data.svj;
        } else {
          currentUser = null;
          currentSvj  = null;
        }
        return data;
      })
      .catch(function() {
        currentUser = null;
        currentSvj  = null;
        return { authenticated: false, user: null };
      });
  }

  function login(email, password) {
    return fetch('api/auth.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email, password: password }),
    })
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) throw { message: data.error ? data.error.message : 'Chyba přihlášení', fields: data.error ? data.error.fields : null };
        currentUser = data.user;
        return data;
      });
    });
  }

  function register(params) {
    return fetch('api/auth.php?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    })
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) throw { message: data.error ? data.error.message : 'Chyba registrace', fields: data.error ? data.error.fields : null };
        currentUser = data.user;
        return data;
      });
    });
  }

  function logout() {
    return fetch('api/auth.php?action=logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    .catch(function() {})
    .then(function() {
      currentUser = null;
      currentSvj  = null;
    });
  }

  function isLoggedIn() { return currentUser !== null; }
  function getUser()    { return currentUser; }
  function getSvj()     { return currentSvj; }

  return { check: check, login: login, register: register, logout: logout, isLoggedIn: isLoggedIn, getUser: getUser, getSvj: getSvj };
})();
